/**
 * Benchmark engine — normalized types.
 * Shape mirrors what a future server route will return, so the UI consumes
 * the same contract today (pure module) and tomorrow (server-enriched).
 */

export type AccountTier = "nano" | "micro" | "mid" | "macro" | "mega";

export type BenchmarkFormat = "Reels" | "Carrosséis" | "Imagens";

export type PositionStatus = "above" | "aligned" | "below";

export type UnavailableReason =
  | "missing_inputs"
  | "no_reference_for_tier";

export interface BenchmarkPositioningAvailable {
  status: "available";
  accountTier: AccountTier;
  accountTierLabel: string;
  dominantFormat: BenchmarkFormat;
  benchmarkValue: number; // engagement % expected for tier × format
  profileValue: number; // engagement % observed
  differencePercent: number; // signed delta vs benchmark, in %
  positionStatus: PositionStatus;
  shortExplanation: string;
}

export interface BenchmarkPositioningUnavailable {
  status: "unavailable";
  reason: UnavailableReason;
}

export type BenchmarkPositioning =
  | BenchmarkPositioningAvailable
  | BenchmarkPositioningUnavailable;

export interface BenchmarkEngineInput {
  followers: number | null | undefined;
  engagement: number | null | undefined; // %
  dominantFormat: BenchmarkFormat | null | undefined;
}
