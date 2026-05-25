import { describe, it, expect } from "vitest";
import { finalizeEditorialVerdict } from "../openai-insights.server";
import type { EditorialVerdict, InsightsContext } from "../types";

function makeCtx(overrides: {
  posts_analyzed?: number;
  estimated_posts_per_week?: number;
  days_since_last_post?: number | null;
  has_free?: boolean;
  benchmark?: InsightsContext["benchmark"];
}): InsightsContext {
  return {
    profile: {
      username: "test",
      display_name: "Test",
      followers: 1000,
      following: 100,
      posts_count: 50,
      bio: "",
      profile_pic_url: "",
      is_verified: false,
      is_private: false,
    } as unknown as InsightsContext["profile"],
    content_summary: {
      posts_analyzed: overrides.posts_analyzed ?? 12,
      dominant_format: "Reels",
      average_likes: 100,
      average_comments: 10,
      average_engagement_rate: 2.0,
      estimated_posts_per_week: overrides.estimated_posts_per_week ?? 3,
    },
    top_posts: [],
    benchmark:
      overrides.benchmark === undefined
        ? ({ tier: "micro" } as unknown as InsightsContext["benchmark"])
        : overrides.benchmark,
    competitors_summary: { count: 0, median_engagement_pct: null },
    market_signals: {
      has_free: overrides.has_free ?? true,
      has_paid: false,
    },
    days_since_last_post: overrides.days_since_last_post ?? 5,
  };
}

function makeVerdict(
  overrides: Partial<EditorialVerdict> = {},
): EditorialVerdict {
  return {
    verdict_label: "promising",
    title: "Título editorial curto",
    paragraph: "Parágrafo válido com leitura editorial.",
    priority: "Testar nova frequência.",
    strengths: ["Ponto forte A", "Ponto forte B"],
    limitations: ["Limitação A", "Limitação B"],
    confidence: "high",
    evidence_used: ["benchmark.tier_delta"],
    ...overrides,
  };
}

describe("finalizeEditorialVerdict — deterministic warnings", () => {
  it("emits low_sample and forces limited_data + low confidence when posts < 5", () => {
    const out = finalizeEditorialVerdict(
      makeVerdict({ confidence: "high" }),
      makeCtx({ posts_analyzed: 3 }),
    );
    expect(out.warnings).toContain("low_sample");
    expect(out.verdict_label).toBe("limited_data");
    expect(out.confidence).toBe("low");
  });

  it("emits cadence_uncertain when weekly < 0.25 and posts < 8", () => {
    const out = finalizeEditorialVerdict(
      makeVerdict(),
      makeCtx({ posts_analyzed: 7, estimated_posts_per_week: 0.1 }),
    );
    expect(out.warnings).toContain("cadence_uncertain");
  });

  it("emits stale_data when days_since_last_post > 60", () => {
    const out = finalizeEditorialVerdict(
      makeVerdict(),
      makeCtx({ days_since_last_post: 90 }),
    );
    expect(out.warnings).toContain("stale_data");
  });

  it("does NOT emit stale_data when days_since_last_post is null", () => {
    const out = finalizeEditorialVerdict(
      makeVerdict(),
      makeCtx({ days_since_last_post: null }),
    );
    expect(out.warnings).not.toContain("stale_data");
  });

  it("emits no_market_signals when market_signals.has_free is false", () => {
    const out = finalizeEditorialVerdict(
      makeVerdict(),
      makeCtx({ has_free: false }),
    );
    expect(out.warnings).toContain("no_market_signals");
  });

  it("emits benchmark_missing when benchmark is null", () => {
    const out = finalizeEditorialVerdict(
      makeVerdict(),
      makeCtx({ benchmark: null }),
    );
    expect(out.warnings).toContain("benchmark_missing");
  });

  it("downgrades confidence to low when 2+ warnings exist", () => {
    const out = finalizeEditorialVerdict(
      makeVerdict({ confidence: "high" }),
      makeCtx({ has_free: false, benchmark: null }),
    );
    expect(out.warnings?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(out.confidence).toBe("low");
  });

  it("downgrades confidence from high to medium with exactly 1 warning", () => {
    const out = finalizeEditorialVerdict(
      makeVerdict({ confidence: "high" }),
      makeCtx({ has_free: false }),
    );
    expect(out.warnings).toEqual(["no_market_signals"]);
    expect(out.confidence).toBe("medium");
  });

  it("preserves confidence and emits no warnings on a clean context", () => {
    const out = finalizeEditorialVerdict(
      makeVerdict({ confidence: "high" }),
      makeCtx({
        posts_analyzed: 12,
        estimated_posts_per_week: 3,
        days_since_last_post: 5,
        has_free: true,
      }),
    );
    expect(out.warnings).toEqual([]);
    expect(out.confidence).toBe("high");
    expect(out.verdict_label).toBe("promising");
  });
});