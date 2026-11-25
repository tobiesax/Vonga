import { NextResponse } from "next/server";
import { generateSignature, getPayfastConfig } from "@/lib/payfast";
import { getOrderById, recordPayfastPayment } from "@/lib/repository";

const AMOUNT_EPSILON = 0.05;

// PayFast's Instant Transaction Notification: a server-to-server POST once a payment completes,
// fails or is cancelled. Must validate the signature, confirm with PayFast's own validate
// endpoint (an attacker can forge a plausible-looking POST, but not one PayFast's own server
// will vouch for), and check the amount — only then is the order updated.
export async function POST(request: Request) {
  const raw = await request.text();
  const params = new URLSearchParams(raw);
  const fields: Record<string, string> = {};
  for (const [key, value] of params.entries()) fields[key] = value;

  if (!fields.m_payment_id || !fields.signature) {
    return new NextResponse("missing required fields", { status: 400 });
  }

  const config = getPayfastConfig();

  const expectedSignature = generateSignature(params.entries(), config.passphrase);
  if (expectedSignature !== fields.signature) {
    console.error("PayFast ITN: signature mismatch", { orderId: fields.m_payment_id });
    return new NextResponse("invalid signature", { status: 400 });
  }

  if (fields.merchant_id !== config.merchantId) {
    console.error("PayFast ITN: merchant id mismatch", { orderId: fields.m_payment_id, got: fields.merchant_id });
    return new NextResponse("invalid merchant", { status: 400 });
  }

  const validateResult = await fetch(config.validateUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: raw,
  }).catch((err) => {
    console.error("PayFast ITN: validate call failed", err);
    return null;
  });
  const validateText = validateResult ? (await validateResult.text()).trim() : "";
  if (validateText.toUpperCase() !== "VALID") {
    console.error("PayFast ITN: validate endpoint rejected the notification", { orderId: fields.m_payment_id, response: validateText });
    return new NextResponse("not valid", { status: 400 });
  }

  const order = await getOrderById(fields.m_payment_id);
  if (!order) {
    console.error("PayFast ITN: order not found", { orderId: fields.m_payment_id });
    // Acknowledge anyway so PayFast stops retrying a notification we can never act on.
    return new NextResponse("ok", { status: 200 });
  }

  const notifiedAmount = Number(fields.amount_gross ?? fields.amount ?? 0);
  if (!Number.isFinite(notifiedAmount) || Math.abs(notifiedAmount - order.total) > AMOUNT_EPSILON) {
    console.error("PayFast ITN: amount mismatch", { orderId: order.id, expected: order.total, got: notifiedAmount });
    return new NextResponse("amount mismatch", { status: 400 });
  }

  await recordPayfastPayment(order, {
    paymentStatus: fields.payment_status ?? "",
    pfPaymentId: fields.pf_payment_id ?? "",
    amount: notifiedAmount,
  });

  return new NextResponse("ok", { status: 200 });
}
