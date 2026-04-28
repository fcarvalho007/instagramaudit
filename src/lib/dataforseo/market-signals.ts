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
import {
  DataForSeoBlockedError,
  DataForSeoUpstreamError,
} from "./types";
import { splitTrendsKeywords } from "./normalize-trends";

export type MarketSignalsStatus =
  | "ready"
  | "partial"
  | "disabled"
  | "blocked"
  | "no_keywords"
  | "timeout"
  | "error";

export type ClassifiedErrorCode =
  | "ACCOUNT_NOT_VERIFIED"
  | "AUTH_FAILED"
  | "RATE_LIMITED"
  | "DISABLED"
  | "BLOCKED"
  | "TIMEOUT"
  | "UNKNOWN";

export interface ClassifiedError {
  source: string;
  code: ClassifiedErrorCode;
  message: string;
  httpStatus?: number;
  apiStatusCode?: number;
}

export interface MarketSignalsOk {
  status: "ready" | "partial";
  plan: MarketSignalsPlan;
  keywords: string[];
  trends?: GoogleTrendsResult | null;
  keyword_ideas?: KeywordIdeasResult | null;
  serp?: Array<{ keyword: string; result: SerpOrganicResult | null }>;
  queries_used: number;
  queries_cap: number;
  errors: ClassifiedError[];
  message?: string;
  trends_usable_keywords?: string[];
  trends_dropped_keywords?: string[];
}

export interface MarketSignalsFail {
  status: Exclude<MarketSignalsStatus, "ready">;
  plan: MarketSignalsPlan;
  message: string;
  queries_used?: number;
  queries_cap?: number;
  errors?: ClassifiedError[];
  trends_usable_keywords?: string[];
  trends_dropped_keywords?: string[];
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

/**
 * Normalises any error thrown by a DataForSEO call into a stable, UI-safe
 * envelope. Maps known HTTP/API status codes (e.g. 40104 = account not
 * verified) to a typed `code` so the public report can show actionable
 * messages without parsing free-form strings.
 */
function classifyError(source: string, err: unknown): ClassifiedError {
  if (err instanceof DataForSeoUpstreamError) {
    const httpStatus = err.status;
    const apiStatusCode = err.apiStatusCode;
    const rawMsg = err.message ?? "";

    if (
      apiStatusCode === 40104 ||
      (httpStatus === 403 && /verify your account/i.test(rawMsg))
    ) {
      return {
        source,
        code: "ACCOUNT_NOT_VERIFIED",
        message: "A conta DataForSEO ainda não está verificada.",
        httpStatus,
        apiStatusCode,
      };
    }
    if (httpStatus === 401 || apiStatusCode === 40101) {
      return {
        source,
        code: "AUTH_FAILED",
        message: "Credenciais DataForSEO inválidas.",
        httpStatus,
        apiStatusCode,
      };
    }
    if (httpStatus === 429 || apiStatusCode === 40202) {
      return {
        source,
        code: "RATE_LIMITED",
        message: "Limite de pedidos DataForSEO atingido.",
        httpStatus,
        apiStatusCode,
      };
    }
    return {
      source,
      code: "UNKNOWN",
      message: rawMsg || "Erro desconhecido do DataForSEO.",
      httpStatus,
      apiStatusCode,
    };
  }
  if (err instanceof DataForSeoBlockedError) {
    return {
      source,
      code: err.reason === "kill_switch" ? "DISABLED" : "BLOCKED",
      message: err.message,
    };
  }
  const message = err instanceof Error ? err.message : "unknown";
  if (/abort|timeout/i.test(message)) {
    return { source, code: "TIMEOUT", message };
  }
  return { source, code: "UNKNOWN", message };
}

function isUsableTrends(t: GoogleTrendsResult | null | undefined): boolean {
  if (!t || !Array.isArray(t.items) || t.items.length === 0) return false;
  return splitTrendsKeywords(t).usable_keywords.length > 0;
}
function isUsableKeywordIdeas(k: KeywordIdeasResult | null | undefined): boolean {
  return !!k;
}
function isUsableSerp(
  s: Array<{ keyword: string; result: SerpOrganicResult | null }> | undefined,
): boolean {
  return !!s && s.some((entry) => entry.result !== null);
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

  const errors: ClassifiedError[] = [];
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
      errors.push(classifyError("dataforseo:google_trends", err));
    }
  }

  if (plan !== "paid") {
    return finalize({
      plan,
      keywords,
      trends,
      keyword_ideas: undefined,
      serp: undefined,
      used,
      cap,
      errors,
    });
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
      errors.push(classifyError("dataforseo:keyword_ideas", err));
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
      errors.push(classifyError(`dataforseo:serp_organic:${kw}`, err));
    }
  }

  return finalize({
    plan,
    keywords,
    trends,
    keyword_ideas,
    serp,
    used,
    cap,
    errors,
  });
}

interface FinalizeInput {
  plan: MarketSignalsPlan;
  keywords: string[];
  trends: GoogleTrendsResult | null;
  keyword_ideas: KeywordIdeasResult | null | undefined;
  serp: Array<{ keyword: string; result: SerpOrganicResult | null }> | undefined;
  used: number;
  cap: number;
  errors: ClassifiedError[];
}

/**
 * Derives the final status envelope from accumulated results + errors.
 * "Usable" = at least one provider call returned a non-empty payload.
 */
function finalize(input: FinalizeInput): MarketSignalsResult {
  const trendsSplit = splitTrendsKeywords(input.trends);
  const usableCount =
    (isUsableTrends(input.trends) ? 1 : 0) +
    (isUsableKeywordIdeas(input.keyword_ideas) ? 1 : 0) +
    (isUsableSerp(input.serp) ? 1 : 0);
  const failed = input.errors.length;

  if (usableCount === 0) {
    return {
      status: "error",
      plan: input.plan,
      message: "Não foi possível obter sinais de mercado nesta tentativa.",
      queries_used: input.used,
      queries_cap: input.cap,
      errors: input.errors,
      trends_usable_keywords: trendsSplit.usable_keywords,
      trends_dropped_keywords: trendsSplit.dropped_keywords,
    };
  }

  const status: "ready" | "partial" = failed > 0 ? "partial" : "ready";
  return {
    status,
    plan: input.plan,
    keywords: input.keywords,
    trends: input.trends,
    keyword_ideas: input.keyword_ideas ?? null,
    serp: input.serp,
    queries_used: input.used,
    queries_cap: input.cap,
    errors: input.errors,
    message:
      status === "partial"
        ? "Sinais de mercado parciais — algumas fontes falharam."
        : undefined,
    trends_usable_keywords: trendsSplit.usable_keywords,
    trends_dropped_keywords: trendsSplit.dropped_keywords,
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