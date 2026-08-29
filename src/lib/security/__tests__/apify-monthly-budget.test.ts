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
    in() { return builder; },
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
  assertApifyMonthlyBudgetAvailable,
  getApifyMonthlySpendUsd,
  invalidateApifyMonthlyBudgetCache,
  isApifyMonthlySoftCapReached,
  MonthlyBudgetExceededError,
} from "../apify-budget.server";

beforeEach(() => {
  state.rows = [];
  state.error = null;
  invalidateApifyMonthlyBudgetCache();
  delete process.env.APIFY_MONTHLY_SOFT_CAP_USD;
  delete process.env.APIFY_MONTHLY_HARD_CAP_USD;
});

describe("apify monthly budget", () => {
  it("soma o ciclo mensal preferindo actual_cost_usd", async () => {
    state.rows = [
      { estimated_cost_usd: 1, actual_cost_usd: 1.25 },
      { estimated_cost_usd: 0.5, actual_cost_usd: null },
    ];
    expect(await getApifyMonthlySpendUsd()).toBeCloseTo(1.75, 5);
  });

  it("soft cap ($4.25) degrada Comment Intelligence", async () => {
    state.rows = [{ estimated_cost_usd: 4.3, actual_cost_usd: null }];
    expect(await isApifyMonthlySoftCapReached()).toBe(true);
    invalidateApifyMonthlyBudgetCache();
    state.rows = [{ estimated_cost_usd: 3.0, actual_cost_usd: null }];
    expect(await isApifyMonthlySoftCapReached()).toBe(false);
  });

  it("H: hard cap ($4.75) impede novos Actor runs", async () => {
    state.rows = [{ estimated_cost_usd: 4.8, actual_cost_usd: null }];
    await expect(assertApifyMonthlyBudgetAvailable()).rejects.toBeInstanceOf(
      MonthlyBudgetExceededError,
    );
    invalidateApifyMonthlyBudgetCache();
    state.rows = [{ estimated_cost_usd: 4.0, actual_cost_usd: null }];
    await expect(assertApifyMonthlyBudgetAvailable()).resolves.toBeUndefined();
  });

  it("erro de query trata como 0 (fail-open)", async () => {
    state.error = { message: "boom" };
    expect(await getApifyMonthlySpendUsd()).toBe(0);
  });
});
