import { NextResponse } from "next/server";
import { subscribeToNewsletter } from "@/lib/repository";
import { addNewsletterSubscriber } from "@/lib/mailchimp";

export async function POST(request: Request) {
  const input = await request.json() as { email?: string };
  const email = input.email?.trim() ?? "";
  if (!email || !email.includes("@")) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  const results = await Promise.allSettled([subscribeToNewsletter(email), addNewsletterSubscriber(email)]);
  if (results.every((result) => result.status === "rejected")) return NextResponse.json({ error: "Subscription failed" }, { status: 400 });
  return NextResponse.json({ ok: true }, { status: 201 });
}
