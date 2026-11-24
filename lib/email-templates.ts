import "server-only";
import type { OrderStatus } from "./types";

export type EmailOrderItem = { name: string; size: string; quantity: number; price: number };
export type EmailOrder = {
  id: string;
  customerName: string;
  phone: string;
  address: string;
  notes: string;
  paymentMethod: string;
  items: EmailOrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  createdAt: string;
};

type Template = { subject: string; html: string; text: string };

const SUPPORT_LINE = "For help, reply to this email or contact Vonga on WhatsApp at +27 76 246 8320.";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function money(value: number) {
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(value);
}

function dateLabel(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-ZA", { timeZone: "Africa/Johannesburg", dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function itemsHtml(items: EmailOrderItem[]) {
  return items.map((item) => `<tr><td style="padding:6px 0;">${escapeHtml(item.quantity.toString())} × ${escapeHtml(item.name)}${item.size ? ` (${escapeHtml(item.size)})` : ""}</td><td style="padding:6px 0;text-align:right;">${escapeHtml(money(item.price * item.quantity))}</td></tr>`).join("");
}

function itemsText(items: EmailOrderItem[]) {
  return items.map((item) => `${item.quantity} × ${item.name}${item.size ? ` (${item.size})` : ""} — ${money(item.price * item.quantity)}`).join("\n");
}

function layout(title: string, bodyHtml: string) {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f6f4f1;font-family:Georgia,'Times New Roman',serif;color:#1a1a1a;">
<div style="max-width:560px;margin:0 auto;padding:32px 24px;">
  <p style="letter-spacing:2px;font-size:12px;text-transform:uppercase;color:#8a7a6a;margin:0 0 24px;">VONGA</p>
  <h1 style="font-size:22px;margin:0 0 16px;">${escapeHtml(title)}</h1>
  ${bodyHtml}
  <p style="margin-top:32px;font-size:13px;color:#6b6b6b;">${SUPPORT_LINE}</p>
</div>
</body></html>`;
}

export function orderReceivedEmail(order: EmailOrder): Template {
  const paymentNote = order.paymentMethod
    ? `Your chosen payment preference: ${escapeHtml(order.paymentMethod)}. This records your preference only — it does not confirm that payment has been received.`
    : "No payment preference was recorded for this order.";
  const html = layout("Your order has been received", `
    <p>Hi ${escapeHtml(order.customerName)},</p>
    <p>We've received your Vonga order. Our atelier will be in touch if anything needs confirming.</p>
    <p style="margin:20px 0 4px;"><b>Order ${escapeHtml(order.id)}</b><br/><span style="color:#6b6b6b;font-size:13px;">${escapeHtml(dateLabel(order.createdAt))}</span></p>
    <table style="width:100%;border-top:1px solid #e3ddd4;border-bottom:1px solid #e3ddd4;margin:12px 0;">${itemsHtml(order.items)}</table>
    <table style="width:100%;margin:12px 0;font-size:14px;">
      <tr><td>Subtotal</td><td style="text-align:right;">${escapeHtml(money(order.subtotal))}</td></tr>
      <tr><td>Delivery</td><td style="text-align:right;">${order.deliveryFee > 0 ? escapeHtml(money(order.deliveryFee)) : "Free"}</td></tr>
      <tr><td style="font-weight:bold;">Total</td><td style="text-align:right;font-weight:bold;">${escapeHtml(money(order.total))}</td></tr>
    </table>
    <p><b>Delivering to:</b><br/>${escapeHtml(order.address)}</p>
    <p>${paymentNote}</p>
  `);
  const text = `Hi ${order.customerName},

We've received your Vonga order. Our atelier will be in touch if anything needs confirming.

Order ${order.id} — ${dateLabel(order.createdAt)}

${itemsText(order.items)}

Subtotal: ${money(order.subtotal)}
Delivery: ${order.deliveryFee > 0 ? money(order.deliveryFee) : "Free"}
Total: ${money(order.total)}

Delivering to: ${order.address}

${paymentNote}

${SUPPORT_LINE}`;
  return { subject: `Order received — ${order.id}`, html, text };
}

export function newOrderOwnerEmail(order: EmailOrder & { email: string }): Template {
  const notesHtml = order.notes ? `<p><b>Notes:</b><br/>${escapeHtml(order.notes)}</p>` : "";
  const notesText = order.notes ? `\nNotes: ${order.notes}` : "";
  const html = layout("New order received", `
    <p><b>Order ${escapeHtml(order.id)}</b> — ${escapeHtml(dateLabel(order.createdAt))}</p>
    <p><b>Customer:</b> ${escapeHtml(order.customerName)}<br/>${escapeHtml(order.phone)}${order.email ? ` · ${escapeHtml(order.email)}` : ""}</p>
    <table style="width:100%;border-top:1px solid #e3ddd4;border-bottom:1px solid #e3ddd4;margin:12px 0;">${itemsHtml(order.items)}</table>
    <p><b>Total:</b> ${escapeHtml(money(order.total))}</p>
    <p><b>Deliver to:</b><br/>${escapeHtml(order.address)}</p>
    <p><b>Payment preference:</b> ${escapeHtml(order.paymentMethod || "Not specified")}</p>
    ${notesHtml}
  `);
  const text = `Order ${order.id} — ${dateLabel(order.createdAt)}

Customer: ${order.customerName}
${order.phone}${order.email ? ` · ${order.email}` : ""}

${itemsText(order.items)}

Total: ${money(order.total)}
Deliver to: ${order.address}
Payment preference: ${order.paymentMethod || "Not specified"}${notesText}`;
  return { subject: `New order — ${order.id}`, html, text };
}

const STATUS_COPY: Partial<Record<OrderStatus, { label: string; next: string }>> = {
  payment_pending: { label: "Awaiting payment", next: "Reply to this email if you need your payment details resent." },
  confirmed: { label: "Payment confirmed", next: "Our atelier will begin preparing your pieces." },
  preparing: { label: "Being prepared", next: "Our atelier is now preparing your pieces." },
  ready: { label: "Ready", next: "We'll be in touch shortly with collection or delivery details." },
  delivered: { label: "Delivered", next: "Thank you for shopping with Vonga — we'd love to hear how you wore it." },
};

export function orderStatusChangedEmail(order: { id: string; customerName: string }, status: OrderStatus): Template {
  const copy = STATUS_COPY[status] ?? { label: status.replaceAll("_", " "), next: "We'll be in touch with more details." };
  const html = layout(`Order ${escapeHtml(order.id)}: ${escapeHtml(copy.label)}`, `
    <p>Hi ${escapeHtml(order.customerName)},</p>
    <p>Your Vonga order <b>${escapeHtml(order.id)}</b> is now: <b>${escapeHtml(copy.label)}</b>.</p>
    <p>${escapeHtml(copy.next)}</p>
  `);
  const text = `Hi ${order.customerName},

Your Vonga order ${order.id} is now: ${copy.label}.

${copy.next}

${SUPPORT_LINE}`;
  return { subject: `Order ${order.id}: ${copy.label}`, html, text };
}
