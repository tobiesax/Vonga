import "server-only";

export type SendEmailInput = { to: string; subject: string; html: string; text: string };
export type SendEmailResult = { ok: true; providerId: string | null } | { ok: false; retryable: boolean; error: string };

const TIMEOUT_MS = 10_000;

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  if (process.env.EMAIL_AUTOMATION_ENABLED === "false") {
    return { ok: false, retryable: false, error: "Email automation is disabled (EMAIL_AUTOMATION_ENABLED=false)." };
  }
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ORDER_EMAIL_FROM;
  if (!apiKey || !from) return { ok: false, retryable: false, error: "Email provider is not configured (missing RESEND_API_KEY or ORDER_EMAIL_FROM)." };
  if (!input.to) return { ok: false, retryable: false, error: "No recipient email on file." };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
        reply_to: process.env.ORDER_EMAIL_REPLY_TO || undefined,
      }),
      signal: controller.signal,
    });
    const body = await response.json().catch(() => null) as { id?: string; message?: string } | null;
    if (!response.ok) {
      const retryable = response.status === 429 || response.status >= 500;
      return { ok: false, retryable, error: body?.message ?? `Resend API returned ${response.status}` };
    }
    return { ok: true, providerId: body?.id ?? null };
  } catch (error) {
    return { ok: false, retryable: true, error: error instanceof Error ? error.message : "Email send failed" };
  } finally {
    clearTimeout(timeout);
  }
}
