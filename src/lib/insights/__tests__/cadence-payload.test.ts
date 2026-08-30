/**
 * Verifica que `buildInsightsUserPayload` propaga o objecto `cadence`
 * corrigido para o payload enviado à OpenAI (v1 e v2 partilham o builder).
 *
 * Pure: sem provider call, sem I/O. Cobre 4 cenários canónicos:
 *   1. robs.cortez (2 pinned antigos + 10 recentes) → window_30d
 *   2. amostra insuficiente (3 posts) → weekly/windowDays nulos
 *   3. sample_span (8 posts ao longo de 120 dias)
 *   4. pinnedExcluded omitido quando === 0
 */

import { describe, expect, it } from "vitest";

import { buildInsightsCtx } from "../build-context";
import { buildInsightsUserPayload } from "../prompt";
import type {
  CompetitorAnalysis,
  PublicAnalysisContentSummary,
  PublicAnalysisProfile,
} from "@/lib/analysis/types";
import type { BenchmarkPositioning } from "@/lib/benchmark/types";

type Post = {
  format: "Reels" | "Carrosséis" | "Imagens";
  likes: number;
  comments: number;
  engagement_pct: number;
  caption?: string | null;
  taken_at?: number | null;
  taken_at_iso?: string | null;
  is_pinned?: boolean | null;
};

function profile(): PublicAnalysisProfile {
  return {
    username: "robs.cortez",
    display_name: "Robs",
    followers_count: 5000,
    posts_count: 80,
    is_verified: false,
    bio: "",
    avatar_url: null,
    following_count: null,
  } as unknown as PublicAnalysisProfile;
}

function summary(): PublicAnalysisContentSummary {
  return {
    posts_analyzed: 12,
    dominant_format: "Reels",
    average_likes: 200,
    average_comments: 10,
    average_engagement_rate: 1.2,
    estimated_posts_per_week: 0.5, // valor cru desactualizado — não deve ser usado pelo modelo
  } as PublicAnalysisContentSummary;
}

function benchmark(): BenchmarkPositioning {
  return { status: "unavailable", reason: "no-data" } as unknown as BenchmarkPositioning;
}

function buildCtxFor(posts: Post[]) {
  const { ctx } = buildInsightsCtx({
    profile: profile(),
    summary: summary(),
    posts,
    formatStats: [] as never,
    marketSignalsFree: null,
    competitorResults: [] as CompetitorAnalysis[],
    benchmark: benchmark(),
    marketSignals: { has_free: false, has_paid: false },
  });
  return ctx;
}

function daysAgoIso(days: number, now = Date.now()): string {
  return new Date(now - days * 86_400_000).toISOString();
}

