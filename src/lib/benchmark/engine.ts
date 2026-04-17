/**
 * Benchmark engine — computes positioning for a single profile.
 *
 * Pure module. Accepts an optional `BenchmarkData` snapshot via dependency
 * injection. When omitted, falls back to the in-code defaults so client-side
 * callers (dashboard) keep working synchronously without a DB round-trip.
 * Server callers should always inject a freshly-loaded snapshot from
 * `loadBenchmarkReferences()`.
 */

import {
  FALLBACK_BENCHMARK_DATA,
  getReferenceFromData,
  type BenchmarkData,
} from "./reference-data";
import { getTierForFollowers, getTierLabel } from "./tiers";
import type {
  BenchmarkEngineInput,
  BenchmarkPositioning,
  PositionStatus,
} from "./types";

const ALIGNED_THRESHOLD_PERCENT = 10; // ±10% delta = "aligned"

const STATUS_LABELS: Record<PositionStatus, string> = {
  above: "Acima do benchmark",
  aligned: "Alinhado com o benchmark",
  below: "Abaixo do benchmark",
};

export function getPositionStatusLabel(status: PositionStatus): string {
  return STATUS_LABELS[status];
}

function buildExplanation(
  status: PositionStatus,
  tierLabel: string,
  format: string,
  absDeltaPct: number,
): string {
  const formatted = absDeltaPct.toFixed(1).replace(".", ",");
  const tierShort = tierLabel.split(" ")[0]; // "Micro (10K–50K)" → "Micro"
  switch (status) {
    case "above":
      return `Envolvimento ${formatted}% acima do benchmark para contas ${tierShort} no formato ${format}.`;
    case "below":
      return `Envolvimento ${formatted}% abaixo do benchmark para contas ${tierShort} no formato ${format}. Margem para refinar formato dominante e pacing.`;
    case "aligned":
    default:
      return `Envolvimento em linha com o benchmark para contas ${tierShort} no formato ${format}.`;
  }
}

export function computeBenchmarkPositioning(
  input: BenchmarkEngineInput,
  data: BenchmarkData = FALLBACK_BENCHMARK_DATA,
): BenchmarkPositioning {
  const { followers, engagement, dominantFormat } = input;

  if (
    !followers ||
    followers <= 0 ||
    !engagement ||
    engagement <= 0 ||
    !dominantFormat
  ) {
    return { status: "unavailable", reason: "missing_inputs" };
  }

  const tier = getTierForFollowers(followers, data);
  const benchmarkValue = getReferenceFromData(data, tier, dominantFormat);

  if (benchmarkValue === null || benchmarkValue <= 0) {
    return { status: "unavailable", reason: "no_reference_for_tier" };
  }

  const delta = engagement - benchmarkValue;
  const differencePercent = (delta / benchmarkValue) * 100;

  const positionStatus: PositionStatus =
    differencePercent > ALIGNED_THRESHOLD_PERCENT
      ? "above"
      : differencePercent < -ALIGNED_THRESHOLD_PERCENT
        ? "below"
        : "aligned";

  const accountTierLabel = getTierLabel(tier, data);

  return {
    status: "available",
    accountTier: tier,
    accountTierLabel,
    dominantFormat,
    benchmarkValue,
    profileValue: engagement,
    differencePercent,
    positionStatus,
    shortExplanation: buildExplanation(
      positionStatus,
      accountTierLabel,
      dominantFormat,
      Math.abs(differencePercent),
    ),
  };
}
