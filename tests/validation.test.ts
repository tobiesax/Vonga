import { describe, expect, it } from "vitest";
import { normalizeEmail } from "../lib/validation";

describe("normalizeEmail", () => {
  it("trims and accepts a well-formed address", () => {
    expect(normalizeEmail("  Jane@Example.com  ")).toBe("Jane@Example.com");
  });

  it("rejects missing or non-string input", () => {
    expect(normalizeEmail(undefined)).toBeNull();
    expect(normalizeEmail(null)).toBeNull();
    expect(normalizeEmail(42)).toBeNull();
    expect(normalizeEmail("")).toBeNull();
    expect(normalizeEmail("   ")).toBeNull();
  });

  it("rejects malformed addresses", () => {
    expect(normalizeEmail("not-an-email")).toBeNull();
    expect(normalizeEmail("missing-domain@")).toBeNull();
    expect(normalizeEmail("@missing-local.com")).toBeNull();
  });

  it("rejects embedded line breaks (header injection attempt)", () => {
    expect(normalizeEmail("a@b.com\nBcc: evil@example.com")).toBeNull();
    expect(normalizeEmail("a@b.com\r\nX-Injected: 1")).toBeNull();
  });

  it("rejects an address over the length limit", () => {
    const long = `${"a".repeat(250)}@b.com`;
    expect(normalizeEmail(long)).toBeNull();
  });
});
