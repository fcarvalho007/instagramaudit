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
import { computeCadence } from "@/lib/report/cadence";
import { extractTopHashtags } from "@/lib/report/text-extract";
import {
  buildCadenceLabelPt,
  classifyHashtagsState,
} from "@/lib/report/cadence-label";
import type {
  CompetitorAnalysis,
  PublicAnalysisContentSummary,
  PublicAnalysisProfile,
} from "@/lib/analysis/types";
import type { BenchmarkPositioning } from "@/lib/benchmark/types";
import type { PersistedMarketSignals } from "@/lib/market-signals/cache";
import type { InsightsContext } from "./types";
import type { CaptionSemanticAnalysis } from "@/lib/report/caption-semantic-types";
import type { VisualCoverAnalysis } from "@/lib/report/visual-cover-types";
import type { CommentIntelligence } from "@/lib/analysis/types";

/** Subset of the `EnrichedPost` shape the helper actually reads. */
type PostInput = {
  format: "Reels" | "Carrosséis" | "Imagens";
  likes: number;
  comments: number;
  engagement_pct: number;
  caption?: string | null;
  /** Extracted hashtags (lowercased, no leading `#`). Optional. */
  hashtags?: ReadonlyArray<string> | null;
  /** Unix seconds (matches EnrichedPost.taken_at). Optional. */
  taken_at?: number | null;
  /** ISO timestamp (matches EnrichedPost.taken_at_iso). Optional. */
  taken_at_iso?: string | null;
  /** Pinned-post flag (matches EnrichedPost.is_pinned). Optional. */
  is_pinned?: boolean | null;
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
  /**
   * Optional caption-semantic OpenAI analysis already persisted on the
   * snapshot. When `null/undefined`, the resulting ctx will NOT carry
   * `caption_intelligence` and the verdict prompt will not mention topics.
   */
  captionSemantic?: CaptionSemanticAnalysis | null;
  /**
   * Optional visual-cover OpenAI analysis already persisted on the
   * snapshot. When `null/undefined`, the resulting ctx will NOT carry
   * `visual_cover` and the validator rejects any visual claim in the
   * verdict paragraph.
   */
  visualCover?: VisualCoverAnalysis | null;
  /**
   * Optional comment-intelligence summary already persisted on the
   * snapshot. When `null/undefined` or all signals are zero, the
   * resulting ctx will NOT carry `comment_intelligence`.
   */
  commentIntelligence?: CommentIntelligence | null;
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
    captionSemantic,
    visualCover,
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

  // Most recent post timestamp (seconds) → days since last post. Used by
  // the editorial-verdict post-processor to flag `stale_data`. Defensive:
  // ignore posts without a valid timestamp.
  const nowSec = Math.floor(Date.now() / 1000);
  const validTimestamps = posts
    .map((p) => p.taken_at)
    .filter(
      (t): t is number => typeof t === "number" && Number.isFinite(t) && t > 0,
    );
  const daysSinceLastPost = validTimestamps.length
    ? Math.floor((nowSec - Math.max(...validTimestamps)) / 86_400)
    : null;

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

  // Top recurring hashtags + diagnostic state. Reuses the existing
  // deterministic extractor (lowercased, sorted by usage desc, ties
  // broken alphabetically). Limit to 5 rows: the prompt only quotes 2,
  // the rest is context for the model to reason about coverage.
  const hashtagRows = extractTopHashtags(
    posts.map((p) => ({
      hashtags: Array.isArray(p.hashtags) ? [...p.hashtags] : [],
      engagement_pct: p.engagement_pct,
    })),
    5,
  ).map((r) => ({ tag: r.tag, uses: r.uses }));
  const hashtagsState = classifyHashtagsState(hashtagRows);

  // Compute cadence once so the label can be derived from the same object.
  const cadenceRaw = computeCadence(
    posts.map((p) => ({
      taken_at_iso: p.taken_at_iso ?? null,
      taken_at: p.taken_at ?? null,
      is_pinned: p.is_pinned ?? false,
    })),
  );
  const cadence: InsightsContext["cadence"] = {
    method: cadenceRaw.method,
    sampleSize: cadenceRaw.sampleSize,
    sufficient: cadenceRaw.sufficient,
    weekly: cadenceRaw.sufficient ? cadenceRaw.weekly : null,
    windowDays: cadenceRaw.sufficient ? cadenceRaw.windowDays : null,
    pinnedExcluded: cadenceRaw.excludedPinned,
    reliability: cadenceRaw.reliability,
    note:
      !cadenceRaw.sufficient || cadenceRaw.reliability === "low"
        ? cadenceRaw.notePt
        : null,
  };

  const ctx: InsightsContext = {
    profile,
    content_summary: summary,
    cadence,
    top_posts: topPosts,
    benchmark,
    competitors_summary: {
      count: successfulCompetitors.length,
      median_engagement_pct: medianEngagement,
    },
    market_signals: marketSignals,
    days_since_last_post: daysSinceLastPost,
    top_hashtags: hashtagRows,
    hashtags_state: hashtagsState,
    cadence_label_pt: buildCadenceLabelPt({
      weekly: cadence.weekly,
      sufficient: cadence.sufficient,
    }),
    ...(editorialPatternsForAi
      ? { editorial_patterns: editorialPatternsForAi }
      : {}),
    ...(captionSemantic
      ? { caption_intelligence: deriveCaptionIntelligence(captionSemantic) }
      : {}),
    ...(visualCover
      ? { visual_cover: deriveVisualCoverSummary(visualCover) }
      : {}),
    ...(deriveCommentIntelligenceSummary(commentIntelligence ?? null)
      ? {
          comment_intelligence: deriveCommentIntelligenceSummary(
            commentIntelligence ?? null,
          )!,
        }
      : {}),
  };

  return { ctx, editorialPatternsForAi };
}

