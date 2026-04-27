/**
 * Market signals orchestrator (server-only).
 *
 * Builds a non-blocking "Sinais de Mercado" enrichment for an Instagram
 * report by calling 1..N DataForSEO endpoints based on the plan.
 *
 * Contract:
 *   - NEVER throws. Returns a typed status envelope so the caller can
 *     render the UI fallback without try/catch noise.
 *   - Each DataForSEO call has its own short timeout (handled by the
 *     client). The whole orchestration is wrapped in `Promise.race` against
 *     a hard timeout chosen by the caller (default 60s).
 *   - Endpoint selection is plan-driven and capped by
 *     `DATAFORSEO_MAX_QUERIES_FREE/PAID`.
 *
 * Endpoints used:
 *   free  → 1 × Google Trends (multi-keyword, single call)
 *   paid  → 1 × Trends + 1 × Keyword Ideas + up to 3 × SERP Organic
 */
import type { SnapshotPayload } from "@/lib/report/snapshot-to-report-data";
import { deriveKeywordsFromSnapshot } from "./derive-keywords";
import {
  fetchGoogleTrends,
  type GoogleTrendsResult,
} from "./endpoints/google-trends";
import {
  fetchKeywordIdeas,
  type KeywordIdeasResult,
} from "./endpoints/keyword-ideas";
import {
  fetchSerpOrganic,
  type SerpOrganicResult,
} from "./endpoints/serp-organic";
import { maxQueriesFor, type MarketSignalsPlan } from "./plan-limits";

export type MarketSignalsStatus =
  | "ready"
  | "disabled"
  | "blocked"
  | "no_keywords"
  | "timeout"
  | "error";

export interface MarketSignalsOk {
  status: "ready";
  plan: MarketSignalsPlan;
  keywords: string[];
  trends?: GoogleTrendsResult | null;
  keyword_ideas?: KeywordIdeasResult | null;
  serp?: Array<{ keyword: string; result: SerpOrganicResult | null }>;
  queries_used: number;
  queries_cap: number;
  errors: Array<{ source: string; message: string }>;
}

export interface MarketSignalsFail {
  status: Exclude<MarketSignalsStatus, "ready">;
  plan: MarketSignalsPlan;
  message: string;
}

export type MarketSignalsResult = MarketSignalsOk | MarketSignalsFail;

export interface BuildMarketSignalsOptions {
  /**
   * Instagram report owner. Propagated to every DataForSEO call as the
   * single value matched against `DATAFORSEO_ALLOWLIST`. Derived keywords
   * are NEVER used as a gate.
   */
  ownerHandle: string;
  plan: MarketSignalsPlan;
  /** Hard cap for the whole orchestration. Default 60_000 ms. */
  totalTimeoutMs?: number;
}

function timeoutPromise(ms: number, plan: MarketSignalsPlan): Promise<MarketSignalsFail> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        status: "timeout",
        plan,
        message: "DataForSEO excedeu o tempo limite.",
      });
    }, ms);
  });
}

function firstResultOrNull<T>(envelope: { tasks?: Array<{ result: T[] | null }> } | null | undefined): T | null {
  const r = envelope?.tasks?.[0]?.result;
  if (Array.isArray(r) && r.length > 0) return r[0] ?? null;
  return null;
}

async function buildSignalsInner(
  payload: SnapshotPayload,
  plan: MarketSignalsPlan,
  ownerHandle: string,
): Promise<MarketSignalsResult> {
  const cap = maxQueriesFor(plan);
  if (cap <= 0) {
    return { status: "disabled", plan, message: "Plano sem quota DataForSEO." };
  }

  const keywords = deriveKeywordsFromSnapshot(payload, 5);
  if (keywords.length === 0) {
    return {
      status: "no_keywords",
      plan,
      message: "Não foi possível derivar keywords a partir do snapshot.",
    };
  }

  const errors: Array<{ source: string; message: string }> = [];
  let used = 0;

  // 1. Google Trends — always first (free + paid).
  let trends: GoogleTrendsResult | null = null;
  if (used < cap) {
    used += 1;
    try {
      const env = await fetchGoogleTrends({
        ownerHandle,
        keywords: keywords.slice(0, 5),
      });
      trends = firstResultOrNull<GoogleTrendsResult>(env);
    } catch (err) {
      errors.push({
        source: "google_trends",
        message: err instanceof Error ? err.message : "unknown",
      });
    }
  }

  if (plan !== "paid") {
    return {
      status: "ready",
      plan,
      keywords,
      trends,
      queries_used: used,
      queries_cap: cap,
      errors,
    };
  }

  // 2. Keyword Ideas (paid).
  let keyword_ideas: KeywordIdeasResult | null = null;
  if (used < cap) {
    used += 1;
    try {
      const env = await fetchKeywordIdeas({
        ownerHandle,
        keywords: [keywords[0]],
        limit: 50,
      });
      keyword_ideas = firstResultOrNull<KeywordIdeasResult>(env);
    } catch (err) {
      errors.push({
        source: "keyword_ideas",
        message: err instanceof Error ? err.message : "unknown",
      });
    }
  }

  // 3. SERP Organic — top 3 keywords, capped by remaining quota.
  const serp: Array<{ keyword: string; result: SerpOrganicResult | null }> = [];
  for (const kw of keywords.slice(0, 3)) {
    if (used >= cap) break;
    used += 1;
    try {
      const env = await fetchSerpOrganic({
        ownerHandle,
        keyword: kw,
        depth: 10,
      });
      serp.push({ keyword: kw, result: firstResultOrNull<SerpOrganicResult>(env) });
    } catch (err) {
      serp.push({ keyword: kw, result: null });
      errors.push({
        source: `serp_organic:${kw}`,
        message: err instanceof Error ? err.message : "unknown",
      });
    }
  }

  return {
    status: "ready",
    plan,
    keywords,
    trends,
    keyword_ideas,
    serp,
    queries_used: used,
    queries_cap: cap,
    errors,
  };
}

/**
 * Public entry point. Wraps the inner orchestration in a hard timeout and
 * converts any unexpected throw into an `error` envelope so callers never
 * need a try/catch.
 */
export async function buildMarketSignals(
  payload: SnapshotPayload,
  options: BuildMarketSignalsOptions,
): Promise<MarketSignalsResult> {
  const plan = options.plan;
  const total = options.totalTimeoutMs ?? 60_000;
  const ownerHandle = options.ownerHandle.trim().toLowerCase().replace(/^@/, "");
  if (!ownerHandle) {
    return {
      status: "error",
      plan,
      message: "ownerHandle obrigatório.",
    };
  }

  const work: Promise<MarketSignalsResult> = buildSignalsInner(
    payload,
    plan,
    ownerHandle,
  ).catch(
    (err): MarketSignalsFail => ({
      status: "error",
      plan,
      message: err instanceof Error ? err.message : "unknown",
    }),
  );

  return Promise.race<MarketSignalsResult>([work, timeoutPromise(total, plan)]);
}