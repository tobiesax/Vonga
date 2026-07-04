import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { vongaProducts } from "@/lib/vonga";

type Input = { name?: string; phone?: string; email?: string; address?: string; notes?: string; paymentMethod?: string; items?: { productId: string; size: string; quantity: number }[] };

export async function POST(request: Request) {
  const input = await request.json() as Input;
  if (!input.name?.trim() || !input.phone?.trim() || !input.email?.trim() || !input.address?.trim() || !input.items?.length) return NextResponse.json({ error: "Contact, delivery and basket details are required." }, { status: 400 });
  const items = input.items.map((item) => {
    const product = vongaProducts.find((candidate) => candidate.id === item.productId);
    if (!product || !product.sizes.includes(item.size)) throw new Error("An item or selected size is unavailable.");
    return { productId: product.id, name: product.name, size: item.size, price: product.price, quantity: Math.max(1, Math.min(5, Number(item.quantity) || 1)) };
  });
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const order = { id: `VO-${Date.now().toString().slice(-7)}`, ...input, items, subtotal, deliveryFee: subtotal >= 1500 ? 0 : 120, total: subtotal + (subtotal >= 1500 ? 0 : 120), status: "request_received", createdAt: new Date().toISOString() };
  try { const file = path.join(process.cwd(), "data", "vonga-orders.json"); let orders: unknown[] = []; try { orders = JSON.parse(await fs.readFile(file, "utf8")); } catch {} await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, JSON.stringify([order, ...orders], null, 2)); } catch {}
  return NextResponse.json({ order }, { status: 201 });
}
