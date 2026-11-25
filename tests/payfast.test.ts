import { describe, expect, it } from "vitest";
import { phpUrlEncode, generateSignature, buildPaymentFields } from "../lib/payfast";

describe("phpUrlEncode", () => {
  it("encodes spaces as + rather than %20", () => {
    expect(phpUrlEncode("Jane Doe")).toBe("Jane+Doe");
  });

  it("percent-encodes characters encodeURIComponent leaves alone but PHP urlencode does not", () => {
    expect(phpUrlEncode("O'Brien")).toBe("O%27Brien");
    expect(phpUrlEncode("(test)")).toBe("%28test%29");
    expect(phpUrlEncode("a~b!c*d")).toBe("a%7Eb%21c%2Ad");
  });

  it("leaves unreserved characters untouched", () => {
    expect(phpUrlEncode("abc-123_ABC.xyz")).toBe("abc-123_ABC.xyz");
  });
});

describe("generateSignature", () => {
  it("matches an independently hand-derived MD5 for a known field set", () => {
    const fields: [string, string][] = [
      ["merchant_id", "10000100"],
      ["merchant_key", "46f0cd694581a"],
      ["return_url", "https://vonga.co.za/checkout/success?order=VO-TEST01"],
      ["cancel_url", "https://vonga.co.za/checkout/cancelled?order=VO-TEST01"],
      ["notify_url", "https://vonga.co.za/api/payfast/notify"],
      ["name_first", "Jane O'Brien"],
      ["email_address", "jane@example.com"],
      ["m_payment_id", "VO-TEST01"],
      ["amount", "2720.00"],
      ["item_name", "Vonga order VO-TEST01"],
      ["item_description", "1x Ivory Pleated Pocket Dress (M), 1x Scarlet Bloom Mermaid Skirt (S)"],
    ];
    expect(generateSignature(fields, "jt7NOE43FZPn")).toBe("1791132a6ed9cca75d42912bdc8cc7f4");
  });

  it("omits the passphrase segment entirely when none is configured", () => {
    const withPassphrase = generateSignature([["a", "1"]], "secret");
    const withoutPassphrase = generateSignature([["a", "1"]], "");
    expect(withPassphrase).not.toBe(withoutPassphrase);
  });

  it("never includes an existing signature field in the hashed string", () => {
    const withExtraSignature = generateSignature([["a", "1"], ["signature", "whatever"]], "secret");
    const withoutExtraSignature = generateSignature([["a", "1"]], "secret");
    expect(withExtraSignature).toBe(withoutExtraSignature);
  });
});

describe("buildPaymentFields", () => {
  it("builds a complete, signed field set using the sandbox defaults", () => {
    const fields = buildPaymentFields({
      orderId: "VO-ABC123",
      amount: 2720,
      customerName: "Claude Test",
      customerEmail: "test@example.com",
      itemDescription: "1x Test Item (M)",
    });
    expect(fields.merchant_id).toBe("10000100");
    expect(fields.m_payment_id).toBe("VO-ABC123");
    expect(fields.amount).toBe("2720.00");
    expect(fields.notify_url).toMatch(/\/api\/payfast\/notify$/);
    expect(fields.return_url).toContain("order=VO-ABC123");
    expect(fields.cancel_url).toContain("order=VO-ABC123");
    expect(fields.signature).toMatch(/^[0-9a-f]{32}$/);
  });
});
