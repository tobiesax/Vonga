import type { Metadata } from "next";
import { BUSINESS_ADDRESS, BUSINESS_PHONE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return <main className="legalPage"><div className="legalCard">
    <a href="/">← Back to Vonga</a>
    <img src="/vonga/logo/vonga-logo.png" alt="VONGA"/>
    <h1>Terms &amp; Conditions</h1>
    <p className="legalUpdated">Last updated 2026</p>

    <h2>1. About These Terms</h2>
    <p>These terms govern the purchase of ready-to-wear and made-to-measure garments from Vonga, a fashion atelier based in Menlyn, Pretoria. By placing an order with us, you agree to these terms.</p>

    <h2>2. Orders</h2>
    <p>An order request submitted through the website is a request to purchase, not a confirmed sale. Our atelier will contact you to confirm sizing, availability and payment before your order is finalised. Prices are listed in South African Rand (ZAR) and are subject to change without notice until an order is confirmed.</p>

    <h2>3. Made-to-Measure &amp; Bespoke Orders</h2>
    <p>Bespoke and made-to-measure garments are cut and finished to the measurements provided at consultation. Because these pieces are made specifically for you, they are excluded from exchange unless the garment is defective or does not match the agreed specification.</p>

    <h2>4. Returns &amp; Exchanges</h2>
    <p><strong>Vonga does not offer monetary refunds.</strong> If a ready-to-wear item does not fit or suit you, we're happy to offer an exchange for a different size or item of equal value, provided:</p>
    <ul>
      <li>The request is made within 7 days of delivery or collection</li>
      <li>The garment is unworn, unaltered and in its original condition with tags attached</li>
      <li>Bespoke and made-to-measure pieces are excluded, except in the case of a manufacturing defect</li>
    </ul>
    <p>To arrange an exchange, contact our atelier via WhatsApp at {BUSINESS_PHONE} with your order details.</p>

    <h2>5. Delivery</h2>
    <p>We offer nationwide delivery within South Africa. Delivery timeframes and fees are confirmed at checkout or by our atelier team. Free delivery applies to orders over R5,000.</p>

    <h2>6. Payment</h2>
    <p>Full or partial payment may be required to confirm an order, depending on the item and lead time. Payment options are confirmed directly with our atelier.</p>

    <h2>7. Intellectual Property</h2>
    <p>All designs, photography and content on this website belong to Vonga and may not be reproduced without permission.</p>

    <h2>8. Governing Law</h2>
    <p>These terms are governed by the laws of South Africa.</p>

    <h2>9. Contact Us</h2>
    <p>Vonga Atelier, {BUSINESS_ADDRESS.street}, {BUSINESS_ADDRESS.locality}<br/>WhatsApp: {BUSINESS_PHONE}</p>
  </div></main>;
}
