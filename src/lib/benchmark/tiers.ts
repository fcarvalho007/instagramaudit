/**
 * Account size tiering by followers count.
 * Thresholds kept explicit and readable for easy future tuning.
 */

import type { AccountTier } from "./types";

interface TierDefinition {
  tier: AccountTier;
  min: number;
  max: number; // inclusive upper bound; Infinity for top tier
  label: string; // pt-PT label rendered in UI
}

export const TIER_DEFINITIONS: readonly TierDefinition[] = [
  { tier: "nano", min: 0, max: 9_999, label: "Nano (até 10K)" },
  { tier: "micro", min: 10_000, max: 49_999, label: "Micro (10K–50K)" },
  { tier: "mid", min: 50_000, max: 249_999, label: "Mid (50K–250K)" },
  { tier: "macro", min: 250_000, max: 999_999, label: "Macro (250K–1M)" },
  { tier: "mega", min: 1_000_000, max: Number.POSITIVE_INFINITY, label: "Mega (1M+)" },
] as const;

export const TIER_LABELS: Record<AccountTier, string> = TIER_DEFINITIONS.reduce(
  (acc, def) => {
    acc[def.tier] = def.label;
    return acc;
  },
  {} as Record<AccountTier, string>,
);

export function getTierForFollowers(followers: number): AccountTier {
  for (const def of TIER_DEFINITIONS) {
    if (followers >= def.min && followers <= def.max) return def.tier;
  }
  // Defensive fallback — followers is non-negative finite by contract.
  return "nano";
}
