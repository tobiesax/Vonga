import type { Order, OrderStatus } from "./types";

export function orderConfirmation(order: Order) {
  const lines = order.items.map((item) => `${item.quantity} × ${item.name}`).join("\n");
  return `Hi ${order.customerName}! We received order ${order.id}.\n\n${lines}\n\nTotal: R${order.total.toFixed(2)}\n\nReply here if you need any help.`;
}

export function statusMessage(name: string, orderId: string, status: OrderStatus) {
  const messages: Partial<Record<OrderStatus, string>> = {
    payment_pending: `Hi ${name}! Order ${orderId} is awaiting payment. Reply here if you need payment details.`,
    confirmed: `Great news, ${name}! Payment for order ${orderId} is confirmed. We’ll begin preparing your treats.`,
    preparing: `Your Crunch & Crumbs order ${orderId} is now being prepared with love.`,
    ready: `Order ${orderId} is ready! We’ll contact you now with collection or delivery details.`,
    delivered: `Order ${orderId} has been delivered. Thank you, ${name}! We’d love to hear how you enjoyed it.`,
  };
  return messages[status] ?? `Order ${orderId} is now ${status.replaceAll("_", " ")}.`;
}

export async function sendWhatsApp(to: string, message: string) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) return { status: "queued" as const, providerId: null };

  const response = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to: to.replace(/\D/g, ""), type: "text", text: { body: message } }),
  });
  if (!response.ok) throw new Error(`WhatsApp API returned ${response.status}`);
  const body = await response.json() as { messages?: { id: string }[] };
  return { status: "sent" as const, providerId: body.messages?.[0]?.id ?? null };
}
