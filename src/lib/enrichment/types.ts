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
  | "skipped"
  | "disabled";

/** Per-enrichment-type status map embedded in normalized_payload. */
export type EnrichmentStatusMap = Record<
  EnrichmentType | "comments",
  EnrichmentStatus
>;

/** Build a fresh enrichment_status with all types set to "pending". */
export function buildInitialEnrichmentStatus(): EnrichmentStatusMap {
  return {
    dataforseo: "pending",
    insights_v1: "pending",
    insights_v2: "pending",
    visual_cover: "pending",
    caption_semantic: "pending",
    comments: "pending",
  };
}

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

/**
 * Enrichments needed for the **Free / Public** report path.
 *
 * The current Free shell (`report-shell-v2.tsx` with
 * `mode="free_with_engagement"`) renders only:
 *   - Hero (Apify-derived)
 *   - Engagement card (deterministic)
 *   - 5 static `PremiumTeaserCard`s
 *
 * Nothing in that path reads `ai_insights_v1`, `ai_insights_v2`,
 * DataForSEO, visual covers or caption semantics. We therefore skip
 * every AI/DFS enrichment until the user upgrades to Pro.
 */
export const FREE_ENRICHMENT_TYPES: EnrichmentType[] = [];

/**
 * Enrichments needed once a lead unlocks Pro (post-purchase).
 * These are enqueued against the existing snapshot when an entitlement
 * is granted (see `enqueuePaidEnrichments`). The runner itself is
 * idempotent: it short-circuits when the relevant payload key is
 * already present.
 */
export const PAID_ENRICHMENT_TYPES: EnrichmentType[] = [
  "dataforseo",
  "insights_v1",
  "insights_v2",
  "visual_cover",
  "caption_semantic",
];

/**
 * Build the initial `enrichment_status` map for a Free snapshot:
 * Paid enrichments are pre-marked as `skipped` so admin diagnostics
 * (analysis-cost-breakdown, execution-mode) reflect reality. Comments
 * stay `pending` because they are gated separately by
 * `COMMENT_SCRAPER_ENABLED`.
 */
export function buildFreeEnrichmentStatus(): EnrichmentStatusMap {
  const status = buildInitialEnrichmentStatus();
  for (const t of PAID_ENRICHMENT_TYPES) {
    status[t] = "skipped";
  }
  return status;
}