import { NextResponse } from "next/server";
import type { OrderItem } from "@/lib/types";
import { createCheckoutOrder } from "@/lib/repository";

type Checkout = { name?: string; phone?: string; email?: string; address?: string; notes?: string; paymentMethod?: string; items?: OrderItem[] };

export async function POST(request: Request) {
  const input = await request.json() as Checkout;
  if (!input.name?.trim() || !input.phone?.trim() || !input.address?.trim() || !input.items?.length) {
    return NextResponse.json({ error: "Name, phone, address and basket items are required." }, { status: 400 });
  }

  const order = await createCheckoutOrder({ name: input.name, phone: input.phone, email: input.email ?? "", address: input.address, notes: input.notes ?? "", paymentMethod: input.paymentMethod ?? "", items: input.items });

  return NextResponse.json({ order }, { status: 201 });
}
