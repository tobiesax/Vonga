import { NextResponse } from "next/server";
import { findCustomerByPhone } from "@/lib/repository";

export async function GET(request: Request) {
  const phone = new URL(request.url).searchParams.get("phone") ?? "";
  if (phone.replace(/[^+\d]/g, "").length < 7) return NextResponse.json({ customer: null });
  try {
    const customer = await findCustomerByPhone(phone);
    return NextResponse.json({ customer });
  } catch {
    return NextResponse.json({ customer: null });
  }
}
