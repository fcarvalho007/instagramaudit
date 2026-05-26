/**
 * Garante que `buildInsightsCtx` integra de forma segura
 * `caption_intelligence` (a partir de `CaptionSemanticAnalysis`) e
 * `visual_cover` (a partir de `VisualCoverAnalysis`):
 *  - presente → campos derivados aparecem em `ctx`;
 *  - ausente  → chaves omitidas (nunca `undefined`/`null` invented).
 */

import { describe, expect, it } from "vitest";

import { buildInsightsCtx } from "../build-context";
import type {
  CompetitorAnalysis,
  PublicAnalysisContentSummary,
  PublicAnalysisProfile,
} from "@/lib/analysis/types";
import type { BenchmarkPositioning } from "@/lib/benchmark/types";
import type { CaptionSemanticAnalysis } from "@/lib/report/caption-semantic-types";
import type { VisualCoverAnalysis } from "@/lib/report/visual-cover-types";

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
    posts_analyzed: 6,
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

function basePosts(): Post[] {
  return Array.from({ length: 6 }, (_, i) => ({
    format: "Reels",
    likes: 100,
    comments: 5,
    engagement_pct: 1,
    taken_at_iso: daysAgoIso(i + 1),
    hashtags: [],
  }));
}

function build(opts: {
  captionSemantic?: CaptionSemanticAnalysis | null;
  visualCover?: VisualCoverAnalysis | null;
}) {
  const { ctx } = buildInsightsCtx({
    profile: profile(),
    summary: summary(),
    posts: basePosts(),
    formatStats: [] as never,
    marketSignalsFree: null,
    competitorResults: [] as CompetitorAnalysis[],
    benchmark: benchmark(),
    marketSignals: { has_free: false, has_paid: false },
    ...(opts.captionSemantic !== undefined
      ? { captionSemantic: opts.captionSemantic }
      : {}),
    ...(opts.visualCover !== undefined ? { visualCover: opts.visualCover } : {}),
  });
  return ctx;
}

const CAPTION_FIXTURE: CaptionSemanticAnalysis = {
  source: "openai",
  schemaVersion: 1,
  analyzedCaptions: 6,
  dominantThemes: [
    { label: "viagens", explanation: "...", postsCount: 3, evidence: [], confidence: "high" },
    { label: "lifestyle", explanation: "...", postsCount: 2, evidence: [], confidence: "medium" },
    { label: "comida", explanation: "...", postsCount: 1, evidence: [], confidence: "low" },
    { label: "extra", explanation: "...", postsCount: 1, evidence: [], confidence: "low" },
  ],
  contentIntent: { primary: "inspirar", explanation: "..." },
  commentEngagement: {
    asksForCommentsCount: 1,
    asksForCommentsPct: 16,
    strategyLabel: "occasional",
    examples: [],
    explanation: "",
  },
  recurringExpressionsInterpretation: [],
  diagnostic: { main: "", works: "", critical: "", watch: "" },
  hookQuality: { rating: "moderate", explanation: "abertura simples mas funcional" },
  brandVoice: { rating: "consistent", explanation: "tom coloquial uniforme" },
  formulaicPatterns: {
    hasFormulas: true,
    examples: [],
    explanation: "captions curtas com pergunta no fim",
  },
};

const VISUAL_FIXTURE: VisualCoverAnalysis = {
  analyzedCount: 6,
  overallScore: 72,
  status: "strong",
  summary: "Capas com forte coerência cromática e presença humana recorrente.",
  subScores: {
    recognizability: 80,
    colorCoherence: 75,
    composition: 70,
    visualVariety: 60,
    textDensity: 70,
  },
  thumbnails: [],
  aggregate: {
    humanPresencePct: 80,
    textInImagePct: 10,
    dominantPalette: ["#111", "#222", "#333"],
    repeatedTemplateCount: 5,
    repeatedTemplateNote: "Template recorrente: rosto centrado + título sobreposto.",
  },
  diagnostic: { main: "", works: "", critical: "", watch: "" },
};

describe("buildInsightsCtx — caption_intelligence / visual_cover", () => {
  it("inclui caption_intelligence quando captionSemantic é fornecido", () => {
    const ctx = build({ captionSemantic: CAPTION_FIXTURE });
    expect(ctx.caption_intelligence).toBeDefined();
    const ci = ctx.caption_intelligence!;
    expect(ci.topics).toEqual(["viagens", "lifestyle", "comida"]); // máx 3
    expect(ci.hook_pattern).toMatch(/moderate/);
    expect(ci.tone_summary).toMatch(/consistent/);
    expect(ci.caption_length_pattern).toMatch(/captions curtas/);
  });

  it("omite caption_intelligence quando captionSemantic é null/ausente", () => {
    const ctx = build({ captionSemantic: null });
    expect(ctx.caption_intelligence).toBeUndefined();
    const ctx2 = build({});
    expect(ctx2.caption_intelligence).toBeUndefined();
  });

  it("inclui visual_cover quando visualCover é fornecido", () => {
    const ctx = build({ visualCover: VISUAL_FIXTURE });
    expect(ctx.visual_cover).toBeDefined();
    const vc = ctx.visual_cover!;
    expect(vc.summary).toMatch(/coerência cromática/);
    expect(vc.consistency).toBe("consistent"); // repeated >= 4
    expect(vc.visual_clarity).toBe("strong");
    expect(vc.cover_pattern).toMatch(/Template recorrente/);
  });

  it("omite visual_cover quando visualCover é null/ausente", () => {
    const ctx = build({ visualCover: null });
    expect(ctx.visual_cover).toBeUndefined();
    const ctx2 = build({});
    expect(ctx2.visual_cover).toBeUndefined();
  });
});