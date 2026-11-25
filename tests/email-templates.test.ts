import { describe, expect, it } from "vitest";
import { orderReceivedEmail, newOrderOwnerEmail, orderStatusChangedEmail, type EmailOrder } from "../lib/email-templates";

const baseOrder: EmailOrder = {
  id: "VO-123456",
  customerName: "Jane Doe",
  phone: "+27821234567",
  address: "1 Main Road, Pretoria",
  notes: "",
  paymentMethod: "payfast",
  items: [{ name: "Chartreuse Satin Ballgown", size: "M", quantity: 1, price: 4400 }],
  subtotal: 4400,
  deliveryFee: 120,
  total: 4520,
  createdAt: "2026-11-20T09:00:00.000Z",
};

describe("orderReceivedEmail", () => {
  it("says order received, never payment received", () => {
    const { html, text } = orderReceivedEmail(baseOrder);
    expect(html.toLowerCase()).not.toContain("payment received");
    expect(text.toLowerCase()).not.toContain("payment received");
    expect(html).toContain("We're confirming your PayFast payment now");
  });

  it("formats currency as ZAR and escapes free-text notes", () => {
    const order = { ...baseOrder, notes: "<script>alert(1)</script> & rush please" };
    const { html } = orderReceivedEmail(order);
    expect(html).not.toContain("<script>");
    const expectedTotal = new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(order.total);
    expect(html).toContain(expectedTotal);
  });

  it("escapes a malicious customer name and address", () => {
    const order = { ...baseOrder, customerName: '<img src=x onerror=alert(1)>', address: "<b>hi</b>" };
    const { html } = orderReceivedEmail(order);
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<b>hi</b>");
    expect(html).toContain("&lt;b&gt;hi&lt;/b&gt;");
  });
});

describe("newOrderOwnerEmail", () => {
  it("includes customer contact, items, total and payment status", () => {
    const { text } = newOrderOwnerEmail({ ...baseOrder, email: "jane@example.com" });
    expect(text).toContain("Jane Doe");
    expect(text).toContain("+27821234567");
    expect(text).toContain("jane@example.com");
    expect(text).toContain("Chartreuse Satin Ballgown");
    expect(text).toContain("Awaiting PayFast confirmation");
  });
});

describe("orderStatusChangedEmail", () => {
  it("uses the actual new status, not a generic message", () => {
    const { text } = orderStatusChangedEmail({ id: baseOrder.id, customerName: baseOrder.customerName }, "ready");
    expect(text).toContain("Ready");
    expect(text).toContain(baseOrder.id);
  });

  it("falls back gracefully for an unmapped status", () => {
    const { text } = orderStatusChangedEmail({ id: baseOrder.id, customerName: baseOrder.customerName }, "new");
    expect(text).toContain("new");
  });
});
