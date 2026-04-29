/**
 * Vitest suite for the market-signals insights flow.
 *
 * Pure: no provider call, no DB.
 */

import { describe, it, expect } from "vitest";

import { buildInsightsUserPayload } from "../prompt";
import type { InsightsContext } from "../types";
import { validateInsights } from "../validate";

function makeCtx(): InsightsContext {
  return {
    profile: {
      username: "frederico.m.carvalho",
      display_name: "Frederico Carvalho",
      followers_count: 1200,
      posts_count: 42,
      is_verified: false,
      bio: "Marketing & IA",
      avatar_url: null,
      following_count: null,
    },
    content_summary: {
      posts_analyzed: 12,
      dominant_format: "Reels",
      average_likes: 80,
      average_comments: 4,
      average_engagement_rate: 0.5,
      estimated_posts_per_week: 1.5,
    },
    top_posts: [
      {
        format: "Reels",
        likes: 120,
        comments: 8,
        engagement_pct: 1.2,
        caption_excerpt: "Reel sobre IA aplicada a marketing",
      },
    ],
    benchmark: null,
    competitors_summary: { count: 0, median_engagement_pct: null },
    market_signals: {
      has_free: true,
      has_paid: false,
      top_keywords: ["ia"],
      strongest_keyword: "ia",
      strongest_score: 65,
      trend_direction: "up",
      trend_delta_pct: 22,
      usable_keyword_count: 1,
      zero_signal_keywords: ["marketingdigital"],
      dropped_keywords: [],
    },
  };
}

function makePassingResponse() {
  return {
    insights: [
      {
        id: "MARKET_IA_DEMAND",
        title: "Procura por IA em alta no mercado",
        body: "A procura por «ia» apresenta sinal médio de 65 e tendência em alta (+22%). Reforçar conteúdos sobre este tema durante 4 semanas e medir o envolvimento.",
        evidence: [
          "market_signals.strongest_keyword",
          "market_signals.strongest_score",
          "market_signals.trend_direction",
        ],
        confidence: "baseado em dados observados",
        priority: 80,
      },
      {
        id: "POSTING_CADENCE",
        title: "Ritmo semanal abaixo do recomendado",
        body: "O ritmo actual é de 1,5 publicações por semana. Subir para 3 publicações semanais durante 4 semanas e reavaliar.",
        evidence: ["content_summary.estimated_posts_per_week"],
        confidence: "baseado em dados observados",
        priority: 60,
      },
      {
        id: "ENG_LOW",
        title: "Envolvimento médio baixo",
        body: "O envolvimento médio (0,5%) está aquém do esperado. Testar capas mais fortes nos próximos 4 Reels e medir o impacto.",
        evidence: ["content_summary.average_engagement_rate"],
        confidence: "baseado em dados observados",
        priority: 50,
      },
    ],
  };
}

function clone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x)) as T;
}

describe("validateInsights — market_signals", () => {
  const ctx = makeCtx();

  it("payload exposes new numeric market signals", () => {
    const payload = buildInsightsUserPayload(ctx);
    expect(payload.market_signals.strongest_score).toBe(65);
    expect(payload.market_signals.trend_delta_pct).toBe(22);
    expect(payload.market_signals.usable_keyword_count).toBe(1);
    expect(payload.market_signals.top_keywords).toEqual(["ia"]);
    expect(payload.market_signals.zero_signal_keywords).toEqual([
      "marketingdigital",
    ]);
    expect(payload.available_signals).toContain(
      "market_signals.strongest_score",
    );
    expect(payload.available_signals).toContain(
      "market_signals.trend_delta_pct",
    );
    expect(payload.available_signals).toContain(
      "market_signals.zero_signal_keywords",
    );
  });

  it("accepts a correct market insight with numeric grounding", () => {
    const res = validateInsights(makePassingResponse(), ctx);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.insights[0].id).toBe("MARKET_IA_DEMAND");
    }
  });

  it("rejects generic market body without numeric grounding with GENERIC_OUTPUT", () => {
    const raw = clone(makePassingResponse());
    raw.insights[0].body = "Alinhar o conteúdo com as keywords em tendência.";
    const res = validateInsights(raw, ctx);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.reason).toBe("GENERIC_OUTPUT");
    }
  });

  it("rejects zero-signal keyword cited as a strong opportunity", () => {
    const raw = clone(makePassingResponse());
    raw.insights[0].body =
      "A procura por «marketingdigital» está em alta. Apostar neste tema.";
    raw.insights[0].evidence = ["market_signals.zero_signal_keywords"];
    const res = validateInsights(raw, ctx);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      // GENERIC_OUTPUT (no number / no token match) or EVIDENCE_INVALID
      // (path not in available_signals) — both prove the validator
      // catches the abuse.
      expect(["GENERIC_OUTPUT", "EVIDENCE_INVALID"]).toContain(res.reason);
    }
  });
});
