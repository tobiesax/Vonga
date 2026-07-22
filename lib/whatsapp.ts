import type { Order, OrderStatus } from "./types";

export function orderConfirmation(order: Order) {
  const lines = order.items.map((item) => `${item.quantity} × ${item.name}`).join("\n");
  return `Hi ${order.customerName}! We received your Vonga order ${order.id}.\n\n${lines}\n\nTotal: R${order.total.toFixed(2)}\n\nOur atelier will contact you within one business day to confirm delivery and your chosen payment method.`;
}

export function statusMessage(name: string, orderId: string, status: OrderStatus) {
  const messages: Partial<Record<OrderStatus, string>> = {
    payment_pending: `Hi ${name}! Order ${orderId} is awaiting payment. Reply here if you need payment details.`,
    confirmed: `Great news, ${name}! Payment for order ${orderId} is confirmed. Our atelier will begin preparing your pieces.`,
    preparing: `Your Vonga order ${orderId} is now being prepared by our atelier.`,
    ready: `Order ${orderId} is ready! We’ll contact you now with collection or delivery details.`,
    delivered: `Order ${orderId} has been delivered. Thank you, ${name}! We’d love to hear how you wore it.`,
  };
  return messages[status] ?? `Order ${orderId} is now ${status.replaceAll("_", " ")}.`;
}

export function merchantOrderAlert(order: Order) {
  const lines = order.items.map((item) => `${item.quantity} × ${item.name}`).join(", ");
  return `New Vonga order ${order.id} from ${order.customerName} (${order.phone}).\n\nItems: ${lines}\nTotal: R${order.total.toFixed(2)}\n\nCheck the dashboard for full details.`;
}

export function orderConfirmationTemplateParams(order: Order) {
  const items = order.items.map((item) => `${item.quantity} × ${item.name}`).join(", ");
  return [order.customerName, order.id, items, order.total.toFixed(2)];
}

async function postWhatsApp(body: Record<string, unknown>) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) return { status: "queued" as const, providerId: null };

  const response = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`WhatsApp API returned ${response.status}`);
  const responseBody = await response.json() as { messages?: { id: string }[] };
  return { status: "sent" as const, providerId: responseBody.messages?.[0]?.id ?? null };
}

export async function sendWhatsApp(to: string, message: string) {
  return postWhatsApp({ messaging_product: "whatsapp", to: to.replace(/\D/g, ""), type: "text", text: { body: message } });
}

export async function sendWhatsAppTemplate(to: string, templateName: string, params: string[], languageCode = "en") {
  return postWhatsApp({
    messaging_product: "whatsapp",
    to: to.replace(/\D/g, ""),
    type: "template",
    template: { name: templateName, language: { code: languageCode }, components: [{ type: "body", parameters: params.map((text) => ({ type: "text", text })) }] },
  });
}
