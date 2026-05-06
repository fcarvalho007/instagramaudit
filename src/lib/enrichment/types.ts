/**
 * Enrichment pipeline types (server-only).
 */

export type EnrichmentType =
  | "dataforseo"
  | "insights_v1"
  | "insights_v2"
  | "visual_cover"
  | "caption_semantic";

export type EnrichmentStatus =
  | "pending"
  | "running"
  | "success"
  | "error"
  | "skipped";

export interface EnrichmentJobRow {
  id: string;
  snapshot_id: string;
  analysis_event_id: string | null;
  handle: string;
  enrichment_type: EnrichmentType;
  status: EnrichmentStatus;
  priority: number;
  attempts: number;
  max_attempts: number;
  input_hash: string | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EnrichmentResult {
  ok: boolean;
  /** JSON patch to merge into snapshot.normalized_payload */
  payloadPatch: Record<string, unknown> | null;
  error?: string;
}

/** Priority mapping: lower = runs first. */
export const ENRICHMENT_PRIORITY: Record<EnrichmentType, number> = {
  dataforseo: 10,
  insights_v1: 20,
  insights_v2: 21,
  visual_cover: 30,
  caption_semantic: 31,
};

/** All enrichment types in priority order. */
export const ALL_ENRICHMENT_TYPES: EnrichmentType[] = [
  "dataforseo",
  "insights_v1",
  "insights_v2",
  "visual_cover",
  "caption_semantic",
];