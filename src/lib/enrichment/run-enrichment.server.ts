/**
 * Enrichment runner (server-only).
 *
 * Standalone functions for each enrichment type, extracted from the
 * monolithic analyze-public-v1 handler. Each returns an EnrichmentResult
 * with a payload patch to merge into the snapshot.
 *
 * All functions are best-effort: they never throw. Failures are folded
 * into the result so the caller can mark the job as `error`.
 */

import type { EnrichmentResult, EnrichmentType } from "./types";
import type { SnapshotRow } from "@/lib/analysis/cache";
import type { SnapshotPayload } from "@/lib/report/snapshot-to-report-data";
import type {
  CompetitorAnalysis,
  PublicAnalysisContentSummary,
  PublicAnalysisProfile,
} from "@/lib/analysis/types";
import type { AiInsightsV1, AiInsightsV2, InsightsContext } from "@/lib/insights/types";
import type { VisualCoverAnalysis } from "@/lib/report/visual-cover-types";
import type { CaptionSemanticAnalysis } from "@/lib/report/caption-semantic-types";
import type { PersistedMarketSignals } from "@/lib/market-signals/cache";
import type { BenchmarkPositioning } from "@/lib/benchmark/types";
import type { GoogleTrendsResult } from "@/lib/dataforseo/endpoints/google-trends";

import {
  isDataForSeoEnabled,
  isAllowed as isDfsAllowed,
} from "@/lib/security/dataforseo-allowlist";
import { isOpenAiAllowed } from "@/lib/security/openai-allowlist";
import {
  assertOpenAiDailyBudgetAvailable,
  OpenAiBudgetExceededError,
} from "@/lib/security/openai-budget.server";
import { buildMarketSignals } from "@/lib/dataforseo/market-signals";
import {
  buildPersistedSummary,
  decideCacheTtlSeconds,
  readCachedSummary,
} from "@/lib/market-signals/cache";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  generateInsights,
  generateInsightsV2,
} from "@/lib/insights/openai-insights.server";
import { generateVisualCoverAnalysis } from "@/lib/report/visual-cover-analysis.server";
import { generateCaptionSemanticAnalysis } from "@/lib/report/caption-semantic-analysis.server";
import { buildInsightsCtx } from "@/lib/insights/build-context";
import { computeBenchmarkPositioning } from "@/lib/benchmark/engine";
import { loadBenchmarkReferences } from "@/lib/benchmark/reference-data.server";
import { generateComparisonReadingsForSnapshot } from "@/lib/comparison-readings/generate.server";

const LOG = "[enrichment]";

/** Context derived from the snapshot payload for enrichment functions. */
interface SnapshotContext {
  profile: PublicAnalysisProfile;
  summary: PublicAnalysisContentSummary;
  posts: Array<Record<string, unknown>>;
  formatStats: Record<string, unknown>;
  competitors: CompetitorAnalysis[];
  marketSignalsFree: PersistedMarketSignals | null;
  previousPayload: Record<string, unknown>;
}

/** Extract structured context from a raw snapshot payload. */
function extractContext(payload: Record<string, unknown>): SnapshotContext {
  return {
    profile: payload.profile as PublicAnalysisProfile,
    summary: payload.content_summary as PublicAnalysisContentSummary,
    posts: Array.isArray(payload.posts) ? payload.posts as Array<Record<string, unknown>> : [],
    formatStats: (payload.format_stats ?? {}) as Record<string, unknown>,
    competitors: Array.isArray(payload.competitors) ? payload.competitors as CompetitorAnalysis[] : [],
    marketSignalsFree: (payload.market_signals_free as PersistedMarketSignals | undefined) ?? null,
    previousPayload: payload,
  };
}

/**
 * Dispatch to the correct enrichment function based on type.
 */
