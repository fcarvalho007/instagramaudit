import { describe, it, expect } from "vitest";
import { computeKpis } from "../overview-formulas";

const base = {
  leads_30d: 12,
  analyses_30d: 1997,
  fresh_analyses_30d: 35,
  reports_unlocked_30d: 8,
  cost_total_30d: 5.4,
  cost_public_30d: 3.2,
  fresh_avg_cost_per_report: 0.09,
  revenue_30d: 0,
  revenue_active: false,
};

describe("computeKpis", () => {
  it("does not divide by zero when leads_30d=0", () => {
    const out = computeKpis({ ...base, leads_30d: 0 });
    expect(out.cost_per_lead).toBeNull();
    expect(out.margin_per_lead).toBeNull();
    expect(out.margin_status).toBe("inactive");
  });

  it("returns inactive margin when revenue is not active", () => {
    const out = computeKpis({ ...base, revenue_active: false, revenue_30d: 0 });
    expect(out.margin_per_lead).toBeNull();
    expect(out.revenue_per_lead).toBeNull();
    expect(out.margin_status).toBe("inactive");
  });

  it("computes cost_per_lead from cost_public / leads", () => {
    const out = computeKpis(base);
    expect(out.cost_per_lead).toBeCloseTo(3.2 / 12, 6);
  });

  it("passes through cost_per_analysis from fresh_avg_cost_per_report", () => {
    const out = computeKpis(base);
    expect(out.cost_per_analysis).toBe(0.09);
  });

  it("computes cost_per_unlocked_report from cost_public / reports", () => {
    const out = computeKpis(base);
    expect(out.cost_per_unlocked_report).toBeCloseTo(3.2 / 8, 6);
  });

  it("flags negative margin only when revenue is active and < cost", () => {
    const out = computeKpis({
      ...base,
      revenue_active: true,
      revenue_30d: 1, // €1 / 12 leads = 0.083
    });
    // cost/lead ≈ 0.267, revenue/lead ≈ 0.083 → margin negative
    expect(out.margin_status).toBe("negative");
    expect(out.margin_per_lead).not.toBeNull();
    expect(out.margin_per_lead!).toBeLessThan(0);
  });

  it("flags positive margin when revenue per lead exceeds cost per lead", () => {
    const out = computeKpis({
      ...base,
      revenue_active: true,
      revenue_30d: 100, // €100 / 12 ≈ 8.3
    });
    expect(out.margin_status).toBe("positive");
    expect(out.margin_per_lead!).toBeGreaterThan(0);
  });
});