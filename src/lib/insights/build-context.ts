/**
 * Shared builder for the OpenAI insights `InsightsContext`.
 *
 * The public analysis pipeline calls OpenAI twice (legacy v1 + R3 v2) with
 * the same context shape. Before this helper, the two branches in
 * `routes/api/analyze-public-v1.ts` repeated ~80 lines of:
 *   - filtering successful competitors
 *   - computing the median competitor engagement
 *   - taking the top 3 posts by engagement
 *   - calling `buildEditorialPatterns` + `buildEditorialPatternsForInsights`
 *   - assembling the final `InsightsContext`
 *
 * Behaviour is identical to the previous inline blocks. Pure: no I/O, no
 * provider calls, no mutation of inputs.
 */

import {
  buildEditorialPatterns,
  buildEditorialPatternsForInsights,
  type EditorialPatternsForInsights,
} from "@/lib/report/editorial-patterns";
import type {
  CompetitorAnalysis,
  PublicAnalysisContentSummary,
  PublicAnalysisProfile,
} from "@/lib/analysis/types";
import type { BenchmarkPositioning } from "@/lib/benchmark/types";
import type { PersistedMarketSignals } from "@/lib/market-signals/cache";
import type { InsightsContext } from "./types";

/** Subset of the `EnrichedPost` shape the helper actually reads. */
type PostInput = {
  format: "Reels" | "Carrosséis" | "Imagens";
  likes: number;
  comments: number;
  engagement_pct: number;
  caption?: string | null;
};

export interface BuildInsightsCtxInput {
  profile: PublicAnalysisProfile;
  summary: PublicAnalysisContentSummary;
  /** Already-enriched posts (output of `enrichPosts(...).posts`). */
  posts: ReadonlyArray<PostInput>;
  /** Per-format aggregates (output of `enrichPosts(...).format_stats`). */
  formatStats: Parameters<typeof buildEditorialPatterns>[0]["format_stats"];
  /** DataForSEO Trends summary (free tier). Null when disabled/unusable. */
  marketSignalsFree: PersistedMarketSignals | null;
  /** Successful + failed competitor results from the public analysis flow. */
  competitorResults: ReadonlyArray<CompetitorAnalysis>;
  /** Pre-computed benchmark positioning attached to the snapshot. */
  benchmark: BenchmarkPositioning;
  /** Compact `market_signals` summary the prompt expects (already derived). */
  marketSignals: InsightsContext["market_signals"];
}

export interface BuildInsightsCtxResult {
  ctx: InsightsContext;
  /** Compact editorial patterns forwarded to the model (or undefined). */
  editorialPatternsForAi: EditorialPatternsForInsights | undefined;
}

/** Pure median helper. Returns null when the input is empty. */
function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export function buildInsightsCtx(
  input: BuildInsightsCtxInput,
): BuildInsightsCtxResult {
  const {
    profile,
    summary,
    posts,
    formatStats,
    marketSignalsFree,
    competitorResults,
    benchmark,
    marketSignals,
  } = input;

  const successfulCompetitors = competitorResults.filter(
    (c): c is Extract<CompetitorAnalysis, { success: true }> => c.success,
  );
  const competitorEngagements = successfulCompetitors
    .map((c) => c.content_summary.average_engagement_rate)
    .filter((n) => Number.isFinite(n) && n > 0);
  const medianEngagement = median(competitorEngagements);

  const topPosts = [...posts]
    .sort((a, b) => b.engagement_pct - a.engagement_pct)
    .slice(0, 3)
    .map((p) => ({
      format: p.format,
      likes: p.likes,
      comments: p.comments,
      engagement_pct: p.engagement_pct,
      caption_excerpt: p.caption ?? "",
    }));

  // R5: derive editorial_patterns once and pass into the OpenAI ctx so
  // insights can explain WHY, not just WHAT. Helper returns undefined when
  // nothing useful is available.
  const editorialPatternsForAi = buildEditorialPatternsForInsights(
    buildEditorialPatterns({
      profile,
      content_summary: summary,
      posts,
      format_stats: formatStats,
      ...(marketSignalsFree ? { market_signals_free: marketSignalsFree } : {}),
    } as unknown as Parameters<typeof buildEditorialPatterns>[0]),
    {
      posts,
      profile: {
        dominant_format: summary.dominant_format,
        average_engagement_rate: summary.average_engagement_rate,
      },
      competitors: { median_engagement_pct: medianEngagement },
    },
  );

  const ctx: InsightsContext = {
    profile,
    content_summary: summary,
    top_posts: topPosts,
    benchmark,
    competitors_summary: {
      count: successfulCompetitors.length,
      median_engagement_pct: medianEngagement,
    },
    market_signals: marketSignals,
    ...(editorialPatternsForAi
      ? { editorial_patterns: editorialPatternsForAi }
      : {}),
  };

  return { ctx, editorialPatternsForAi };
}
