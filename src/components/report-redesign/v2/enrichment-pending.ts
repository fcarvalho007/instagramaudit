import type { SnapshotPayload } from "@/lib/report/snapshot-to-report-data";
import type {
  EnrichmentStatus,
  EnrichmentType,
} from "@/lib/enrichment/types";

export type EnrichmentDisplayState =
  | "ready"
  | "pending"
  | "error"
  | "skipped_free";

/**
 * Read a single enrichment's display state from the snapshot payload.
 *
 * Maps the raw `enrichment_status` value to a UI-friendly state:
 *   - "pending" | "running" → "pending"
 *   - "error"               → "error"
 *   - "skipped_free"        → "skipped_free" (Free tier — show teaser instead)
 *   - "success" | "skipped" | "disabled" | missing → "ready" (degrade silently)
 */
export function getEnrichmentState(
  payload: SnapshotPayload | undefined,
  type: EnrichmentType,
): EnrichmentDisplayState {
  const map = payload?.enrichment_status as
    | Record<string, EnrichmentStatus>
    | undefined;
  const status = map?.[type];
  if (status === "pending" || status === "running") return "pending";
  if (status === "error") return "error";
  if (status === "skipped_free") return "skipped_free";
  return "ready";
}