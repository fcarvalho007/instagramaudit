/**
 * Verifica que `buildInsightsCtx` deriva `top_hashtags`,
 * `hashtags_state` e `cadence_label_pt` a partir dos posts enriquecidos,
 * cobrindo os 3 cenários canónicos (recurring / weak / absent) e a
 * conversão da cadência em frase pt-PT.
 */

import { describe, expect, it } from "vitest";

import { buildInsightsCtx } from "../build-context";
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
  hashtags?: string[] | null;
  taken_at?: number | null;
  taken_at_iso?: string | null;
  is_pinned?: boolean | null;
};

function profile(): PublicAnalysisProfile {
  return {
    username: "x",
    display_name: "X",
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
    estimated_posts_per_week: 3,
  } as PublicAnalysisContentSummary;
}
function benchmark(): BenchmarkPositioning {
  return { status: "unavailable", reason: "no-data" } as unknown as BenchmarkPositioning;
}

function daysAgoIso(days: number, now = Date.now()): string {
  return new Date(now - days * 86_400_000).toISOString();
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

function makePost(i: number, hashtags: string[]): Post {
  return {
    format: "Reels",
    likes: 100,
    comments: 5,
    engagement_pct: 1,
    taken_at_iso: daysAgoIso(i + 1),
    hashtags,
  };
}

describe("buildInsightsCtx — hashtags + cadence label", () => {
  it("recurring: ao menos uma hashtag em >=2 posts → state recurring + top_hashtags ordenadas", () => {
    const posts: Post[] = [
      makePost(0, ["lifestyle", "porto"]),
      makePost(1, ["lifestyle", "viagens"]),
      makePost(2, ["lifestyle"]),
      makePost(3, ["porto"]),
      makePost(4, ["aleatorio"]),
      makePost(5, ["outro"]),
    ];
    const ctx = buildCtxFor(posts);
    expect(ctx.hashtags_state).toBe("recurring");
    expect(ctx.top_hashtags?.[0]?.tag).toMatch(/^#?lifestyle$/);
    expect(ctx.top_hashtags?.[0]?.uses).toBeGreaterThanOrEqual(2);
    expect(typeof ctx.cadence_label_pt).toBe("string");
    // 6 posts diários → cadência alta
    expect(ctx.cadence_label_pt).toMatch(/post/);
  });

  it("weak: existem hashtags mas todas com uso=1 → state weak", () => {
    const posts: Post[] = [
      makePost(0, ["um"]),
      makePost(1, ["dois"]),
      makePost(2, ["tres"]),
      makePost(3, ["quatro"]),
      makePost(4, ["cinco"]),
    ];
    const ctx = buildCtxFor(posts);
    expect(ctx.hashtags_state).toBe("weak");
    expect((ctx.top_hashtags ?? []).length).toBeGreaterThan(0);
    expect((ctx.top_hashtags ?? []).every((h) => h.uses === 1)).toBe(true);
  });

  it("absent: nenhum post tem hashtags → state absent + top_hashtags vazio", () => {
    const posts: Post[] = Array.from({ length: 5 }, (_, i) => makePost(i, []));
    const ctx = buildCtxFor(posts);
    expect(ctx.hashtags_state).toBe("absent");
    expect(ctx.top_hashtags ?? []).toEqual([]);
  });

  it("cadence label reflecte amostra insuficiente", () => {
    const posts: Post[] = [
      {
        format: "Reels",
        likes: 10,
        comments: 1,
        engagement_pct: 0.1,
        taken_at_iso: daysAgoIso(40),
        hashtags: [],
      },
    ];
    const ctx = buildCtxFor(posts);
    expect(ctx.cadence.sufficient).toBe(false);
    expect(ctx.cadence_label_pt).toMatch(/amostra/i);
  });
});