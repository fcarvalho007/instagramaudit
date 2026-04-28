/**
 * Persistence + idempotency layer for the "Sinais de Mercado" envelope.
 *
 * The cached summary lives inside `analysis_snapshots.normalized_payload`
 * under the key `market_signals_free` (and, eventually, `market_signals_paid`).
 * Storing it here avoids a schema migration and keeps the report self-
 * contained: the exact same snapshot id always returns the exact same
 * market signals envelope until TTL expires.
 *
 * This module is pure (no IO). The route handler is responsible for the
 * actual read/write against Supabase.
 */
import type { GoogleTrendsResult } from "@/lib/dataforseo/endpoints/google-trends";
import type {
  ClassifiedError,
  ClassifiedErrorCode,
  MarketSignalsResult,
} from "@/lib/dataforseo/market-signals";

export const MARKET_SIGNALS_TTL = {
  /** Successful free Google Trends. */
  free_ready_seconds: 24 * 60 * 60, // 24h
  /** "partial" still has data — same TTL as ready. */
  partial_seconds: 24 * 60 * 60,
  /** Deterministic from snapshot — cache 24h to avoid retry spam. */
  no_keywords_seconds: 24 * 60 * 60,
  /** Soft errors (timeout / rate limit / unknown) — short negative cache. */
  soft_error_seconds: 10 * 60, // 10 min
} as const;

/** Error codes that must NEVER be cached. They require operator action. */
export const HARD_ERROR_CODES: readonly ClassifiedErrorCode[] = [
  "ACCOUNT_NOT_VERIFIED",
  "AUTH_FAILED",
  "DISABLED",
  "BLOCKED",
] as const;

/** Status values that may be cached at all (independent of error codes). */
const CACHEABLE_STATUSES = new Set<MarketSignalsResult["status"]>([
  "ready",
  "partial",
  "no_keywords",
  "timeout",
  "error",
]);

export interface PersistedMarketSignals {
  status: MarketSignalsResult["status"];
  plan: "free" | "paid";
  generated_at: string;
  expires_at: string;
  keywords: string[];
  trends: GoogleTrendsResult | null;
  trends_usable_keywords: string[];
  trends_dropped_keywords: string[];
  queries_used: number;
  queries_cap: number;
  errors: ClassifiedError[];
  provider_cost_usd: number;
  provider_cost_source: "provider_reported";
  provider_call_log_ids: string[];
}

/**
 * Decide whether and for how long a result may be cached. Returns the TTL
 * in seconds, or `null` to skip caching entirely.
 */
export function decideCacheTtlSeconds(
  result: MarketSignalsResult,
): number | null {
  if (!CACHEABLE_STATUSES.has(result.status)) return null;

  const errors: ClassifiedError[] =
    "errors" in result && Array.isArray(result.errors) ? result.errors : [];
  const hasHard = errors.some((e) => HARD_ERROR_CODES.includes(e.code));
  if (hasHard) return null;

  switch (result.status) {
    case "ready":
      return MARKET_SIGNALS_TTL.free_ready_seconds;
    case "partial":
      return MARKET_SIGNALS_TTL.partial_seconds;
    case "no_keywords":
      return MARKET_SIGNALS_TTL.no_keywords_seconds;
    case "timeout":
    case "error":
      // Soft-only errors: short negative cache.
      return MARKET_SIGNALS_TTL.soft_error_seconds;
    default:
      return null;
  }
}

/**
 * Builds the persisted summary from an orchestrator result + cost metadata.
 */
export function buildPersistedSummary(args: {
  result: MarketSignalsResult;
  plan: "free" | "paid";
  ttlSeconds: number;
  providerCostUsd: number;
  providerCallLogIds: string[];
  now?: Date;
}): PersistedMarketSignals {
  const now = args.now ?? new Date();
  const expires = new Date(now.getTime() + args.ttlSeconds * 1000);
  const r = args.result;

  const keywords = "keywords" in r && Array.isArray(r.keywords) ? r.keywords : [];
  const trends =
    "trends" in r && r.trends !== undefined ? (r.trends ?? null) : null;
  const usable =
    ("trends_usable_keywords" in r && r.trends_usable_keywords) || [];
  const dropped =
    ("trends_dropped_keywords" in r && r.trends_dropped_keywords) || [];
  const errors = "errors" in r && Array.isArray(r.errors) ? r.errors : [];
  const used = "queries_used" in r ? r.queries_used ?? 0 : 0;
  const cap = "queries_cap" in r ? r.queries_cap ?? 0 : 0;

  return {
    status: r.status,
    plan: args.plan,
    generated_at: now.toISOString(),
    expires_at: expires.toISOString(),
    keywords,
    trends,
    trends_usable_keywords: usable,
    trends_dropped_keywords: dropped,
    queries_used: used,
    queries_cap: cap,
    errors,
    provider_cost_usd: args.providerCostUsd,
    provider_cost_source: "provider_reported",
    provider_call_log_ids: args.providerCallLogIds,
  };
}

/**
 * Returns the cached summary if still valid, otherwise null.
 * Accepts the raw `normalized_payload` jsonb.
 */
export function readCachedSummary(
  normalizedPayload: unknown,
  plan: "free" | "paid",
  now: Date = new Date(),
): PersistedMarketSignals | null {
  if (!normalizedPayload || typeof normalizedPayload !== "object") return null;
  const key = plan === "free" ? "market_signals_free" : "market_signals_paid";
  const raw = (normalizedPayload as Record<string, unknown>)[key];
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Partial<PersistedMarketSignals>;
  if (typeof candidate.expires_at !== "string") return null;
  const expiresAt = Date.parse(candidate.expires_at);
  if (!Number.isFinite(expiresAt) || expiresAt <= now.getTime()) return null;
  // Minimal shape check.
  if (typeof candidate.status !== "string") return null;
  return candidate as PersistedMarketSignals;
}

/**
 * Reconstructs the public response envelope from a cached summary.
 * The shape mirrors `MarketSignalsResult` so the UI keeps working unchanged.
 */
export function summaryToPublicEnvelope(
  summary: PersistedMarketSignals,
): MarketSignalsResult {
  if (summary.status === "ready" || summary.status === "partial") {
    return {
      status: summary.status,
      plan: summary.plan,
      keywords: summary.keywords,
      trends: summary.trends,
      keyword_ideas: null,
      serp: undefined,
      queries_used: summary.queries_used,
      queries_cap: summary.queries_cap,
      errors: summary.errors,
      trends_usable_keywords: summary.trends_usable_keywords,
      trends_dropped_keywords: summary.trends_dropped_keywords,
    };
  }
  return {
    status: summary.status,
    plan: summary.plan,
    message:
      summary.status === "no_keywords"
        ? "Não foi possível derivar keywords a partir do snapshot."
        : summary.status === "timeout"
          ? "DataForSEO excedeu o tempo limite."
          : "Não foi possível obter sinais de mercado nesta tentativa.",
    queries_used: summary.queries_used,
    queries_cap: summary.queries_cap,
    errors: summary.errors,
    trends_usable_keywords: summary.trends_usable_keywords,
    trends_dropped_keywords: summary.trends_dropped_keywords,
  };
}