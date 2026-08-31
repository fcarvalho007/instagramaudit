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

export type SnapshotAccessLevel = "free" | "lead" | "pro" | "internal_lab";

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

/**
 * Fields delivered to an identified lead (Estado B — email capturado, sem
 * pagamento). Comment Intelligence é gratuito depois do email, por isso
 * não pode ser removido para este nível.
 */
export const LEAD_SNAPSHOT_FIELDS = ["comment_intelligence"] as const;

export function sanitizeSnapshotForAccessLevel<
  T extends Record<string, unknown>,
>(payload: T, accessLevel: SnapshotAccessLevel): T {
  if (accessLevel === "pro" || accessLevel === "internal_lab") return payload;
  const allowed = new Set<string>(
    accessLevel === "lead" ? LEAD_SNAPSHOT_FIELDS : [],
  );
  // Free/lead: shallow clone, drop paid fields. Non-mutating by design.
  const next: Record<string, unknown> = { ...payload };
  for (const key of PAID_SNAPSHOT_FIELDS) {
    if (allowed.has(key)) continue;
    if (key in next) delete next[key];
  }
  return next as T;
}
