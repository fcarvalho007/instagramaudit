import { describe, it, expect, vi, beforeEach } from "vitest";

interface State {
  rows: Array<{ estimated_cost_usd: number | null; actual_cost_usd: number | null }>;
  error: { message: string } | null;
}

const state: State = { rows: [], error: null };

function makeBuilder() {
  const builder: any = {
    select() { return builder; },
    eq() { return builder; },
    gte() { return builder; },
    limit() { return builder; },
    then(resolve: (v: any) => unknown) {
      if (state.error) return Promise.resolve(resolve({ data: null, error: state.error }));
      return Promise.resolve(resolve({ data: state.rows, error: null }));
    },
  };
  return builder;
}

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: { from: () => makeBuilder() },
}));

import {
  assertOpenAiDailyBudgetAvailable,
  OpenAiBudgetExceededError,
  getOpenAiDailySpendUsd,
  getOpenAiDailyCapUsd,
  invalidateOpenAiBudgetCache,
} from "../openai-budget.server";

beforeEach(() => {
  state.rows = [];
  state.error = null;
  invalidateOpenAiBudgetCache();
  delete process.env.OPENAI_DAILY_CAP_USD;
});

describe("openai-budget", () => {
  it("cap default é 5 USD quando env ausente", () => {
    expect(getOpenAiDailyCapUsd()).toBe(5);
  });

  it("lê OPENAI_DAILY_CAP_USD do ambiente", () => {
    process.env.OPENAI_DAILY_CAP_USD = "12.5";
    expect(getOpenAiDailyCapUsd()).toBe(12.5);
  });

  it("soma estimated + actual e prefere actual quando presente", async () => {
    state.rows = [
      { estimated_cost_usd: 1.0, actual_cost_usd: 1.5 },
      { estimated_cost_usd: 2.0, actual_cost_usd: null },
    ];
    const total = await getOpenAiDailySpendUsd();
    expect(total).toBeCloseTo(3.5, 5);
  });

  it("não bloqueia abaixo do cap", async () => {
    process.env.OPENAI_DAILY_CAP_USD = "10";
    state.rows = [{ estimated_cost_usd: 5, actual_cost_usd: null }];
    await expect(assertOpenAiDailyBudgetAvailable()).resolves.toBeUndefined();
  });

  it("bloqueia ao atingir o cap", async () => {
    process.env.OPENAI_DAILY_CAP_USD = "10";
    state.rows = [{ estimated_cost_usd: 10, actual_cost_usd: null }];
    await expect(assertOpenAiDailyBudgetAvailable()).rejects.toBeInstanceOf(
      OpenAiBudgetExceededError,
    );
  });

  it("trata erro de query como spend=0 (fail-open)", async () => {
    state.error = { message: "boom" };
    const total = await getOpenAiDailySpendUsd();
    expect(total).toBe(0);
  });
});