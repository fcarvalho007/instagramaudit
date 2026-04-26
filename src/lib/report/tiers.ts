/**
 * Tier resolution scoped to the real report adapter.
 *
 * Mirrors the buckets defined in the spec (Nano · Micro · Mid · Macro · Mega)
 * and returns both the editorial label used by the report header and a
 * human-friendly range string. Pure, deterministic, no I/O.
 *
 * NOTE — kept intentionally separate from `src/lib/benchmark/tiers.ts`. The
 * benchmark module uses lowercase tier keys (`"micro"`) sourced from
 * `benchmark_references` rows; this file produces the title-case labels the
 * editorial report mock already uses (`"Micro"`, `"10K–50K"`).
 */

export type ReportTier = "Nano" | "Micro" | "Mid" | "Macro" | "Mega";

export interface ReportTierInfo {
  tier: ReportTier;
  /** Editorial range string already used by `reportData.profile.tierRange`. */
  tierRange: string;
}

interface Bucket {
  tier: ReportTier;
  /** Inclusive lower bound. */
  min: number;
  /** Exclusive upper bound. `Infinity` for the open-ended top tier. */
  maxExclusive: number;
  range: string;
}

// Buckets mirror the spec exactly. Order matters — first match wins.
const BUCKETS: readonly Bucket[] = [
  { tier: "Nano", min: 0, maxExclusive: 10_000, range: "0–10K" },
  { tier: "Micro", min: 10_000, maxExclusive: 50_000, range: "10K–50K" },
  { tier: "Mid", min: 50_000, maxExclusive: 250_000, range: "50K–250K" },
  { tier: "Macro", min: 250_000, maxExclusive: 1_000_000, range: "250K–1M" },
  { tier: "Mega", min: 1_000_000, maxExclusive: Infinity, range: "1M+" },
];

/**
 * Resolve `{ tier, tierRange }` from a raw follower count.
 *
 * Treats `null`, `undefined`, `NaN`, and negative inputs as 0 → Nano.
 */
export function resolveReportTier(
  followers: number | null | undefined,
): ReportTierInfo {
  const n =
    typeof followers === "number" && Number.isFinite(followers) && followers > 0
      ? Math.floor(followers)
      : 0;
  for (const b of BUCKETS) {
    if (n >= b.min && n < b.maxExclusive) {
      return { tier: b.tier, tierRange: b.range };
    }
  }
  // Unreachable — Mega's maxExclusive is Infinity. Fallback for type safety.
  return { tier: "Mega", tierRange: "1M+" };
}
