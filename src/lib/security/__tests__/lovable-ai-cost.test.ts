import { describe, it, expect, vi, beforeEach } from "vitest";

// ---- Mock supabaseAdmin for the budget cap test below ---------------------
interface State {
  rows: Array<{ estimated_cost_usd: number | null; actual_cost_usd: number | null }>;
}
const state: State = { rows: [] };
function makeBuilder() {
  const builder: any = {
    select() { return builder; },
    eq() { return builder; },
    gte() { return builder; },
    limit() { return builder; },
    then(resolve: (v: any) => unknown) {
      return Promise.resolve(resolve({ data: state.rows, error: null }));
    },
  };
  return builder;
}
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: { from: () => makeBuilder() },
}));

import { estimateLovableAiCallCostUsd } from "../lovable-ai-cost";
import {
  assertLovableAiDailyBudgetAvailable,
  LovableAiBudgetExceededError,
  invalidateLovableAiBudgetCache,
} from "../lovable-ai-budget.server";

const MODEL = "google/gemini-3-flash-preview";

beforeEach(() => {
  state.rows = [];
  invalidateLovableAiBudgetCache();
  delete process.env.LOVABLE_AI_DAILY_CAP_USD;
  delete process.env.LOVABLE_AI_PRICE_INPUT_USD_PER_1K;
  delete process.env.LOVABLE_AI_PRICE_OUTPUT_USD_PER_1K;
  delete process.env.LOVABLE_AI_FLAT_FALLBACK_USD;
});

describe("estimateLovableAiCallCostUsd", () => {
  it("call with tokens → token-based estimate (deterministic, > 0)", () => {
    // defaults: in=0.0001/1k, out=0.0004/1k → 5000*0.0001/1000 + 1000*0.0004/1000
    // = 0.0005 + 0.0004 = 0.0009 → below flat fallback 0.001 → fallback wins
    const small = estimateLovableAiCallCostUsd({
      model: MODEL, promptTokens: 5000, completionTokens: 1000,
    });
    expect(small).toBe(0.001);

    // Larger usage exceeds flat fallback and produces a token-based value.
    const big = estimateLovableAiCallCostUsd({
      model: MODEL, promptTokens: 50_000, completionTokens: 10_000,
    });
    // 50000*0.0001/1000 + 10000*0.0004/1000 = 0.005 + 0.004 = 0.009
    expect(big).toBeCloseTo(0.009, 5);
    expect(big).toBeGreaterThan(0.001);
  });

  it("call without tokens → flat fallback estimate", () => {
    expect(
      estimateLovableAiCallCostUsd({ model: MODEL, promptTokens: null, completionTokens: null }),
    ).toBe(0.001);
    expect(
      estimateLovableAiCallCostUsd({ model: MODEL, promptTokens: 0, completionTokens: 0 }),
    ).toBe(0.001);
    expect(
      estimateLovableAiCallCostUsd({ model: MODEL }),
    ).toBe(0.001);
  });
});

describe("assertLovableAiDailyBudgetAvailable with estimated costs", () => {
  it("daily cap is exceeded once estimated spend reaches it", async () => {
    process.env.LOVABLE_AI_DAILY_CAP_USD = "0.05";
    const perCall = estimateLovableAiCallCostUsd({
      model: MODEL, promptTokens: null, completionTokens: null,
    });
    expect(perCall).toBe(0.001);
    // 50 calls × $0.001 = $0.05 → reaches cap
    state.rows = Array.from({ length: 50 }, () => ({
      estimated_cost_usd: perCall,
      actual_cost_usd: null,
    }));
    await expect(assertLovableAiDailyBudgetAvailable()).rejects.toBeInstanceOf(
      LovableAiBudgetExceededError,
    );
  });
});