describe("cadence in OpenAI payload", () => {
  it("inclui o objecto cadence com a shape esperada", () => {
    const posts: Post[] = Array.from({ length: 6 }, (_, i) => ({
      format: "Reels",
      likes: 100,
      comments: 5,
      engagement_pct: 1,
      taken_at_iso: daysAgoIso(i * 3 + 1),
    }));
    const payload = buildInsightsUserPayload(buildCtxFor(posts));
    expect(payload.cadence).toBeDefined();
    expect(payload.cadence.method).toBe("window_30d");
    expect(payload.cadence.sufficient).toBe(true);
    expect(typeof payload.cadence.weekly).toBe("number");
    expect(payload.cadence.windowDays).toBe(30);
    expect(payload.allowed_evidence_paths).toContain("cadence.method");
    expect(payload.allowed_evidence_paths).toContain("cadence.weekly");
    expect(payload.allowed_evidence_paths).toContain("cadence.sufficient");
  });

  it("fixture robs.cortez: 2 pinned antigos + 10 recentes → window_30d, excluídos por data", () => {
    const pinned: Post[] = [
      {
        format: "Reels",
        likes: 50,
        comments: 1,
        engagement_pct: 0.5,
        taken_at_iso: daysAgoIso(900),
        is_pinned: true,
      },
      {
        format: "Reels",
        likes: 60,
        comments: 2,
        engagement_pct: 0.6,
        taken_at_iso: daysAgoIso(1100),
        is_pinned: true,
      },
    ];
    const recent: Post[] = Array.from({ length: 10 }, (_, i) => ({
      format: "Reels",
      likes: 120,
      comments: 6,
      engagement_pct: 1.1,
      taken_at_iso: daysAgoIso(i + 1), // posts diários nos últimos 10 dias
    }));
    const payload = buildInsightsUserPayload(buildCtxFor([...pinned, ...recent]));
    expect(payload.cadence.method).toBe("window_30d");
    expect(payload.cadence.sampleSize).toBe(10);
    expect(payload.cadence.sufficient).toBe(true);
    // Pinned posts are no longer excluded for being pinned; the two 2023
    // entries drop out as date outliers instead.
    expect(payload.cadence.pinnedExcluded).toBeUndefined();
    // weekly ≈ 10 / 4.345 ≈ 2.3
    expect(payload.cadence.weekly).toBeGreaterThan(2);
    expect(payload.cadence.weekly).toBeLessThan(3);
  });

  it("amostra insuficiente: weekly e windowDays a null, note presente", () => {
    // 1 post apenas → insufficient (sample_span exige >=2 posts dentro de 180d).
    const posts: Post[] = [
      {
        format: "Reels",
        likes: 10,
        comments: 1,
        engagement_pct: 0.1,
        taken_at_iso: daysAgoIso(40),
      },
    ];
    const payload = buildInsightsUserPayload(buildCtxFor(posts));
    expect(payload.cadence.method).toBe("insufficient");
    expect(payload.cadence.sufficient).toBe(false);
    expect(payload.cadence.weekly).toBeNull();
    expect(payload.cadence.windowDays).toBeNull();
    expect(payload.cadence.note).toBeDefined();
    expect(payload.cadence.note).toMatch(/insuficiente/i);
    // paths que não existem no payload não devem aparecer como evidence
    expect(payload.allowed_evidence_paths).not.toContain("cadence.weekly");
    expect(payload.allowed_evidence_paths).not.toContain("cadence.windowDays");
  });

  it("sample_span: 8 posts ao longo de 120 dias", () => {
    // 1 post recente (5d) + 7 posts antigos espaçados — força fallback
    // para sample_span (não dá window_30d com >=3, nem window_90d com >=4).
    const posts: Post[] = [
      { format: "Reels", likes: 100, comments: 5, engagement_pct: 1, taken_at_iso: daysAgoIso(5) },
      { format: "Reels", likes: 100, comments: 5, engagement_pct: 1, taken_at_iso: daysAgoIso(100) },
      { format: "Reels", likes: 100, comments: 5, engagement_pct: 1, taken_at_iso: daysAgoIso(110) },
      { format: "Reels", likes: 100, comments: 5, engagement_pct: 1, taken_at_iso: daysAgoIso(115) },
      { format: "Reels", likes: 100, comments: 5, engagement_pct: 1, taken_at_iso: daysAgoIso(118) },
      { format: "Reels", likes: 100, comments: 5, engagement_pct: 1, taken_at_iso: daysAgoIso(120) },
      { format: "Reels", likes: 100, comments: 5, engagement_pct: 1, taken_at_iso: daysAgoIso(125) },
      { format: "Reels", likes: 100, comments: 5, engagement_pct: 1, taken_at_iso: daysAgoIso(130) },
    ];
    const payload = buildInsightsUserPayload(buildCtxFor(posts));
    expect(payload.cadence.method).toBe("sample_span");
    expect(typeof payload.cadence.weekly).toBe("number");
    expect(payload.cadence.sufficient).toBe(true);
  });

  it("pinnedExcluded é omitido quando === 0", () => {
    const posts: Post[] = Array.from({ length: 6 }, (_, i) => ({
      format: "Reels",
      likes: 100,
      comments: 5,
      engagement_pct: 1,
      taken_at_iso: daysAgoIso(i * 3 + 1),
    }));
    const payload = buildInsightsUserPayload(buildCtxFor(posts));
    expect(payload.cadence.pinnedExcluded).toBeUndefined();
    expect(payload.allowed_evidence_paths).not.toContain("cadence.pinnedExcluded");
  });
});