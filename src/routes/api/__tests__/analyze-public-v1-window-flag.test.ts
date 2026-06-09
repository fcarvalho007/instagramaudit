import { describe, expect, it } from "vitest";

/**
 * Contract test for the 90d kill-switch (`pro_window_90d_enabled`).
 * Mirrors the credit-gate contract spec — keeps the public error code
 * union honest without booting the worker.
 */
describe("analyze-public-v1 · 90d kill-switch contract", () => {
  it("PublicAnalysisErrorCode inclui WINDOW_90D_DISABLED", () => {
    type Code = import("@/lib/analysis/types").PublicAnalysisErrorCode;
    const code: Code = "WINDOW_90D_DISABLED";
    expect(code).toBe("WINDOW_90D_DISABLED");
  });

  it("PublicAppConfig expõe proWindow90dEnabled com default OFF", async () => {
    const mod = await import("@/lib/config/app-config.functions");
    expect(mod.PUBLIC_APP_CONFIG_DEFAULTS.proWindow90dEnabled).toBe(false);
  });
});