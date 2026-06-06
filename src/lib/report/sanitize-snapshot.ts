/**
 * Response-level sanitisation for the public snapshot payload.
 *
 * Strips paid-only enriched fields (AI insights v1/v2, visual cover
 * analysis, caption semantic analysis, comment intelligence, market
 * signals) before the payload leaves the server for a non-Pro caller.
 *
 * Pure helper — does NOT mutate the input object, does NOT touch the DB.
 * The stored snapshot in `analysis_snapshots.normalized_payload` stays
 * exactly as written by the enrichment pipeline.
 */

export type SnapshotAccessLevel = "free" | "pro" | "internal_lab";

/**
 * Paid-only fields removed from the public snapshot payload for Free
 * callers. Keep aligned with `SnapshotPayload` in
 * `src/lib/report/snapshot-to-report-data.ts` and any future enrichment
 * additions.
 */
export const PAID_SNAPSHOT_FIELDS = [
  "ai_insights_v1",
  "ai_insights_v2",
  "visual_cover_analysis",
  "caption_semantic_analysis",
  "comment_intelligence",
  "market_signals_free",
  "market_signals_paid",
] as const;

export function sanitizeSnapshotForAccessLevel<
  T extends Record<string, unknown>,
>(payload: T, accessLevel: SnapshotAccessLevel): T {
  if (accessLevel === "pro" || accessLevel === "internal_lab") return payload;
  // Free: shallow clone, drop paid fields. Non-mutating by design.
  const next: Record<string, unknown> = { ...payload };
  for (const key of PAID_SNAPSHOT_FIELDS) {
    if (key in next) delete next[key];
  }
  return next as T;
}