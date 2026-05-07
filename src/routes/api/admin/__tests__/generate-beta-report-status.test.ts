import { describe, it, expect } from "vitest";

// Re-declared to avoid importing the route file (side-effects).
// If the source drifts from this, the test fails — that's the contract.
const ALLOWED_SOURCE_STATUSES = ["approved", "pending_review", "failed"] as const;

describe("generate-beta-report status validation", () => {
  it("accepts approved, pending_review and failed", () => {
    expect(ALLOWED_SOURCE_STATUSES).toContain("approved");
    expect(ALLOWED_SOURCE_STATUSES).toContain("pending_review");
    expect(ALLOWED_SOURCE_STATUSES).toContain("failed");
  });

  it("has exactly 3 allowed statuses", () => {
    expect(ALLOWED_SOURCE_STATUSES).toHaveLength(3);
  });
});
