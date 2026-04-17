/**
 * Tier resolution helpers.
 *
 * Tier thresholds and labels are now sourced from the `benchmark_references`
 * cloud table (see `reference-data.ts`). The functions below operate on a
 * pre-loaded `BenchmarkData` snapshot and gracefully fall back to the
 * in-code defaults when no snapshot is provided (client-side calls).
 */

import {
  FALLBACK_BENCHMARK_DATA,
  type BenchmarkData,
  type TierDefinition,
} from "./reference-data";
import type { AccountTier } from "./types";

export const TIER_LABELS: Record<AccountTier, string> =
  FALLBACK_BENCHMARK_DATA.tierLabels;

export function getTierForFollowers(
  followers: number,
  data: BenchmarkData = FALLBACK_BENCHMARK_DATA,
): AccountTier {
  for (const def of data.tiers as readonly TierDefinition[]) {
    if (followers >= def.min && followers <= def.max) return def.tier;
  }
  return "nano";
}

export function getTierLabel(
  tier: AccountTier,
  data: BenchmarkData = FALLBACK_BENCHMARK_DATA,
): string {
  return data.tierLabels[tier] ?? FALLBACK_BENCHMARK_DATA.tierLabels[tier];
}
