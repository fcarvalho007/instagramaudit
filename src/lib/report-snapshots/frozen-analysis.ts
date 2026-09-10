/** Versioned presentation state, shared by history and both PDF renderers. */
const FIELDS = [
  "profile_experiments_v2",
  "profile",
  "content_summary",
  "posts",
  "format_stats",
  "weekday_counts",
  "weekday_counts_iso",
  "top_hashtags",
  "top_keywords",
  "top_themes",
  "competitors",
  "analysis_window",
  "analysis_window_end",
  "analysis_window_label",
  "analysis_window_observed_days",
  "analysis_window_truncated",
  "comparison_version",
  "comparison_context",
  "collection_coverage",
  "ai_comparison_readings_v1",
  "ai_comparison_readings_v2",
  "ai_insights_v1",
  "ai_insights_v2",
  "caption_semantic_analysis",
  "visual_cover_analysis",
  "comment_intelligence",
  "market_signals_free",
  "market_signals_paid",
  "enrichment_status",
  "data_provenance",
  "benchmark_snapshot",
] as const;
function clean(value: unknown): unknown {
  if (typeof value === "string") return value.startsWith("data:") ? null : value;
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !key.startsWith("_") && !["constructor", "prototype"].includes(key))
        .map(([key, v]) => [key, clean(v)]),
    );
  return value;
}
export function freezeAnalysis(payload: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    FIELDS.filter((key) => Object.hasOwn(payload, key)).map((key) => [key, clean(payload[key])]),
  );
}
export function readFrozenAnalysis(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== "object") return {};
  const p = payload as Record<string, unknown>;
  return p.schema_version === "report.v2" &&
    p.frozen_analysis &&
    typeof p.frozen_analysis === "object"
    ? (p.frozen_analysis as Record<string, unknown>)
    : p;
}
export function isAnalysisSettled(payload: Record<string, unknown>): boolean {
  const status = payload.enrichment_status;
  return (
    !status ||
    typeof status !== "object" ||
    !Object.values(status).some((v) => v === "pending" || v === "running")
  );
}
