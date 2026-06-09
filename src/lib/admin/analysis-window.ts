/**
 * Admin helper — derives the analysis window from `analysis_events.analysis_window`
 * or, as fallback, by parsing the `:w=30d` / `:w=90d` suffix from a cache_key.
 * No suffix → baseline.
 */

import type { AdminAccent } from "@/components/admin/v2/admin-tokens";

export type AnalysisWindow = "baseline" | "30d" | "90d" | "other";

export function deriveWindow(
  analysisWindow: string | null | undefined,
  cacheKey: string | null | undefined,
): AnalysisWindow {
  const aw = analysisWindow?.toLowerCase();
  if (aw === "30d" || aw === "90d" || aw === "baseline") return aw;
  const m = cacheKey?.match(/:w=(\d{1,3}d)$/i);
  if (m) {
    const v = m[1].toLowerCase();
    if (v === "30d" || v === "90d") return v;
    return "other";
  }
  return "baseline";
}

export function windowBadgeVariant(w: AnalysisWindow): AdminAccent {
  if (w === "30d") return "info";
  if (w === "90d") return "revenue";
  if (w === "other") return "signal";
  return "neutral";
}

export function windowLabel(w: AnalysisWindow): string {
  if (w === "30d") return "30d";
  if (w === "90d") return "90d";
  if (w === "other") return "outro";
  return "baseline";
}

export function dataSourceBadgeVariant(
  ds: string | null | undefined,
): AdminAccent {
  switch ((ds ?? "").toLowerCase()) {
    case "fresh":
      return "signal";
    case "fresh_forced":
      // Pro user-initiated force_refresh — louder than "fresh" because
      // it intentionally bypassed a fresh cache hit and consumed credit.
      return "revenue";
    case "cache":
      return "neutral";
    case "stale":
      return "expense";
    case "blocked":
      return "danger";
    default:
      return "neutral";
  }
}

/**
 * Friendly admin label for a raw `data_source` value. Keeps existing
 * tokens ("fresh"/"cache"/"stale") and renders "fresh_forced" as
 * "Fresh (forçado)".
 */
export function dataSourceLabel(ds: string | null | undefined): string {
  switch ((ds ?? "").toLowerCase()) {
    case "fresh_forced":
      return "fresh (forçado)";
    default:
      return ds ?? "—";
  }
}