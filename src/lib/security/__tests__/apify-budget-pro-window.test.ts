import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Per-(lead, profile, window) daily cap helper.
 *
 * Mocks the supabaseAdmin client to avoid hitting a real database. Walks
 * the two-step path used in production:
 *   credit_ledger (lead_id + reason + day) → analysis_event_ids
 *   analysis_events (id IN ids + handle + window + day) → sum cost
 */

vi.mock("@/integrations/supabase/client.server", () => {
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    limit: vi.fn(),
  };
  let nextResults: Array<{ data: unknown; error: unknown }> = [];
  builder.limit.mockImplementation(async () => {
    const next = nextResults.shift();
    return next ?? { data: [], error: null };
  });
  const from = vi.fn().mockReturnValue(builder);
  return {
    supabaseAdmin: {
      from,
      __setMockResults: (results: typeof nextResults) => {
        nextResults = [...results];
      },
      __builder: builder,
    },
  };
});

beforeEach(async () => {
  const mod = await import("@/lib/security/apify-budget.server");
  mod.invalidateProWindowBudgetCache();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("apify-budget · per-(lead, profile, window) daily cap", () => {
  it("returns 0 when no ledger rows exist for the lead", async () => {
    const admin = (await import("@/integrations/supabase/client.server"))
      .supabaseAdmin as unknown as {
      __setMockResults: (r: Array<{ data: unknown; error: unknown }>) => void;
    };
    admin.__setMockResults([{ data: [], error: null }]);
    const { getProWindowProfileDailySpendUsd } = await import(
      "@/lib/security/apify-budget.server"
    );
    const spent = await getProWindowProfileDailySpendUsd({
      leadId: "lead-1",
      handle: "frederico.m.carvalho",
      window: "90d",
    });
    expect(spent).toBe(0);
  });

  it("sums analysis_events.estimated_cost_usd joined via credit_ledger", async () => {
    const admin = (await import("@/integrations/supabase/client.server"))
      .supabaseAdmin as unknown as {
      __setMockResults: (r: Array<{ data: unknown; error: unknown }>) => void;
    };
    admin.__setMockResults([
      {
        data: [
          { analysis_event_id: "ev-1" },
          { analysis_event_id: "ev-2" },
          { analysis_event_id: null }, // ignored
        ],
        error: null,
      },
      {
        data: [
          { estimated_cost_usd: 2.5 },
          { estimated_cost_usd: "1.75" },
        ],
        error: null,
      },
    ]);
    const { getProWindowProfileDailySpendUsd } = await import(
      "@/lib/security/apify-budget.server"
    );
    const spent = await getProWindowProfileDailySpendUsd({
      leadId: "lead-1",
      handle: "frederico.m.carvalho",
      window: "90d",
    });
    expect(spent).toBeCloseTo(4.25, 5);
  });

  it("assert throws ProWindowBudgetExceededError when spend ≥ cap", async () => {
    const admin = (await import("@/integrations/supabase/client.server"))
      .supabaseAdmin as unknown as {
      __setMockResults: (r: Array<{ data: unknown; error: unknown }>) => void;
    };
    admin.__setMockResults([
      { data: [{ analysis_event_id: "ev-1" }], error: null },
      { data: [{ estimated_cost_usd: 99 }], error: null },
    ]);
    process.env.APIFY_PRO_WINDOW_PROFILE_DAILY_CAP_USD = "5.5";
    const {
      assertProWindowProfileDailyBudgetAvailable,
      ProWindowBudgetExceededError,
    } = await import("@/lib/security/apify-budget.server");
    await expect(
      assertProWindowProfileDailyBudgetAvailable({
        leadId: "lead-1",
        handle: "frederico.m.carvalho",
        window: "90d",
      }),
    ).rejects.toBeInstanceOf(ProWindowBudgetExceededError);
  });

  it("assert succeeds when spend < cap", async () => {
    const admin = (await import("@/integrations/supabase/client.server"))
      .supabaseAdmin as unknown as {
      __setMockResults: (r: Array<{ data: unknown; error: unknown }>) => void;
    };
    admin.__setMockResults([
      { data: [{ analysis_event_id: "ev-1" }], error: null },
      { data: [{ estimated_cost_usd: 0.5 }], error: null },
    ]);
    process.env.APIFY_PRO_WINDOW_PROFILE_DAILY_CAP_USD = "5.5";
    const { assertProWindowProfileDailyBudgetAvailable } = await import(
      "@/lib/security/apify-budget.server"
    );
    await expect(
      assertProWindowProfileDailyBudgetAvailable({
        leadId: "lead-1",
        handle: "frederico.m.carvalho",
        window: "30d",
      }),
    ).resolves.toBeUndefined();
  });
});