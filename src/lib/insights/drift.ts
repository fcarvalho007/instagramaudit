/**
 * Drift detection helpers for persisted `ai_insights_v1` blocks.
 *
 * Pure module — no I/O, no fetch. The OpenAI prompt module already
 * computes a deterministic `inputs_hash` for any given InsightsContext.
 * When a snapshot is re-opened, an admin can re-compute the current hash
 * and compare it to the persisted one to decide whether the AI insights
 * still reflect the underlying data.
 *
 * The actual on-demand regeneration UI is intentionally NOT part of the
 * MVP; this helper just gives the future admin button a cheap, reliable
 * staleness signal.
 */
import type { SnapshotPayload } from "@/lib/report/snapshot-to-report-data";

/**
 * Pull the `inputs_hash` persisted alongside `ai_insights_v1`. Returns
 * null when the block is missing, malformed, or pre-dates the
 * `source_signals` field.
 */
export function getPersistedInputsHash(
  payload: SnapshotPayload | null | undefined,
): string | null {
  const ai = payload?.ai_insights_v1;
  const hash = ai?.source_signals?.inputs_hash;
  if (typeof hash !== "string" || hash.length === 0) return null;
  return hash;
}

/**
 * True when persisted insights exist but their `inputs_hash` differs
 * from the freshly recomputed one — i.e. the underlying snapshot data
 * has shifted since the last OpenAI run.
 *
 * Returns false when no persisted block exists (nothing to be stale
 * about) and when the hashes match. Callers that want to distinguish
 * "no insights" from "fresh insights" should use `getPersistedInputsHash`
 * first.
 */
export function isAiInsightsStale(
  payload: SnapshotPayload | null | undefined,
  currentInputsHash: string,
): boolean {
  const persisted = getPersistedInputsHash(payload);
  if (!persisted) return false;
  return persisted !== currentInputsHash;
}