/**
 * Compact, prompt-safe view of `caption_semantic_analysis`. Defensive:
 * the upstream shape is OpenAI-generated and may have missing optional
 * blocks (`brandVoice`, `hookQuality`, `formulaicPatterns`). Returns
 * trimmed strings or `null`; the prompt is instructed to skip absent
 * fields silently.
 */
function deriveCaptionIntelligence(
  cs: CaptionSemanticAnalysis,
): NonNullable<InsightsContext["caption_intelligence"]> {
  const topics = Array.isArray(cs.dominantThemes)
    ? cs.dominantThemes
        .map((t) => (typeof t?.label === "string" ? t.label.trim() : ""))
        .filter((s) => s.length > 0)
        .slice(0, 3)
    : [];
  const hook =
    cs.hookQuality && typeof cs.hookQuality.rating === "string"
      ? `${cs.hookQuality.rating}${
          cs.hookQuality.explanation
            ? ` — ${cs.hookQuality.explanation.trim().slice(0, 120)}`
            : ""
        }`
      : null;
  const tone =
    cs.brandVoice && typeof cs.brandVoice.rating === "string"
      ? `${cs.brandVoice.rating}${
          cs.brandVoice.explanation
            ? ` — ${cs.brandVoice.explanation.trim().slice(0, 120)}`
            : ""
        }`
      : null;
  // Caption length pattern: prefer the formulaic pattern note when
  // present; falls back to null so the prompt does not invent.
  const lengthPattern =
    cs.formulaicPatterns && cs.formulaicPatterns.hasFormulas
      ? (cs.formulaicPatterns.explanation ?? "").trim().slice(0, 140) || null
      : null;
  return {
    topics,
    caption_length_pattern: lengthPattern,
    tone_summary: tone,
    hook_pattern: hook,
  };
}

/**
 * Compact view of `visual_cover_analysis`. Maps the `aggregate` +
 * `status` fields into the editorial vocabulary used by the verdict
 * prompt. `consistency` is derived from `repeatedTemplateCount`:
 *  - >= 4   → "consistent" (a true visual signature)
 *  - 1..3   → "mixed"
 *  - 0      → "inconsistent"
 */
function deriveVisualCoverSummary(
  v: VisualCoverAnalysis,
): NonNullable<InsightsContext["visual_cover"]> {
  const repeated = v.aggregate?.repeatedTemplateCount ?? 0;
  const consistency: "consistent" | "mixed" | "inconsistent" | null =
    repeated >= 4 ? "consistent" : repeated >= 1 ? "mixed" : "inconsistent";
  return {
    summary: (v.summary ?? "").trim().slice(0, 240),
    consistency,
    visual_clarity: v.status,
    cover_pattern: v.aggregate?.repeatedTemplateNote
      ? v.aggregate.repeatedTemplateNote.trim().slice(0, 200)
      : null,
  };
}
