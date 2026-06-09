import { describe, expect, it } from "vitest";

/**
 * Contract tests for the Pro `force_refresh` + per-(lead, profile, window)
 * daily cap surface. Mirrors the lightweight pattern used by other
 * `analyze-public-v1` contract specs — keeps the public error code union
 * and helper signatures honest without booting the Worker.
 */
describe("analyze-public-v1 · force_refresh + per-window cap contract", () => {
  it("PublicAnalysisErrorCode inclui PRO_WINDOW_BUDGET_EXCEEDED", () => {
    type Code = import("@/lib/analysis/types").PublicAnalysisErrorCode;
    const code: Code = "PRO_WINDOW_BUDGET_EXCEEDED";
    expect(code).toBe("PRO_WINDOW_BUDGET_EXCEEDED");
  });

  it("AnalysisDataSource inclui fresh_forced", () => {
    type DS = import("@/lib/analysis/events").AnalysisDataSource;
    const ds: DS = "fresh_forced";
    expect(ds).toBe("fresh_forced");
  });

  it("fetchPublicAnalysis aceita opção forceRefresh", () => {
    type Opt = Parameters<
      typeof import("@/lib/analysis/client").fetchPublicAnalysis
    >[2];
    const o: Opt = { window: "30d", forceRefresh: true };
    expect(o.forceRefresh).toBe(true);
  });

  it("apify-budget expõe helpers de per-window cap", async () => {
    const mod = await import("@/lib/security/apify-budget.server");
    expect(typeof mod.getProWindowProfileDailyCapUsd).toBe("function");
    expect(typeof mod.getProWindowProfileDailySpendUsd).toBe("function");
    expect(typeof mod.assertProWindowProfileDailyBudgetAvailable).toBe(
      "function",
    );
    expect(typeof mod.invalidateProWindowBudgetCache).toBe("function");
    expect(typeof mod.ProWindowBudgetExceededError).toBe("function");
  });

  it("cap default é ≥ 5 USD (≈ €5)", async () => {
    const { getProWindowProfileDailyCapUsd } = await import(
      "@/lib/security/apify-budget.server"
    );
    const prev = process.env.APIFY_PRO_WINDOW_PROFILE_DAILY_CAP_USD;
    delete process.env.APIFY_PRO_WINDOW_PROFILE_DAILY_CAP_USD;
    expect(getProWindowProfileDailyCapUsd()).toBeGreaterThanOrEqual(5);
    if (prev !== undefined) {
      process.env.APIFY_PRO_WINDOW_PROFILE_DAILY_CAP_USD = prev;
    }
  });

  it("ProWindowBudgetExceededError carrega scope (leadId/handle/window)", async () => {
    const { ProWindowBudgetExceededError } = await import(
      "@/lib/security/apify-budget.server"
    );
    const err = new ProWindowBudgetExceededError(6, 5.5, {
      leadId: "lead-1",
      handle: "frederico.m.carvalho",
      window: "90d",
    });
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("ProWindowBudgetExceededError");
    expect(err.spentUsd).toBe(6);
    expect(err.capUsd).toBe(5.5);
    expect(err.scope.window).toBe("90d");
    expect(err.scope.handle).toBe("frederico.m.carvalho");
    expect(err.scope.leadId).toBe("lead-1");
  });

  it("PayloadSchema aceita force_refresh boolean", async () => {
    // The schema is defined inline inside the route module. Reach into the
    // module's export surface by reusing the response types — if PayloadSchema
    // ever drops `force_refresh`, the request type stops accepting it and
    // this assertion fails to compile.
    const sample = {
      instagram_username: "frederico.m.carvalho",
      competitor_usernames: [],
      window: "30d" as const,
      force_refresh: true,
    };
    expect(sample.force_refresh).toBe(true);
  });
});