/**
 * Benchmark reference dataset.
 *
 * Source of truth lives in the `benchmark_references` Supabase table so
 * editorial values can be tuned via SQL without redeploying the app.
 * The constants below act as a build-time fallback that keeps the
 * benchmark feature working if the DB call fails (network, RLS misconfig,
 * cold start). Values mirror the seed migration of `v1.0-2025-04`.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";

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

// In-memory cache scoped to the server runtime instance.
// 10 min TTL — editorial updates propagate within minutes without hammering
// Postgres on every analysis request.
const CACHE_TTL_MS = 10 * 60 * 1000;
let cached: { data: BenchmarkData; loadedAt: number } | null = null;

/**
 * Load the active benchmark dataset from Supabase.
 * Server-only — uses the service-role admin client to bypass RLS.
 * Falls back to the in-code snapshot if the DB call fails.
 */
export async function loadBenchmarkReferences(): Promise<BenchmarkData> {
  const now = Date.now();
  if (cached && now - cached.loadedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const { data: rows, error } = await supabaseAdmin
      .from("benchmark_references")
      .select(
        "tier, format, engagement_pct, tier_min_followers, tier_max_followers, tier_label, dataset_version",
      )
      .eq("is_active", true);

    if (error || !rows || rows.length === 0) {
      if (error) {
        console.warn("[benchmark] DB load failed, using fallback", error);
      }
      cached = { data: FALLBACK_BENCHMARK_DATA, loadedAt: now };
      return FALLBACK_BENCHMARK_DATA;
    }

    const data = buildBenchmarkData(rows);
    cached = { data, loadedAt: now };
    return data;
  } catch (err) {
    console.warn("[benchmark] DB load threw, using fallback", err);
    cached = { data: FALLBACK_BENCHMARK_DATA, loadedAt: now };
    return FALLBACK_BENCHMARK_DATA;
  }
}

interface RawRow {
  tier: string;
  format: string;
  engagement_pct: number | string;
  tier_min_followers: number | string;
  tier_max_followers: number | string | null;
  tier_label: string;
  dataset_version: string;
}

function buildBenchmarkData(rows: RawRow[]): BenchmarkData {
  // All seeded rows share the same dataset_version; pick from the first row.
  const datasetVersion = rows[0]?.dataset_version ?? FALLBACK_DATASET_VERSION;

  const tierMap = new Map<AccountTier, TierDefinition>();
  const reference = {
    nano: {} as Record<BenchmarkFormat, number>,
    micro: {} as Record<BenchmarkFormat, number>,
    mid: {} as Record<BenchmarkFormat, number>,
    macro: {} as Record<BenchmarkFormat, number>,
    mega: {} as Record<BenchmarkFormat, number>,
  } as BenchmarkData["reference"];

  for (const row of rows) {
    const tier = row.tier as AccountTier;
    const format = row.format as BenchmarkFormat;
    if (!reference[tier]) continue;

    reference[tier][format] = Number(row.engagement_pct);

    if (!tierMap.has(tier)) {
      const max =
        row.tier_max_followers === null
          ? Number.POSITIVE_INFINITY
          : Number(row.tier_max_followers);
      tierMap.set(tier, {
        tier,
        min: Number(row.tier_min_followers),
        max,
        label: row.tier_label,
      });
    }
  }

  // Preserve canonical tier ordering for getTierForFollowers() iteration.
  const tierOrder: AccountTier[] = ["nano", "micro", "mid", "macro", "mega"];
  const tiers = tierOrder
    .map((t) => tierMap.get(t))
    .filter((d): d is TierDefinition => Boolean(d));

  const tierLabels = tiers.reduce(
    (acc, def) => {
      acc[def.tier] = def.label;
      return acc;
    },
    {} as Record<AccountTier, string>,
  );

  // Ensure every tier has a label even if a row is missing in the DB.
  for (const t of tierOrder) {
    if (!tierLabels[t]) tierLabels[t] = FALLBACK_BENCHMARK_DATA.tierLabels[t];
  }

  return {
    datasetVersion,
    tiers: tiers.length > 0 ? tiers : FALLBACK_BENCHMARK_DATA.tiers,
    tierLabels,
    reference,
  };
}

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
