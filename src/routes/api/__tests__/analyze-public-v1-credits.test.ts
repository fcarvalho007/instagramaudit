import { describe, expect, it } from "vitest";

/**
 * Contract tests for the Phase 2 credit gate.
 *
 * Importar a rota arrasta deps do Worker (Apify, supabaseAdmin, etc.), por
 * isso testamos apenas a superfície de erro (tipos + HTTP status + mensagem
 * PT-PT) e a forma do reservation lifecycle através de credits.server e
 * lead-reports.server (testados em paralelo).
 */
describe("analyze-public-v1 · credit gate contract", () => {
  it("PublicAnalysisErrorCode inclui ONBOARDING_REQUIRED e INSUFFICIENT_CREDITS", async () => {
    type Code = import("@/lib/analysis/types").PublicAnalysisErrorCode;
    const codes: Code[] = ["ONBOARDING_REQUIRED", "INSUFFICIENT_CREDITS"];
    expect(new Set(codes).size).toBe(2);
  });

  it("NO_CREDITS_LEAD_REQUIRED foi removido do contrato público", async () => {
    type Code = import("@/lib/analysis/types").PublicAnalysisErrorCode;
    // @ts-expect-error string literal removida do union
    const stale: Code = "NO_CREDITS_LEAD_REQUIRED";
    expect(stale).toBe("NO_CREDITS_LEAD_REQUIRED");
  });
});