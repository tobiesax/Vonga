import "server-only";
import { createHash } from "node:crypto";
import { SITE_URL } from "./site";

export type PayfastConfig = {
  merchantId: string;
  merchantKey: string;
  passphrase: string;
  mode: "sandbox" | "live";
  processUrl: string;
  validateUrl: string;
};

// Official PayFast SDK sandbox credentials (github.com/Payfast/payfast-php-sdk) — safe defaults
// for PAYFAST_MODE=sandbox (the default) when no env vars are set. Live mode always requires
// explicit env vars; it never falls back to these.
const SANDBOX_DEFAULTS = { merchantId: "10000100", merchantKey: "46f0cd694581a", passphrase: "jt7NOE43FZPn" };

export function getPayfastConfig(): PayfastConfig {
  const mode = process.env.PAYFAST_MODE === "live" ? "live" : "sandbox";
  if (mode === "live") {
    const merchantId = process.env.PAYFAST_MERCHANT_ID;
    const merchantKey = process.env.PAYFAST_MERCHANT_KEY;
    const passphrase = process.env.PAYFAST_PASSPHRASE;
    if (!merchantId || !merchantKey || !passphrase) {
      throw new Error("PayFast is not configured for live mode (missing PAYFAST_MERCHANT_ID, PAYFAST_MERCHANT_KEY or PAYFAST_PASSPHRASE).");
    }
    return { merchantId, merchantKey, passphrase, mode, processUrl: "https://www.payfast.co.za/eng/process", validateUrl: "https://www.payfast.co.za/eng/query/validate" };
  }
  return {
    merchantId: process.env.PAYFAST_MERCHANT_ID || SANDBOX_DEFAULTS.merchantId,
    merchantKey: process.env.PAYFAST_MERCHANT_KEY || SANDBOX_DEFAULTS.merchantKey,
    passphrase: process.env.PAYFAST_PASSPHRASE ?? SANDBOX_DEFAULTS.passphrase,
    mode,
    processUrl: "https://sandbox.payfast.co.za/eng/process",
    validateUrl: "https://sandbox.payfast.co.za/eng/query/validate",
  };
}

// PHP's urlencode(): spaces become "+", and only "-_." are left unescaped among non-alphanumerics
// (encodeURIComponent additionally leaves "!~*'()" unescaped, so those need fixing up here too).
// PayFast's signature spec is defined in terms of this exact PHP behaviour, not encodeURIComponent.
export function phpUrlEncode(value: string): string {
  return encodeURIComponent(value)
    .replace(/%20/g, "+")
    .replace(/[!~*'()]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}

// PayFast's signature (both the outgoing checkout form and the incoming ITN) is an MD5 of the
// fields concatenated in insertion order (never alphabetical) as "key=phpUrlEncode(value)&...",
// with "&passphrase=phpUrlEncode(passphrase)" appended when a passphrase is set.
// Source: github.com/Payfast/payfast-common PaymentRequest.php (createTransaction / pfValidSignature).
export function generateSignature(fields: Iterable<[string, string]>, passphrase: string): string {
  const pairs: string[] = [];
  for (const [key, value] of fields) {
    if (key === "signature") continue;
    pairs.push(`${key}=${phpUrlEncode(value)}`);
  }
  let paramString = pairs.join("&");
  if (passphrase) paramString += `&passphrase=${phpUrlEncode(passphrase)}`;
  return createHash("md5").update(paramString).digest("hex");
}

export type PayfastPaymentInput = {
  orderId: string;
  amount: number;
  customerName: string;
  customerEmail: string;
  itemDescription: string;
};

export function buildPaymentFields(input: PayfastPaymentInput): Record<string, string> {
  const config = getPayfastConfig();
  const fields: Record<string, string> = {
    merchant_id: config.merchantId,
    merchant_key: config.merchantKey,
    return_url: `${SITE_URL}/checkout/success?order=${encodeURIComponent(input.orderId)}`,
    cancel_url: `${SITE_URL}/checkout/cancelled?order=${encodeURIComponent(input.orderId)}`,
    notify_url: `${SITE_URL}/api/payfast/notify`,
    name_first: (input.customerName.trim() || "Customer").slice(0, 100),
    email_address: input.customerEmail.trim(),
    m_payment_id: input.orderId,
    amount: input.amount.toFixed(2),
    item_name: `Vonga order ${input.orderId}`.slice(0, 100),
    item_description: input.itemDescription.slice(0, 255),
  };
  const signature = generateSignature(Object.entries(fields), config.passphrase);
  return { ...fields, signature };
}

export function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
