/**
 * buildReportBenchmarkInput — server-only helper that loads the active
 * `benchmark_references` dataset and produces a `ReportBenchmarkInput`
 * suitable for the pure `snapshotToReportData` adapter.
 *
 * Lives apart from the adapter so the adapter can stay client-safe.
 * Cached transparently by `loadBenchmarkReferences()`.
 * Never calls Apify.
 */

import {
  computeBenchmarkPositioning,
} from "@/lib/benchmark/engine";
import { loadBenchmarkReferences } from "@/lib/benchmark/reference-data.server";
import { getReferenceFromData } from "@/lib/benchmark/reference-data";
import { getTierForFollowers, getTierLabel } from "@/lib/benchmark/tiers";
import type {
  BenchmarkFormat,
  BenchmarkPositioning,
} from "@/lib/benchmark/types";

import type {
  ReportBenchmarkInput,
  SnapshotPayload,
} from "./snapshot-to-report-data";

/** Map snapshot dominant_format / format_stats keys → engine format label. */
function toBenchmarkFormat(raw: string | null | undefined): BenchmarkFormat {
  const s = (raw ?? "").toLowerCase();
  if (s.startsWith("reel")) return "Reels";
  if (s.startsWith("imag") || s.startsWith("foto") || s.startsWith("image")) {
    return "Imagens";
  }
  // "Carrosséis" / "carousel" / default
  return "Carrosséis";
}

/** Adapter-side label → engine label for per-format reference lookup. */
const ADAPTER_TO_ENGINE: Record<
  "Reels" | "Carousels" | "Imagens",
  BenchmarkFormat
> = {
  Reels: "Reels",
  Carousels: "Carrosséis",
  Imagens: "Imagens",
};

export async function buildReportBenchmarkInput(
  payload: SnapshotPayload | null | undefined,
): Promise<ReportBenchmarkInput> {
  const data = await loadBenchmarkReferences();

  const profile = payload?.profile ?? {};
  const cs = payload?.content_summary ?? {};
  const followers =
    typeof profile.followers_count === "number"
      ? profile.followers_count
      : null;
  const engagement =
    typeof cs.average_engagement_rate === "number"
      ? cs.average_engagement_rate
      : null;
  const dominantFormat = toBenchmarkFormat(cs.dominant_format ?? null);

  const positioning: BenchmarkPositioning = computeBenchmarkPositioning(
    {
      followers,
      engagement,
      dominantFormat,
    },
    data,
  );

  const tier =
    typeof followers === "number" && followers > 0
      ? getTierForFollowers(followers, data)
      : null;

  const perFormatReference: ReportBenchmarkInput["perFormatReference"] = {
    Reels: tier ? getReferenceFromData(data, tier, "Reels") : null,
    Carousels: tier ? getReferenceFromData(data, tier, "Carrosséis") : null,
    Imagens: tier ? getReferenceFromData(data, tier, "Imagens") : null,
  };

  const tierLabel = tier ? getTierLabel(tier, data) : "";

  return {
    positioning,
    perFormatReference,
    tierLabel,
    datasetVersion: data.datasetVersion,
  };
}

// Re-export the engine adapter mapping in case future callers need it.
export { ADAPTER_TO_ENGINE };