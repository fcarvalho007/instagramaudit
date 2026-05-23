import { describe, it, expect } from "vitest";
import { sanitizeExtra } from "@/routes/api/analyze-public-v1";

describe("sanitizeExtra — public error response", () => {
  it("descarta provider_message, provider_status, run_id, details", () => {
    const out = sanitizeExtra({
      provider_message: "Apify says 500",
      provider_status: 500,
      run_id: "abc123",
      details: "raw stack trace",
      provider: "apify",
      provider_error_code: "X",
    });
    expect(out).toBeUndefined();
  });

  it("preserva retry_after_seconds e descarta o resto", () => {
    const out = sanitizeExtra({
      retry_after_seconds: 30,
      provider_message: "leaked",
      run_id: "abc",
    });
    expect(out).toEqual({ retry_after_seconds: 30 });
  });

  it("devolve undefined para objecto vazio ou ausente", () => {
    expect(sanitizeExtra(undefined)).toBeUndefined();
    expect(sanitizeExtra({})).toBeUndefined();
  });
});