/**
 * Shared shape guard for `analysis_snapshots.normalized_payload`.
 *
 * Used by every server-side PDF route (admin/email and public) so that the
 * minimum surface required by `renderReportPdf` is validated identically.
 * Optional fields like `posts` and `format_stats` are tolerated as missing.
 */

import type {
  CompetitorAnalysis,
  PublicAnalysisContentSummary,
  PublicAnalysisProfile,
} from "@/lib/analysis/types";

export interface NormalizedSnapshotPayload {
  profile: PublicAnalysisProfile;
  content_summary: PublicAnalysisContentSummary;
  competitors: CompetitorAnalysis[];
}

export function isNormalizedPayload(
  value: unknown,
): value is NormalizedSnapshotPayload {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  if (!obj.profile || typeof obj.profile !== "object") return false;
  if (!obj.content_summary || typeof obj.content_summary !== "object") return false;
  if (!Array.isArray(obj.competitors)) return false;
  const profile = obj.profile as Record<string, unknown>;
  if (typeof profile.username !== "string") return false;
  return true;
}