import { describe, expect, it } from "vitest";
import {
  aggregateScrapeCreatorsCosts,
  equivalentCostUsd,
  isDeprecatedEndpoint,
  isProductionContext,
  reconciliationStatus,
  SCRAPECREATORS_LIST_COST_PER_CREDIT_USD,
  type ScrapeCreatorsLogRow,
} from "../scrapecreators-costs";

const NOW = Date.parse("2026-08-30T16:00:00.000Z");
const COST = SCRAPECREATORS_LIST_COST_PER_CREDIT_USD;

function row(partial: Partial<ScrapeCreatorsLogRow>): ScrapeCreatorsLogRow {
  return {
    endpoint: "/v1/instagram/profile",
    status: "success",
    cached: false,
    credits_charged: 1,
    credits_remaining: null,
    source_context: "public_analysis",
    duration_ms: 1000,
    analysis_event_id: "evt",
    created_at: "2026-08-30T14:00:00.000Z",
    ...partial,
  };
}

describe("scrapecreators cost aggregation", () => {
  it("soma créditos por janela", () => {
    const s = aggregateScrapeCreatorsCosts(
      [
        row({ credits_charged: 2, created_at: "2026-08-30T11:00:00.000Z" }),
        row({ credits_charged: 5, created_at: "2026-08-25T11:00:00.000Z" }),
        row({ credits_charged: 3, created_at: "2026-07-20T11:00:00.000Z" }),
      ],
      { costPerCreditUsd: COST, promotional: true, now: NOW },
    );
    expect(s.windows.last_24h.credits).toBe(2);
    expect(s.windows.last_7d.credits).toBe(7);
    expect(s.windows.last_30d.credits).toBe(10);
    expect(s.windows.all_time.credits).toBe(10);
  });

  it("custo efectivo é zero na fase promocional, equivalente não", () => {
    const s = aggregateScrapeCreatorsCosts([row({ credits_charged: 10 })], {
      costPerCreditUsd: COST,
      promotional: true,
      now: NOW,
    });
    expect(s.windows.last_30d.actual_cash_cost_usd).toBe(0);
    expect(s.windows.last_30d.equivalent_cost_usd).toBeCloseTo(10 * COST, 6);
  });

  it("com pack pago o custo efectivo iguala o equivalente", () => {
    const s = aggregateScrapeCreatorsCosts([row({ credits_charged: 10 })], {
      costPerCreditUsd: 0.002,
      promotional: false,
      now: NOW,
    });
    expect(s.windows.last_30d.actual_cash_cost_usd).toBeCloseTo(0.02, 6);
  });

  it("chamadas com 0 créditos contam como call mas não como custo", () => {
    const s = aggregateScrapeCreatorsCosts(
      [row({ credits_charged: 0, cached: true })],
      { costPerCreditUsd: COST, promotional: true, now: NOW },
    );
    expect(s.windows.last_30d.calls).toBe(1);
    expect(s.windows.last_30d.credits).toBe(0);
    expect(s.windows.last_30d.cached_calls).toBe(1);
  });

  it("guarda o último saldo conhecido com idade", () => {
    const s = aggregateScrapeCreatorsCosts(
      [
        row({ credits_remaining: 55, created_at: "2026-08-30T11:00:00.000Z" }),
        row({ credits_remaining: 36, created_at: "2026-08-30T15:00:00.000Z" }),
      ],
      { costPerCreditUsd: COST, promotional: true, now: NOW },
    );
    expect(s.last_known_balance?.credits_remaining).toBe(36);
    expect(s.last_known_balance?.age_seconds).toBe(3600);
    expect(s.reconciliation.status).toBe("green");
  });

  it("separa produção de lab/QA", () => {
    const s = aggregateScrapeCreatorsCosts(
      [
        row({ credits_charged: 4, source_context: "public_analysis" }),
        row({ credits_charged: 6, source_context: "admin_lab" }),
      ],
      { costPerCreditUsd: COST, promotional: true, now: NOW },
    );
    expect(s.production_30d.credits).toBe(4);
    expect(s.lab_30d.credits).toBe(6);
  });

  it("detecta endpoints deprecated", () => {
    const s = aggregateScrapeCreatorsCosts(
      [row({ endpoint: "/v1/instagram/post/comments" })],
      { costPerCreditUsd: COST, promotional: true, now: NOW },
    );
    expect(s.deprecated_endpoint_calls_30d).toBe(1);
    expect(s.by_endpoint_30d[0]?.deprecated).toBe(true);
    expect(isDeprecatedEndpoint("/v2/instagram/post/comments")).toBe(false);
  });

  it("unit economics exclui lab e usa auditorias fresh", () => {
    const s = aggregateScrapeCreatorsCosts(
      [
        row({ credits_charged: 2, endpoint: "/v2/instagram/user/posts" }),
        row({ credits_charged: 2, endpoint: "/v1/instagram/profile" }),
        row({ credits_charged: 5, endpoint: "/v2/instagram/post/comments", source_context: "enrich_comments" }),
      ],
      { costPerCreditUsd: COST, promotional: true, now: NOW, freshAudits30d: 2, commentUnlocks30d: 1 },
    );
    expect(s.unit_economics_30d.credits_per_fresh_audit).toBe(2);
    expect(s.unit_economics_30d.credits_per_comment_unlock).toBe(5);
  });

  it("helpers de contexto e custo", () => {
    expect(isProductionContext("enrich_comments")).toBe(true);
    expect(isProductionContext("admin_lab")).toBe(false);
    expect(equivalentCostUsd(0, COST)).toBe(0);
    expect(reconciliationStatus(0, false)).toBe("unknown");
    expect(reconciliationStatus(1, true)).toBe("amber");
    expect(reconciliationStatus(5, true)).toBe("red");
  });
});
