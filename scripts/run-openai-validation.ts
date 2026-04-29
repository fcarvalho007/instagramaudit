/**
 * One-shot OpenAI-only validation. NOT production code. Will be deleted
 * immediately after use. Does not modify analysis_snapshots.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateInsights } from "@/lib/insights/openai-insights.server";
import { computeBenchmarkPositioning } from "@/lib/benchmark/engine";
import { loadBenchmarkReferences } from "@/lib/benchmark/reference-data.server";
import type { InsightsContext } from "@/lib/insights/types";
import type { GoogleTrendsResult } from "@/lib/dataforseo/market-signals";
import type { PersistedMarketSignals } from "@/lib/market-signals/cache";

const SNAPSHOT_ID = "b2d453cd-c269-407b-8a83-720e4f2baa50";

// Inlined copy of summarizeMarketSignalsForInsights (production code untouched).
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
          sums[i] += v; counts[i] += 1;
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
    const strong = table.filter((t) => t.mean > 0).sort((a, b) => b.mean - a.mean);
    topKeywords = strong.slice(0, 5).map((t) => t.keyword);
    zeroSignal = table.filter((t) => t.mean === 0).slice(0, 5).map((t) => t.keyword);
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
        } else if (tailMean > 0) { direction = "up"; trendDeltaPct = 100; }
        else { direction = "flat"; trendDeltaPct = 0; }
      }
    }
  }
  if (topKeywords.length === 0) return { has_free: false, has_paid: false };
  return {
    has_free: true, has_paid: false,
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

const TECH_LEAK_PATTERNS = [
  "engagement_pct", "tier_label", "cache_key", "normalized_payload",
  "snapshot_id", "trends_usable_keywords", "ai_insights_v1",
  "content_summary", "market_signals_free", "average_engagement_rate",
  "dominant_format", "followers_count",
];

async function main() {
  const startTs = new Date().toISOString();

  // 1. Fetch snapshot
  const { data: snap, error: snapErr } = await supabaseAdmin
    .from("analysis_snapshots")
    .select("id, instagram_username, normalized_payload, updated_at")
    .eq("id", SNAPSHOT_ID)
    .single();
  if (snapErr || !snap) throw new Error(`snapshot not found: ${snapErr?.message}`);
  const updatedAtBefore = snap.updated_at;
  const np = snap.normalized_payload as Record<string, unknown>;
  if ("ai_insights_v1" in np) throw new Error("snapshot already has ai_insights_v1; aborting");

  const profile = np.profile as InsightsContext["profile"];
  const contentSummary = np.content_summary as InsightsContext["content_summary"];
  const posts = (np.posts as Array<Record<string, unknown>>) ?? [];
  const competitors = (np.competitors as Array<Record<string, unknown>>) ?? [];
  const marketSignalsFree = (np.market_signals_free as PersistedMarketSignals | undefined) ?? null;

  // 2. Top 3 posts by engagement_pct
  const topPosts = [...posts]
    .filter((p) => typeof p.engagement_pct === "number")
    .sort((a, b) => (b.engagement_pct as number) - (a.engagement_pct as number))
    .slice(0, 3)
    .map((p) => ({
      format: p.format as "Reels" | "Carrosséis" | "Imagens",
      likes: Number(p.likes ?? 0),
      comments: Number(p.comments ?? 0),
      engagement_pct: Number(p.engagement_pct ?? 0),
      caption_excerpt: ((p.caption as string | null) ?? "").slice(0, 280),
    }));

  // 3. Benchmark
  const benchmarkData = await loadBenchmarkReferences();
  const benchmark = computeBenchmarkPositioning(
    {
      followers: profile.followers_count,
      engagement: contentSummary.average_engagement_rate,
      dominantFormat: contentSummary.dominant_format,
    },
    benchmarkData,
  );

  // 4. Competitors summary
  const successfulComp = competitors.filter((c) => c && (c as { success?: boolean }).success === true);
  const compEngs = successfulComp
    .map((c) => Number(((c as { content_summary?: { average_engagement_rate?: number } }).content_summary)?.average_engagement_rate))
    .filter((n) => Number.isFinite(n) && n > 0);
  let median: number | null = null;
  if (compEngs.length > 0) {
    const sorted = [...compEngs].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }

  // 5. Market signals
  const marketSignals = summarizeMarketSignalsForInsights(marketSignalsFree);

  const ctx: InsightsContext = {
    profile,
    content_summary: contentSummary,
    top_posts: topPosts,
    benchmark,
    competitors_summary: { count: successfulComp.length, median_engagement_pct: median },
    market_signals: marketSignals,
  };

  // 6. Single OpenAI call
  const result = await generateInsights(ctx);

  // 7. Find provider_call_log row created during this run
  const { data: logRows } = await supabaseAdmin
    .from("provider_call_logs")
    .select("id, status, model, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd, http_status, created_at")
    .eq("provider", "openai")
    .eq("handle", profile.username.toLowerCase())
    .gte("created_at", startTs)
    .order("created_at", { ascending: false })
    .limit(1);
  const logRow = logRows?.[0] ?? null;

  // 8. Confirm snapshot not modified
  const { data: snapAfter } = await supabaseAdmin
    .from("analysis_snapshots")
    .select("updated_at, normalized_payload")
    .eq("id", SNAPSHOT_ID)
    .single();
  const stillNoInsights = snapAfter && !((snapAfter.normalized_payload as Record<string, unknown>) ?? {}).hasOwnProperty("ai_insights_v1");
  const updatedAtUnchanged = snapAfter?.updated_at === updatedAtBefore;

  // 9. Leak scan
  let leak = false;
  const leakHits: string[] = [];
  if (result.ok && result.insights) {
    for (const ins of result.insights.insights) {
      const text = `${ins.title}\n${ins.body}`.toLowerCase();
      for (const pat of TECH_LEAK_PATTERNS) {
        if (text.includes(pat.toLowerCase())) { leak = true; leakHits.push(`${ins.id}:${pat}`); }
      }
    }
  }

  const evidencePaths = result.ok && result.insights
    ? Array.from(new Set(result.insights.insights.flatMap((i) => i.evidence)))
    : [];
  const titles = result.ok && result.insights ? result.insights.insights.map((i) => i.title) : [];
  const marketEvidenceUsed = evidencePaths.some((p) => p.toLowerCase().includes("market"));

  const report = {
    snapshot_used: SNAPSHOT_ID,
    handle: profile.username,
    openai_only_call_made: !!logRow,
    resolved_model: result.insights?.model ?? null,
    model_returned_by_provider: result.insights?.model ?? null,
    provider_call_log_id: logRow?.id ?? null,
    provider_call_log_status: logRow?.status ?? null,
    provider_call_log_http_status: logRow?.http_status ?? null,
    validator_result: { ok: result.ok, reason: result.reason, detail: result.detail ?? null },
    number_of_insights: result.insights?.insights.length ?? 0,
    insight_titles: titles,
    market_evidence_used: marketEvidenceUsed,
    evidence_paths_used: evidencePaths,
    prompt_tokens: result.insights?.cost.prompt_tokens ?? logRow?.prompt_tokens ?? 0,
    cached_tokens: 0, // not separately persisted; see usage block below
    completion_tokens: result.insights?.cost.completion_tokens ?? logRow?.completion_tokens ?? 0,
    total_tokens: result.insights?.cost.total_tokens ?? logRow?.total_tokens ?? 0,
    estimated_cost_usd: result.insights?.cost.estimated_cost_usd ?? Number(logRow?.estimated_cost_usd ?? 0),
    technical_token_leakage_in_title_or_body: leak,
    technical_token_leakage_hits: leakHits,
    snapshot_modified: !(updatedAtUnchanged && stillNoInsights),
    ready_for_full_fresh_smoke_test: result.ok && !leak,
    ctx_summary: {
      followers: profile.followers_count,
      avg_engagement_pct: contentSummary.average_engagement_rate,
      dominant_format: contentSummary.dominant_format,
      top_posts_count: topPosts.length,
      benchmark_status: benchmark.status,
      market_signals_has_free: marketSignals.has_free,
      market_signals_strongest: marketSignals.strongest_keyword ?? null,
      market_signals_top_keywords: marketSignals.top_keywords ?? [],
    },
  };
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error("FATAL", err);
  process.exit(1);
});
