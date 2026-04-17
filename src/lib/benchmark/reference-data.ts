/**
 * Benchmark reference table — engagement % expected by [tier][format].
 * v1 baseline editorial values, derived from public industry ranges
 * (Influencer Marketing Hub, HypeAuditor, Later 2024 reports).
 * Refinable in later prompts; intentionally not a definitive dataset.
 */

import type { AccountTier, BenchmarkFormat } from "./types";

export const BENCHMARK_DATASET_VERSION = "v1.0-2025-04";

type ReferenceTable = Record<AccountTier, Record<BenchmarkFormat, number>>;

export const ENGAGEMENT_REFERENCE: ReferenceTable = {
  nano: { Reels: 5.6, Carrosséis: 4.2, Imagens: 3.1 },
  micro: { Reels: 3.2, Carrosséis: 2.4, Imagens: 1.8 },
  mid: { Reels: 1.8, Carrosséis: 1.3, Imagens: 0.95 },
  macro: { Reels: 1.1, Carrosséis: 0.8, Imagens: 0.55 },
  mega: { Reels: 0.7, Carrosséis: 0.5, Imagens: 0.35 },
};

export function getReference(
  tier: AccountTier,
  format: BenchmarkFormat,
): number | null {
  const tierRow = ENGAGEMENT_REFERENCE[tier];
  if (!tierRow) return null;
  const value = tierRow[format];
  return typeof value === "number" ? value : null;
}
