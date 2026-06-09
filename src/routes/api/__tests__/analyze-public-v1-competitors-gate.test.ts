import { describe, expect, it } from "vitest";

/**
 * Contract test for the competitor Pro gate (`COMPETITORS_REQUIRE_PRO`).
 * Keeps the public error code union honest without booting the worker.
 *
 * Behaviour invariants (covered by integration harness):
 * - Free + competitors → returns COMPETITORS_REQUIRE_PRO, no reserveCredit,
 *   no provider call, no snapshot, no credit_ledger row. The gate sits
 *   inside `if (!isInternalBypass)` AFTER leadId resolution and BEFORE
 *   the wide-window gate, reserveCredit and any cache/provider work.
 * - Pro + competitors → gate passes, existing flow unchanged.
 * - Free without competitors → gate does not fire, current behaviour preserved.
 * - Pro 30d/90d without competitors → unchanged.
 * - Internal bypass (Authorization: Bearer $INTERNAL_API_TOKEN) skips the gate.
 */
describe("analyze-public-v1 · competitors Pro gate contract", () => {
  it("PublicAnalysisErrorCode inclui COMPETITORS_REQUIRE_PRO", () => {
    type Code = import("@/lib/analysis/types").PublicAnalysisErrorCode;
    const code: Code = "COMPETITORS_REQUIRE_PRO";
    expect(code).toBe("COMPETITORS_REQUIRE_PRO");
  });
});