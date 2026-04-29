/**
 * One-off OpenAI-only validation script.
 *
 * Loads snapshot b2d453cd-c269-407b-8a83-720e4f2baa50, rebuilds the same
 * InsightsContext production uses, and calls generateInsights() exactly
 * once with OPENAI_INSIGHTS_MODEL=gpt-5.4-mini.
 *
 * Does NOT persist ai_insights_v1 back to the snapshot. Does NOT call
 * Apify or DataForSEO. Provider call log row will be created by the
 * production helper itself (one OpenAI row).
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { computeBenchmarkPositioning } from "@/lib/benchmark/engine";
import { loadBenchmarkReferences } from "@/lib/benchmark/reference-data.server";
import type { BenchmarkPositioning } from "@/lib/benchmark/types";
import type { GoogleTrendsResult } from "@/lib/dataforseo/endpoints/google-trends";
import { generateInsights } from "@/lib/insights/openai-insights.server";
import type { InsightsContext } from "@/lib/insights/types";
import type { PersistedMarketSignals } from "@/lib/market-signals/cache";

const SNAPSHOT_ID = "b2d453cd-c269-407b-8a83-720e4f2baa50";

// Inline copy of summarizeMarketSignalsForInsights from analyze-public-v1.ts
// (read-only behaviour; used here to avoid touching production code).
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

  if (topKeywords.length === 0) {
    return { has_free: false, has_paid: false };
  }

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

async function main() {
  console.log(`[validate] OPENAI_INSIGHTS_MODEL=${process.env.OPENAI_INSIGHTS_MODEL ?? "(unset → default)"}`);
  console.log(`[validate] OPENAI_ENABLED=${process.env.OPENAI_ENABLED}`);

  const { data: row, error } = await supabaseAdmin
    .from("analysis_snapshots")
    .select("id, instagram_username, normalized_payload")
    .eq("id", SNAPSHOT_ID)
    .single();
  if (error || !row) throw new Error(`snapshot fetch failed: ${error?.message}`);

  const np = row.normalized_payload as Record<string, unknown>;
  const profile = np.profile as InsightsContext["profile"];
  const contentSummary = np.content_summary as InsightsContext["content_summary"];
  const posts = (np.posts as Array<Record<string, unknown>>) ?? [];
  const ms = (np.market_signals_free as PersistedMarketSignals | null) ?? null;

  console.log(`[validate] snapshot=${row.id} handle=${row.instagram_username} posts=${posts.length}`);

  // Top 3 posts by engagement_pct (mirror production)
  const topPosts = [...posts]
    .map((p) => ({
      format: p.format as "Reels" | "Carrosséis" | "Imagens",
      likes: Number(p.likes ?? 0),
      comments: Number(p.comments ?? 0),
      engagement_pct: Number(p.engagement_pct ?? 0),
      caption_excerpt: String(p.caption ?? ""),
    }))
    .sort((a, b) => b.engagement_pct - a.engagement_pct)
    .slice(0, 3);

  // Resolve benchmark from the live reference table (same as production).
  let benchmark: BenchmarkPositioning | null = null;
  try {
    const refs = await loadBenchmarkReferences();
    benchmark = computeBenchmarkPositioning(
      {
        followers: profile.followers_count,
        engagement: contentSummary.average_engagement_rate,
        dominantFormat: contentSummary.dominant_format,
      },
      refs,
    );
    console.log(`[validate] benchmark.status=${benchmark?.status ?? "(none)"}`);
  } catch (e) {
    console.warn(`[validate] benchmark resolve failed: ${(e as Error).message}`);
  }

  const market_signals = summarizeMarketSignalsForInsights(ms);
  console.log(`[validate] market_signals=`, JSON.stringify(market_signals, null, 2));

  const ctx: InsightsContext = {
    profile,
    content_summary: contentSummary,
    top_posts: topPosts,
    benchmark,
    competitors_summary: { count: 0, median_engagement_pct: null },
    market_signals,
  };

  console.log(`[validate] calling generateInsights() … (one OpenAI request)`);
  const result = await generateInsights(ctx);

  console.log("\n========== RESULT ==========");
  console.log(JSON.stringify(result, null, 2));

  if (result.ok && result.insights) {
    const ai = result.insights;
    console.log("\n========== SUMMARY ==========");
    console.log(`model: ${ai.model}`);
    console.log(`insights_count: ${ai.insights.length}`);
    console.log(`tokens: prompt=${ai.cost.prompt_tokens} completion=${ai.cost.completion_tokens} total=${ai.cost.total_tokens}`);
    console.log(`estimated_cost_usd: ${ai.cost.estimated_cost_usd}`);
    console.log(`has_market_signals_flag: ${ai.source_signals.has_market_signals}`);
    for (const it of ai.insights) {
      console.log(`  [${it.priority}] ${it.id} — "${it.title}"`);
      console.log(`     body: ${it.body}`);
      console.log(`     evidence: ${JSON.stringify(it.evidence)}`);
    }
  }
}

main().catch((e) => {
  console.error("VALIDATION FAILED:", e);
  process.exit(1);
});
