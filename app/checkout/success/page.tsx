import type { Metadata } from "next";
import { BUSINESS_PHONE } from "@/lib/site";

export const metadata: Metadata = { title: "Payment received", robots: { index: false } };

export default async function CheckoutSuccessPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order } = await searchParams;
  return <main className="legalPage"><div className="legalCard">
    <a href="/">← Back to Vonga</a>
    <img src="/vonga/logo/vonga-logo.png" alt="VONGA"/>
    <h1>Thank you for your order</h1>
    {order ? <p className="legalUpdated">Order {order}</p> : null}
    <p>Your PayFast payment has been received. We&rsquo;re confirming it now, and you&rsquo;ll receive an email as soon as it&rsquo;s finalised with your order details.</p>
    <p>If anything looks wrong or you don&rsquo;t receive that email within a few minutes, contact our atelier on WhatsApp at {BUSINESS_PHONE}{order ? <> and quote order {order}</> : null}.</p>
  </div></main>;
}
