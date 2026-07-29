"use client";

import { useEffect, useState } from "react";
import { getStoredConsent, setStoredConsent } from "@/lib/analytics";

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(getStoredConsent() === null);
  }, []);

  function choose(choice: "accepted" | "declined") {
    setStoredConsent(choice);
    setVisible(false);
  }

  if (!visible) return null;

  return <div className="cookie-banner" role="dialog" aria-label="Cookie consent">
    <p>We use cookies to remember your bag and wishlist, and — with your permission — to understand site traffic. <a href="/privacy">Privacy Policy</a></p>
    <div className="cookie-banner-actions">
      <button onClick={() => choose("declined")}>Necessary only</button>
      <button onClick={() => choose("accepted")}>Accept all</button>
    </div>
  </div>;
}
