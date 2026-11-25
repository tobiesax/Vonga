import { NextResponse } from "next/server";
import { getOrderById } from "@/lib/repository";
import { buildPaymentFields, escapeHtmlAttr, getPayfastConfig } from "@/lib/payfast";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const orderId = url.searchParams.get("order");
  if (!orderId) return NextResponse.json({ error: "Missing order reference." }, { status: 400 });

  const order = await getOrderById(orderId);
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (!order.email) return NextResponse.json({ error: "Order has no email on file." }, { status: 400 });

  const config = getPayfastConfig();
  const fields = buildPaymentFields({
    orderId: order.id,
    amount: order.total,
    customerName: order.customerName,
    customerEmail: order.email,
    itemDescription: order.items.map((item) => `${item.quantity}x ${item.name}${item.size ? ` (${item.size})` : ""}`).join(", "),
  });

  const inputs = Object.entries(fields)
    .map(([key, value]) => `<input type="hidden" name="${escapeHtmlAttr(key)}" value="${escapeHtmlAttr(value)}" />`)
    .join("");

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Redirecting to PayFast…</title>
  <style>body{font-family:Georgia,'Times New Roman',serif;background:#f6f4f1;color:#1a1a1a;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;}</style>
</head>
<body>
  <p>Redirecting you to PayFast to complete your payment…</p>
  <form id="pf-redirect" method="POST" action="${escapeHtmlAttr(config.processUrl)}">${inputs}</form>
  <script>document.getElementById("pf-redirect").submit();</script>
</body>
</html>`;

  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
