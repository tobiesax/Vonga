import type { VongaProduct } from "./vonga";

export const CONSENT_STORAGE_KEY = "vonga-cookie-consent";
export const CONSENT_EVENT = "vonga-consent-changed";

export type ConsentChoice = "accepted" | "declined";

export function getStoredConsent(): ConsentChoice | null {
  if (typeof window === "undefined") return null;
  const value = localStorage.getItem(CONSENT_STORAGE_KEY);
  return value === "accepted" || value === "declined" ? value : null;
}

export function setStoredConsent(choice: ConsentChoice) {
  localStorage.setItem(CONSENT_STORAGE_KEY, choice);
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: choice }));
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

export function trackViewContent(product: VongaProduct) {
  if (typeof window === "undefined") return;
  window.gtag?.("event", "view_item", { currency: "ZAR", value: product.price, items: [{ item_id: product.id, item_name: product.name, price: product.price, item_category: product.category }] });
  window.fbq?.("track", "ViewContent", { content_ids: [product.id], content_name: product.name, content_type: "product", value: product.price, currency: "ZAR" });
}

export function trackAddToCart(product: VongaProduct, size: string) {
  if (typeof window === "undefined") return;
  window.gtag?.("event", "add_to_cart", { currency: "ZAR", value: product.price, items: [{ item_id: product.id, item_name: product.name, price: product.price, item_variant: size }] });
  window.fbq?.("track", "AddToCart", { content_ids: [product.id], content_name: product.name, content_type: "product", value: product.price, currency: "ZAR" });
}

export function trackPurchase(orderId: string, total: number) {
  if (typeof window === "undefined") return;
  window.gtag?.("event", "purchase", { transaction_id: orderId, currency: "ZAR", value: total });
  window.fbq?.("track", "Purchase", { value: total, currency: "ZAR" });
}
