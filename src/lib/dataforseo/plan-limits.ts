/**
 * Plan-driven query caps for DataForSEO market signals (server-only).
 *
 * Reads `DATAFORSEO_MAX_QUERIES_FREE` / `DATAFORSEO_MAX_QUERIES_PAID` from
 * environment with conservative defaults. Caps are integer in [0, 10].
 *
 * NOTE: "queries" here = number of distinct DataForSEO endpoint calls made
 * for a single report enrichment, not number of keywords inside a single
 * call (see Google Trends which accepts up to 5 keywords per call).
 */

export type MarketSignalsPlan = "free" | "paid";

const DEFAULTS: Record<MarketSignalsPlan, number> = {
  free: 1,
  paid: 5,
};

const HARD_CAP = 10;

function parseCap(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.min(n, HARD_CAP);
}

export function maxQueriesFor(plan: MarketSignalsPlan): number {
  if (plan === "paid") {
    return parseCap(process.env.DATAFORSEO_MAX_QUERIES_PAID, DEFAULTS.paid);
  }
  return parseCap(process.env.DATAFORSEO_MAX_QUERIES_FREE, DEFAULTS.free);
}