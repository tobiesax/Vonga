import type { Metadata } from "next";
import { BUSINESS_ADDRESS, BUSINESS_PHONE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return <main className="legalPage"><div className="legalCard">
    <a href="/">← Back to Vonga</a>
    <img src="/vonga/logo/vonga-logo.png" alt="VONGA"/>
    <h1>Privacy Policy</h1>
    <p className="legalUpdated">Last updated 2026</p>

    <h2>1. Introduction</h2>
    <p>Vonga respects your privacy and is committed to protecting your personal information in line with South Africa's Protection of Personal Information Act (POPIA).</p>

    <h2>2. Information We Collect</h2>
    <p>When you shop, book an appointment or join our mailing list, we may collect your name, phone number, email address, delivery address and order details.</p>

    <h2>3. How We Use Your Information</h2>
    <ul>
      <li>To process and confirm your order</li>
      <li>To arrange delivery or a fitting appointment</li>
      <li>To send order updates and confirmations via WhatsApp or email</li>
      <li>To send early access and atelier updates, if you've subscribed to our list</li>
    </ul>

    <h2>4. WhatsApp Communication</h2>
    <p>We use WhatsApp to send order confirmations and respond to styling or sizing questions. Messages are sent only to customers who have contacted us or placed an order.</p>

    <h2>5. Sharing Your Information</h2>
    <p>We do not sell your personal information. We only share it with the couriers and payment providers needed to fulfil your order.</p>

    <h2>6. Data Security</h2>
    <p>We take reasonable technical and organisational measures to keep your information secure.</p>

    <h2>7. Your Rights</h2>
    <p>Under POPIA, you may ask us to access, correct or delete your personal information at any time by contacting us using the details below.</p>

    <h2>8. Cookies</h2>
    <p>Our website may use basic cookies to keep your bag and wishlist saved on your device between visits.</p>

    <h2>9. Contact Us</h2>
    <p>Vonga Atelier, {BUSINESS_ADDRESS.street}, {BUSINESS_ADDRESS.locality}<br/>WhatsApp: {BUSINESS_PHONE}</p>
  </div></main>;
}
