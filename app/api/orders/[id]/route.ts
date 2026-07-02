import { NextResponse } from "next/server";
import type { OrderStatus } from "@/lib/types";
import { isAuthenticated } from "@/lib/auth";
import { updateOrderStatus } from "@/lib/repository";

const statuses: OrderStatus[] = ["new", "payment_pending", "confirmed", "preparing", "ready", "delivered"];

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const body = await request.json() as { status?: OrderStatus };
  if (!body.status || !statuses.includes(body.status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  const order = await updateOrderStatus(id, body.status);
  return order ? NextResponse.json({ order }) : NextResponse.json({ error: "Order not found" }, { status: 404 });
}
