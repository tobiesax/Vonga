import { afterEach, describe, expect, it, vi } from "vitest";
import { sendEmail } from "../lib/email";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.unstubAllGlobals();
});

describe("sendEmail", () => {
  it("fails as non-retryable when the provider is not configured, never faking success", async () => {
    delete process.env.RESEND_API_KEY;
    delete process.env.ORDER_EMAIL_FROM;
    const result = await sendEmail({ to: "customer@example.com", subject: "x", html: "<p>x</p>", text: "x" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.retryable).toBe(false);
      expect(result.error).toMatch(/not configured/i);
    }
  });

  it("fails as non-retryable when disabled via the kill switch, even if otherwise configured", async () => {
    process.env.RESEND_API_KEY = "test-key";
    process.env.ORDER_EMAIL_FROM = "Vonga <orders@vonga.co.za>";
    process.env.EMAIL_AUTOMATION_ENABLED = "false";
    const result = await sendEmail({ to: "customer@example.com", subject: "x", html: "<p>x</p>", text: "x" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.retryable).toBe(false);
  });

  it("fails as non-retryable with no recipient, without calling the provider", async () => {
    process.env.RESEND_API_KEY = "test-key";
    process.env.ORDER_EMAIL_FROM = "Vonga <orders@vonga.co.za>";
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const result = await sendEmail({ to: "", subject: "x", html: "<p>x</p>", text: "x" });
    expect(result.ok).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("treats a provider 5xx as retryable and a 4xx as not retryable", async () => {
    process.env.RESEND_API_KEY = "test-key";
    process.env.ORDER_EMAIL_FROM = "Vonga <orders@vonga.co.za>";
    const fetchSpy = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: "upstream down" }), { status: 502 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ message: "invalid recipient" }), { status: 422 }));
    vi.stubGlobal("fetch", fetchSpy);

    const serverError = await sendEmail({ to: "a@b.com", subject: "x", html: "x", text: "x" });
    expect(serverError.ok).toBe(false);
    if (!serverError.ok) expect(serverError.retryable).toBe(true);

    const clientError = await sendEmail({ to: "a@b.com", subject: "x", html: "x", text: "x" });
    expect(clientError.ok).toBe(false);
    if (!clientError.ok) expect(clientError.retryable).toBe(false);
  });
});
