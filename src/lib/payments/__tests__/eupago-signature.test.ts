import { describe, expect, it, beforeEach } from "vitest";
import { createHmac } from "node:crypto";

import { verifyWebhookSignature } from "../eupago.server";

const SECRET = "test-webhook-secret-which-is-long-enough-12345";

function sign(body: string): string {
  return createHmac("sha256", SECRET).update(body).digest("hex");
}

describe("payments/eupago/verifyWebhookSignature", () => {
  beforeEach(() => {
    process.env.EUPAGO_WEBHOOK_SECRET = SECRET;
  });

  it("accepts a valid HMAC-SHA256 hex signature", () => {
    const body = JSON.stringify({ status: "paid" });
    expect(verifyWebhookSignature(body, sign(body))).toBe(true);
  });

  it("rejects a tampered body", () => {
    const body = JSON.stringify({ status: "paid" });
    const tampered = JSON.stringify({ status: "paid", amount: 1 });
    expect(verifyWebhookSignature(tampered, sign(body))).toBe(false);
  });

  it("rejects when signature is missing", () => {
    expect(verifyWebhookSignature("{}", null)).toBe(false);
    expect(verifyWebhookSignature("{}", undefined)).toBe(false);
    expect(verifyWebhookSignature("{}", "")).toBe(false);
  });

  it("rejects when secret is not configured", () => {
    delete process.env.EUPAGO_WEBHOOK_SECRET;
    expect(verifyWebhookSignature("{}", sign("{}"))).toBe(false);
  });

  it("rejects garbage signatures of wrong length", () => {
    expect(verifyWebhookSignature("{}", "abcd")).toBe(false);
  });
});