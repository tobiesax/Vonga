import { NextResponse } from "next/server";
import { vongaProducts } from "@/lib/vonga";
import { createCheckoutOrder } from "@/lib/repository";

type Input = { name?: string; phone?: string; email?: string; address?: string; notes?: string; paymentMethod?: string; items?: { productId: string; size: string; quantity: number }[] };

export async function POST(request: Request) {
  const input = await request.json() as Input;
  if (!input.name?.trim() || !input.phone?.trim() || !input.email?.trim() || !input.address?.trim() || !input.items?.length) return NextResponse.json({ error: "Contact, delivery and basket details are required." }, { status: 400 });
  for (const item of input.items) {
    const product = vongaProducts.find((candidate) => candidate.id === item.productId);
    if (!product || !product.sizes.includes(item.size)) return NextResponse.json({ error: "An item or selected size is unavailable." }, { status: 400 });
  }
  try {
    const order = await createCheckoutOrder({
      name: input.name,
      phone: input.phone,
      email: input.email,
      address: input.address,
      notes: input.notes ?? "",
      paymentMethod: input.paymentMethod ?? "",
      items: input.items.map((item) => ({ productId: item.productId, size: item.size, quantity: item.quantity, name: "", price: 0 })),
    });
    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Order request failed" }, { status: 400 });
  }
}
