/**
 * Server-only loader for the benchmark dataset.
 *
 * Reads the active rows from `benchmark_references` via the service-role
 * admin client. Caches results in-memory for 10 min so editorial updates
 * propagate within minutes without hammering Postgres on every analysis
 * request. Falls back to the in-code snapshot if the DB call fails.
 *
 * NEVER import this from client code — see `reference-data.ts` for the
 * pure, client-safe types and fallback constants.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";

import {
  FALLBACK_BENCHMARK_DATA,
  FALLBACK_DATASET_VERSION,
  type BenchmarkData,
  type TierDefinition,
} from "./reference-data";
import type { AccountTier, BenchmarkFormat } from "./types";

const CACHE_TTL_MS = 10 * 60 * 1000;
let cached: { data: BenchmarkData; loadedAt: number } | null = null;

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