export async function runEnrichment(
  type: EnrichmentType,
  snapshot: SnapshotRow,
  analysisEventId: string | null,
): Promise<EnrichmentResult> {
  const payload = snapshot.normalized_payload as Record<string, unknown>;
  const ctx = extractContext(payload);

  switch (type) {
    case "dataforseo":
      return runDataForSeo(ctx, analysisEventId);
    case "insights_v1":
      return runInsightsV1(ctx, analysisEventId);
    case "insights_v2":
      return runInsightsV2(ctx, analysisEventId);
    case "visual_cover":
      return runVisualCover(ctx, analysisEventId);
    case "caption_semantic":
      return runCaptionSemantic(ctx, analysisEventId);
    case "comparison_readings":
      return runComparisonReadings(ctx);
    default:
      return { ok: false, payloadPatch: null, error: `unknown type: ${type}` };
  }
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Comparison readings (AI editorial readings, Profile vs Competitor)        */
/* ────────────────────────────────────────────────────────────────────────── */

async function runComparisonReadings(
  ctx: SnapshotContext,
): Promise<EnrichmentResult> {
  try {
    const usable = ctx.competitors.filter(
      (c) => c && (c as { success?: boolean }).success !== false,
    );
    if (usable.length === 0) {
      console.info(`${LOG} comparison_readings: no usable competitor — skipping`);
      return { ok: true, payloadPatch: null };
    }
    return await generateComparisonReadingsForSnapshot(
      ctx.previousPayload as Record<string, unknown>,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`${LOG} comparison_readings threw`, msg);
    return { ok: false, payloadPatch: null, error: msg };
  }
}

/* ────────────────────────────────────────────────────────────────────────── */
/* DataForSEO                                                                */
/* ────────────────────────────────────────────────────────────────────────── */

async function runDataForSeo(
  ctx: SnapshotContext,
  analysisEventId: string | null,
): Promise<EnrichmentResult> {
  try {
    if (!isDataForSeoEnabled()) {
      console.info(`${LOG} DataForSEO disabled — skipping`);
      return { ok: true, payloadPatch: null };
    }
    if (!isDfsAllowed(ctx.profile.username)) {
      console.info(`${LOG} handle not on DataForSEO allowlist — skipping`, ctx.profile.username);
      return { ok: true, payloadPatch: null };
    }

    // Check if already cached in the snapshot
    const cached = readCachedSummary(ctx.previousPayload, "free");
    if (cached) {
      console.info(`${LOG} DataForSEO already cached in snapshot`);
      return { ok: true, payloadPatch: null };
    }

    const dfsStartedAt = new Date();
    const tentativeSnapshot = {
      profile: ctx.profile,
      content_summary: ctx.summary,
      competitors: ctx.competitors,
      posts: ctx.posts,
      format_stats: ctx.formatStats,
    } as unknown as SnapshotPayload;

    const result = await buildMarketSignals(tentativeSnapshot, {
      ownerHandle: ctx.profile.username,
      plan: "free",
      totalTimeoutMs: 20_000,
    });

    // Collect provider cost
    let providerCostUsd = 0;
    let providerCallLogIds: string[] = [];
    try {
      const { data: logs } = await supabaseAdmin
        .from("provider_call_logs")
        .select("id, actual_cost_usd")
        .eq("provider", "dataforseo")
        .eq("handle", ctx.profile.username.toLowerCase())
        .gte("created_at", dfsStartedAt.toISOString());
      if (Array.isArray(logs)) {
        providerCallLogIds = logs.map((l) => l.id as string);
        providerCostUsd = logs.reduce(
          (sum, l) => sum + (typeof l.actual_cost_usd === "number" ? l.actual_cost_usd : 0),
          0,
        );
      }
    } catch (err) {
      console.warn(`${LOG} failed to read dataforseo provider_call_logs`, err);
    }

    const ttl = decideCacheTtlSeconds(result);
    if (ttl !== null) {
      const summary = buildPersistedSummary({
        result,
        plan: "free",
        ttlSeconds: ttl,
        providerCostUsd,
        providerCallLogIds,
        now: dfsStartedAt,
      });
      return { ok: true, payloadPatch: { market_signals_free: summary } };
    }

    return { ok: true, payloadPatch: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`${LOG} DataForSEO threw`, msg);
    return { ok: false, payloadPatch: null, error: msg };
  }
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Helper: build InsightsContext from snapshot data                           */
/* ────────────────────────────────────────────────────────────────────────── */

function summarizeMarketSignalsForInsights(
  ms: PersistedMarketSignals | null,
): InsightsContext["market_signals"] {
  if (!ms) return { has_free: false, has_paid: false };
  const usable = ms.status === "ready" || ms.status === "partial";
  if (!usable) return { has_free: false, has_paid: false };

  const usableRaw = ms.trends_usable_keywords ?? [];
  const dropped = (ms.trends_dropped_keywords ?? []).slice(0, 5);

  const trends = ms.trends as GoogleTrendsResult | null;
  let strongest: string | null = null;
  let strongestScore: number | null = null;
  let direction: "up" | "flat" | "down" | null = null;
  let trendDeltaPct: number | null = null;
  let topKeywords: string[] = usableRaw.slice(0, 5);
  let zeroSignal: string[] = [];

  const graph = trends?.items?.find(
    (it) => Array.isArray(it.keywords) && Array.isArray(it.data),
  );
  if (graph?.keywords && graph.data) {
    const kws = graph.keywords;
    const sums = new Array<number>(kws.length).fill(0);
    const counts = new Array<number>(kws.length).fill(0);
    for (const row of graph.data) {
      const values = Array.isArray(row.values) ? row.values : [];
      for (let i = 0; i < kws.length; i += 1) {
        const v = values[i];
        if (typeof v === "number" && Number.isFinite(v)) {
          sums[i] += v;
          counts[i] += 1;
        }
      }
    }
    const usableSet = new Set(usableRaw);
    const table: Array<{ keyword: string; mean: number }> = [];
    for (let i = 0; i < kws.length; i += 1) {
      if (!usableSet.has(kws[i])) continue;
      const mean = counts[i] > 0 ? sums[i] / counts[i] : 0;
      table.push({ keyword: kws[i], mean });
    }
    const strong = table
      .filter((t) => t.mean > 0)
      .sort((a, b) => b.mean - a.mean);
    topKeywords = strong.slice(0, 5).map((t) => t.keyword);
    zeroSignal = table
      .filter((t) => t.mean === 0)
      .slice(0, 5)
      .map((t) => t.keyword);

    const bestIdx = strong.length > 0 ? kws.indexOf(strong[0].keyword) : -1;
    if (bestIdx >= 0) {
      strongest = kws[bestIdx];
      strongestScore = Math.round(strong[0].mean);
      const series: number[] = [];
      for (const row of graph.data) {
        const v = row.values?.[bestIdx];
        if (typeof v === "number" && Number.isFinite(v)) series.push(v);
      }
      if (series.length >= 8) {
        const window = Math.max(4, Math.floor(series.length / 4));
        const head = series.slice(0, window);
        const tail = series.slice(-window);
        const headMean = head.reduce((a, b) => a + b, 0) / head.length;
        const tailMean = tail.reduce((a, b) => a + b, 0) / tail.length;
        if (headMean > 0) {
          const delta = (tailMean - headMean) / headMean;
          trendDeltaPct = Math.round(delta * 100);
          if (delta > 0.05) direction = "up";
          else if (delta < -0.05) direction = "down";
          else direction = "flat";
        } else if (tailMean > 0) {
          direction = "up";
          trendDeltaPct = 100;
        } else {
          direction = "flat";
          trendDeltaPct = 0;
        }
      }
    }
  }

  if (topKeywords.length === 0) return { has_free: false, has_paid: false };

  return {
    has_free: true,
    has_paid: false,
    top_keywords: topKeywords,
    strongest_keyword: strongest,
    strongest_score: strongestScore,
    trend_direction: direction,
    trend_delta_pct: trendDeltaPct,
    usable_keyword_count: topKeywords.length,
    zero_signal_keywords: zeroSignal,
    dropped_keywords: dropped,
  };
}

async function buildCtxForInsights(ctx: SnapshotContext): Promise<{
  insightsCtx: InsightsContext;
  benchmark: BenchmarkPositioning;
}> {
  const benchmarkData = await loadBenchmarkReferences();
  const benchmark = computeBenchmarkPositioning(
    {
      followers: ctx.profile.followers_count,
      engagement: ctx.summary.average_engagement_rate,
      dominantFormat: ctx.summary.dominant_format,
    },
    benchmarkData,
  );

  // Re-read market signals from payload (may have been patched by DFS enrichment)
  const msFree = ctx.marketSignalsFree;

  const { ctx: insightsCtx } = buildInsightsCtx({
    profile: ctx.profile,
    summary: ctx.summary,
    posts: ctx.posts as any,
    formatStats: ctx.formatStats as any,
    marketSignalsFree: msFree,
    competitorResults: ctx.competitors,
    benchmark,
    marketSignals: summarizeMarketSignalsForInsights(msFree),
    captionSemantic:
      (ctx.previousPayload.caption_semantic_analysis as
        | CaptionSemanticAnalysis
        | undefined) ?? null,
    visualCover:
      (ctx.previousPayload.visual_cover_analysis as
        | VisualCoverAnalysis
        | undefined) ?? null,
  });

  return { insightsCtx, benchmark };
}

/* ────────────────────────────────────────────────────────────────────────── */
/* OpenAI Insights v1                                                        */
/* ────────────────────────────────────────────────────────────────────────── */

async function runInsightsV1(
  ctx: SnapshotContext,
  analysisEventId: string | null,
): Promise<EnrichmentResult> {
  try {
    if (!isOpenAiAllowed(ctx.profile.username)) {
      return { ok: true, payloadPatch: null };
    }
    try {
      await assertOpenAiDailyBudgetAvailable();
    } catch (err) {
      if (err instanceof OpenAiBudgetExceededError) {
        console.warn(`${LOG} insights_v1 skipped — daily OpenAI budget exhausted`, {
          spent: err.spentUsd, cap: err.capUsd,
        });
        return { ok: true, payloadPatch: null };
      }
      throw err;
    }
    // Skip if already present
    if (ctx.previousPayload.ai_insights_v1) {
      console.info(`${LOG} insights_v1 already present — skipping`);
      return { ok: true, payloadPatch: null };
    }

    const { insightsCtx } = await buildCtxForInsights(ctx);
    const result = await generateInsights(insightsCtx, {
      analysisEventId: analysisEventId ?? undefined,
    });

    if (result.ok && result.insights) {
      return { ok: true, payloadPatch: { ai_insights_v1: result.insights } };
    }
    if (result.reason === "DISABLED" || result.reason === "NOT_ALLOWED") {
      return { ok: true, payloadPatch: null };
    }
    return { ok: false, payloadPatch: null, error: result.reason ?? "unknown" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`${LOG} insights_v1 threw`, msg);
    return { ok: false, payloadPatch: null, error: msg };
  }
}

/* ────────────────────────────────────────────────────────────────────────── */
/* OpenAI Insights v2                                                        */
/* ────────────────────────────────────────────────────────────────────────── */

async function runInsightsV2(
  ctx: SnapshotContext,
  analysisEventId: string | null,
): Promise<EnrichmentResult> {
  try {
    if (!isOpenAiAllowed(ctx.profile.username)) {
      return { ok: true, payloadPatch: null };
    }
    try {
      await assertOpenAiDailyBudgetAvailable();
    } catch (err) {
      if (err instanceof OpenAiBudgetExceededError) {
        console.warn(`${LOG} insights_v2 skipped — daily OpenAI budget exhausted`, {
          spent: err.spentUsd, cap: err.capUsd,
        });
        return { ok: true, payloadPatch: null };
      }
      throw err;
    }
    if (ctx.previousPayload.ai_insights_v2) {
      console.info(`${LOG} insights_v2 already present — skipping`);
      return { ok: true, payloadPatch: null };
    }

    const previousV2 = (ctx.previousPayload.ai_insights_v2 as AiInsightsV2 | undefined) ?? null;
    const { insightsCtx } = await buildCtxForInsights(ctx);
    const result = await generateInsightsV2(insightsCtx, {
      previous: previousV2,
      analysisEventId: analysisEventId ?? undefined,
    });

    if (result.ok && result.insights) {
      return { ok: true, payloadPatch: { ai_insights_v2: result.insights } };
    }
    if (result.reason === "DISABLED" || result.reason === "NOT_ALLOWED") {
      return { ok: true, payloadPatch: null };
    }
    return { ok: false, payloadPatch: null, error: result.reason ?? "unknown" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`${LOG} insights_v2 threw`, msg);
    return { ok: false, payloadPatch: null, error: msg };
  }
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Visual Cover Analysis                                                     */
/* ────────────────────────────────────────────────────────────────────────── */

async function runVisualCover(
  ctx: SnapshotContext,
  analysisEventId: string | null,
): Promise<EnrichmentResult> {
  try {
    if (!isOpenAiAllowed(ctx.profile.username)) {
      return { ok: true, payloadPatch: null };
    }
    try {
      await assertOpenAiDailyBudgetAvailable();
    } catch (err) {
      if (err instanceof OpenAiBudgetExceededError) {
        console.warn(`${LOG} visual_cover skipped — daily OpenAI budget exhausted`, {
          spent: err.spentUsd, cap: err.capUsd,
        });
        return { ok: true, payloadPatch: null };
      }
      throw err;
    }
    // Skip if already present
    const existing = ctx.previousPayload.visual_cover_analysis;
    if (
      existing &&
      typeof existing === "object" &&
      typeof (existing as Record<string, unknown>).overallScore === "number"
    ) {
      console.info(`${LOG} visual_cover already present — skipping`);
      return { ok: true, payloadPatch: null };
    }

    const thumbPosts = ctx.posts
      .filter((p) => typeof p.thumbnail_url === "string" && (p.thumbnail_url as string).length > 0)
      .slice(0, 12);

    if (thumbPosts.length === 0) {
      return { ok: true, payloadPatch: null };
    }

    // Prefer pre-cached base64 thumbnails (CDN URLs expire before async runs)
    const base64Map = (ctx.previousPayload._thumbnail_base64 ?? {}) as Record<string, string>;

    const result = await generateVisualCoverAnalysis({
      handle: ctx.profile.username,
      thumbnailUrls: thumbPosts.map((p) => {
        const cdnUrl = p.thumbnail_url as string;
        return base64Map[cdnUrl] ?? cdnUrl;
      }),
      postIds: thumbPosts.map((p) => (p.id ?? p.shortcode ?? "") as string),
      analysisEventId: analysisEventId ?? undefined,
    });

    if (result.ok && result.analysis) {
      return { ok: true, payloadPatch: { visual_cover_analysis: result.analysis } };
    }
    if (result.reason === "DISABLED" || result.reason === "NOT_ALLOWED") {
      return { ok: true, payloadPatch: null };
    }
    return { ok: false, payloadPatch: null, error: result.reason ?? "unknown" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`${LOG} visual_cover threw`, msg);
    return { ok: false, payloadPatch: null, error: msg };
  }
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Caption Semantic Analysis                                                 */
/* ────────────────────────────────────────────────────────────────────────── */

async function runCaptionSemantic(
  ctx: SnapshotContext,
  analysisEventId: string | null,
): Promise<EnrichmentResult> {
  try {
    if (!isOpenAiAllowed(ctx.profile.username)) {
      return { ok: true, payloadPatch: null };
    }
    try {
      await assertOpenAiDailyBudgetAvailable();
    } catch (err) {
      if (err instanceof OpenAiBudgetExceededError) {
        console.warn(`${LOG} caption_semantic skipped — daily OpenAI budget exhausted`, {
          spent: err.spentUsd, cap: err.capUsd,
        });
        return { ok: true, payloadPatch: null };
      }
      throw err;
    }
    // Skip if already present
    const existing = ctx.previousPayload.caption_semantic_analysis;
    if (
      existing &&
      typeof existing === "object" &&
      typeof (existing as Record<string, unknown>).source === "string" &&
      (existing as Record<string, unknown>).schemaVersion === 2
    ) {
      console.info(`${LOG} caption_semantic already present — skipping`);
      return { ok: true, payloadPatch: null };
    }

    const captionTexts = ctx.posts
      .filter((p) => typeof p.caption === "string" && (p.caption as string).trim().length > 0)
      .slice(0, 12)
      .map((p) => p.caption as string);

    if (captionTexts.length < 4) {
      return { ok: true, payloadPatch: null };
    }

    const result = await generateCaptionSemanticAnalysis({
      handle: ctx.profile.username,
      captions: captionTexts,
      analysisEventId: analysisEventId ?? undefined,
    });

    if (result.ok && result.analysis) {
      return { ok: true, payloadPatch: { caption_semantic_analysis: result.analysis } };
    }
    if (result.reason === "DISABLED" || result.reason === "NOT_ALLOWED") {
      return { ok: true, payloadPatch: null };
    }
    return { ok: false, payloadPatch: null, error: result.reason ?? "unknown" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`${LOG} caption_semantic threw`, msg);
    return { ok: false, payloadPatch: null, error: msg };
  }
}