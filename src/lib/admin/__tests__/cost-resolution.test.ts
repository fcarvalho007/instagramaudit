import { describe, it, expect } from "vitest";
import { resolveCallCost, hasReportedActualCost } from "../cost-resolution";

describe("resolveCallCost", () => {
  it("uses actual when > 0", () => {
    expect(resolveCallCost({ actual_cost_usd: 0.42, estimated_cost_usd: 0.10 })).toBe(0.42);
  });

  it("falls back to estimated when actual is 0 (Apify scraper case)", () => {
    expect(resolveCallCost({ actual_cost_usd: 0, estimated_cost_usd: 0.15 })).toBe(0.15);
  });

  it("falls back to estimated when actual is null (OpenAI case)", () => {
    expect(resolveCallCost({ actual_cost_usd: null, estimated_cost_usd: 0.08 })).toBe(0.08);
  });

  it("returns 0 when both are null/0", () => {
    expect(resolveCallCost({ actual_cost_usd: null, estimated_cost_usd: null })).toBe(0);
    expect(resolveCallCost({ actual_cost_usd: 0, estimated_cost_usd: 0 })).toBe(0);
  });

  it("accepts numeric strings (Postgres numeric)", () => {
    expect(resolveCallCost({ actual_cost_usd: "0.25", estimated_cost_usd: "0.10" })).toBe(0.25);
    expect(resolveCallCost({ actual_cost_usd: "0", estimated_cost_usd: "0.10" })).toBe(0.10);
  });

  it("ignores NaN/undefined safely", () => {
    expect(resolveCallCost({})).toBe(0);
    expect(resolveCallCost({ actual_cost_usd: "abc" as unknown as string })).toBe(0);
  });
});

describe("hasReportedActualCost", () => {
  it("true only when actual > 0", () => {
    expect(hasReportedActualCost({ actual_cost_usd: 0.01 })).toBe(true);
    expect(hasReportedActualCost({ actual_cost_usd: 0 })).toBe(false);
    expect(hasReportedActualCost({ actual_cost_usd: null })).toBe(false);
    expect(hasReportedActualCost({})).toBe(false);
  });
});
