/**
 * Benchmark reference dataset — pure module (client-safe).
 *
 * Source of truth lives in the `benchmark_references` Supabase table so
 * editorial values can be tuned via SQL without redeploying the app.
 * The constants below act as a build-time fallback that keeps the
 * benchmark feature working if the DB call fails (network, RLS misconfig,
 * cold start). Values mirror the seed migration of `v1.0-2025-04`.
 *
 * IMPORTANT: this module must stay free of server-only imports so it can
 * be safely bundled into the client. The async DB loader lives in
 * `reference-data.server.ts`.
 */

import type { AccountTier, BenchmarkFormat } from "./types";

export const FALLBACK_DATASET_VERSION = "v1.0-2025-04";

export interface TierDefinition {
  tier: AccountTier;
  min: number;
  max: number; // inclusive; Number.POSITIVE_INFINITY for top tier
  label: string;
}

export interface BenchmarkData {
  datasetVersion: string;
  tiers: readonly TierDefinition[];
  tierLabels: Record<AccountTier, string>;
  reference: Record<AccountTier, Record<BenchmarkFormat, number>>;
}

const FALLBACK_TIERS: readonly TierDefinition[] = [
  { tier: "nano", min: 0, max: 9_999, label: "Nano (até 10K)" },
  { tier: "micro", min: 10_000, max: 49_999, label: "Micro (10K–50K)" },
  { tier: "mid", min: 50_000, max: 249_999, label: "Mid (50K–250K)" },
  { tier: "macro", min: 250_000, max: 999_999, label: "Macro (250K–1M)" },
  {
    tier: "mega",
    min: 1_000_000,
    max: Number.POSITIVE_INFINITY,
    label: "Mega (1M+)",
  },
] as const;

const FALLBACK_REFERENCE: BenchmarkData["reference"] = {
  nano: { Reels: 5.6, Carrosséis: 4.2, Imagens: 3.1 },
  micro: { Reels: 3.2, Carrosséis: 2.4, Imagens: 1.8 },
  mid: { Reels: 1.8, Carrosséis: 1.3, Imagens: 0.95 },
  macro: { Reels: 1.1, Carrosséis: 0.8, Imagens: 0.55 },
  mega: { Reels: 0.7, Carrosséis: 0.5, Imagens: 0.35 },
};

export const FALLBACK_BENCHMARK_DATA: BenchmarkData = {
  datasetVersion: FALLBACK_DATASET_VERSION,
  tiers: FALLBACK_TIERS,
  tierLabels: FALLBACK_TIERS.reduce(
    (acc, def) => {
      acc[def.tier] = def.label;
      return acc;
    },
    {} as Record<AccountTier, string>,
  ),
  reference: FALLBACK_REFERENCE,
};

/**
 * Lookup the engagement reference for a given tier × format from a
 * pre-loaded dataset. Returns null if the slice is missing.
 */
export function getReferenceFromData(
  data: BenchmarkData,
  tier: AccountTier,
  format: BenchmarkFormat,
): number | null {
  const tierRow = data.reference[tier];
  if (!tierRow) return null;
  const value = tierRow[format];
  return typeof value === "number" && value > 0 ? value : null;
}
