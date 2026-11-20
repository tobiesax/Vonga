import "server-only";
import { createSupabaseAdminClient } from "./supabase/server";
import { sendEmail } from "./email";
import { orderReceivedEmail, newOrderOwnerEmail, orderStatusChangedEmail, type EmailOrder } from "./email-templates";
import type { OrderStatus } from "./types";

const MAX_ATTEMPTS = 8;
const LEASE_MS = 2 * 60_000;

type JobRow = {
  id: string;
  merchant_id: string;
  order_id: string;
  kind: "order_confirmation" | "merchant_order_alert" | "order_status_changed";
  dedup_key: string;
  recipient_email: string;
  recipient_name: string;
  payload: Record<string, unknown>;
  attempts: number;
};

function backoffMs(attempt: number) {
  const base = Math.min(30 * 60_000, 1000 * 2 ** attempt);
  return base / 2 + Math.random() * (base / 2);
}

function orderFromPayload(payload: Record<string, unknown>): EmailOrder & { email: string } {
  const row = (payload.order ?? {}) as Record<string, unknown>;
  const items = (payload.items as Record<string, unknown>[] | undefined) ?? [];
  return {
    id: String(row.id ?? ""),
    customerName: String(row.customer_name ?? ""),
    phone: String(row.phone ?? ""),
    email: String(row.email ?? ""),
    address: String(row.address ?? ""),
    notes: String(row.notes ?? ""),
    paymentMethod: String(row.payment_method ?? ""),
    items: items.map((item) => ({ name: String(item.name ?? ""), size: String(item.size ?? ""), quantity: Number(item.quantity ?? 0), price: Number(item.price ?? 0) })),
    subtotal: Number(row.subtotal ?? 0),
    deliveryFee: Number(row.delivery_fee ?? 0),
    total: Number(row.total ?? 0),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

function buildEmail(job: JobRow) {
  if (job.kind === "order_confirmation") return orderReceivedEmail(orderFromPayload(job.payload));
  if (job.kind === "merchant_order_alert") return newOrderOwnerEmail(orderFromPayload(job.payload));
  const status = String(job.payload.status ?? "new") as OrderStatus;
  return orderStatusChangedEmail({ id: job.order_id, customerName: job.recipient_name }, status);
}

function automationType(job: JobRow) {
  if (job.kind !== "order_status_changed") return job.kind;
  const status = String(job.payload.status ?? "new");
  return `order_${status}`;
}

async function claimDueJobs(limit: number): Promise<JobRow[]> {
  const admin = createSupabaseAdminClient();
  const leaseExpiresAt = new Date(Date.now() + LEASE_MS).toISOString();
  const { data, error } = await admin.rpc("claim_notification_jobs", { p_limit: limit, p_lease_expires_at: leaseExpiresAt });
  if (error) throw new Error(error.message);
  return (data ?? []) as JobRow[];
}

async function processJob(job: JobRow) {
  const admin = createSupabaseAdminClient();
  const now = new Date().toISOString();

  if (!job.recipient_email) {
    await admin.from("notification_jobs").update({ status: "failed", last_error: "No recipient email on file.", updated_at: now }).eq("id", job.id);
    await admin.from("automation_events").insert({ merchant_id: job.merchant_id, type: automationType(job), order_id: job.order_id, status: "failed", message: "No recipient email on file." });
    return;
  }

  const email = buildEmail(job);
  const result = await sendEmail({ to: job.recipient_email, subject: email.subject, html: email.html, text: email.text });
  const attempts = job.attempts + 1;

  if (result.ok) {
    await admin.from("notification_jobs").update({ status: "sent", attempts, provider_message_id: result.providerId, last_error: null, lease_expires_at: null, updated_at: now }).eq("id", job.id);
    await admin.from("automation_events").insert({ merchant_id: job.merchant_id, type: automationType(job), order_id: job.order_id, status: "sent", message: email.subject });
    return;
  }

  const exhausted = !result.retryable || attempts >= MAX_ATTEMPTS;
  await admin.from("notification_jobs").update({
    status: exhausted ? "failed" : "pending",
    attempts,
    last_error: result.error.slice(0, 500),
    next_attempt_at: exhausted ? null : new Date(Date.now() + backoffMs(attempts)).toISOString(),
    lease_expires_at: null,
    updated_at: now,
  }).eq("id", job.id);
  await admin.from("automation_events").insert({
    merchant_id: job.merchant_id,
    type: automationType(job),
    order_id: job.order_id,
    status: exhausted ? "failed" : "queued",
    message: exhausted ? `Email failed after ${attempts} attempt(s): ${result.error}` : `Email retry scheduled (attempt ${attempts}): ${result.error}`,
  });
}

export async function processDueNotificationJobs(limit = 20) {
  const jobs = await claimDueJobs(limit);
  const results = await Promise.allSettled(jobs.map(processJob));
  return { claimed: jobs.length, failures: results.filter((result) => result.status === "rejected").length };
}
