import type { Metadata } from "next";
import { BUSINESS_PHONE } from "@/lib/site";

export const metadata: Metadata = { title: "Payment cancelled", robots: { index: false } };

export default async function CheckoutCancelledPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order } = await searchParams;
  return <main className="legalPage"><div className="legalCard">
    <a href="/">← Back to Vonga</a>
    <img src="/vonga/logo/vonga-logo.png" alt="VONGA"/>
    <h1>Payment cancelled</h1>
    {order ? <p className="legalUpdated">Order {order}</p> : null}
    <p>Your payment was not completed, so nothing has been charged. Your order details are saved{order ? <> under reference {order}</> : null} if you&rsquo;d like to try again.</p>
    <p>Need help, or would you rather pay a different way? Contact our atelier on WhatsApp at {BUSINESS_PHONE}.</p>
    <p><a href="/">Return to the shop</a></p>
  </div></main>;
}
