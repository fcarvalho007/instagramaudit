/**
 * Server-only helper: builds the data block for the `report-summary` email
 * from a snapshot. Returns `null` if any of the 4 required KPIs or the
 * top post are unavailable — caller should record `report_summary_skipped_no_data`.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  snapshotToReportData,
  type SnapshotPayload,
} from "@/lib/report/snapshot-to-report-data";
import { buildReportBenchmarkInput } from "@/lib/report/benchmark-input.server";
import type {
  ReportSummaryKpis,
  ReportSummaryTopPost,
} from "./templates/report-summary";

export interface ReportSummaryEmailData {
  instagramHandle: string;
  kpis: ReportSummaryKpis;
  topPost: ReportSummaryTopPost;
}

export async function buildReportSummaryEmailData(
  snapshotId: string,
): Promise<ReportSummaryEmailData | null> {
  if (!snapshotId) return null;

  const { data: snap } = await (supabaseAdmin as any)
    .from("analysis_snapshots")
    .select("id, instagram_username, normalized_payload")
    .eq("id", snapshotId)
    .maybeSingle();

  if (!snap?.normalized_payload || !snap.instagram_username) return null;

  const payload = snap.normalized_payload as SnapshotPayload;
  let benchmark;
  try {
    benchmark = await buildReportBenchmarkInput(payload);
  } catch {
    benchmark = undefined;
  }

  const { data } = snapshotToReportData({ payload, benchmark, isAdminPreview: false });

  const followers = data.profile.followers;
  const engagementPct = data.keyMetrics.engagementRate;
  const dominantFormat = data.keyMetrics.dominantFormat;
  const benchmarkDeltaPp = data.keyMetrics.engagementDeltaPct;
  const top = data.topPosts[0];

  // Hard gate: every KPI must be a real, non-zero-or-otherwise-meaningful
  // value. Followers and engagement of zero are treated as missing data.
  if (
    !Number.isFinite(followers) || followers <= 0 ||
    !Number.isFinite(engagementPct) || engagementPct <= 0 ||
    !dominantFormat ||
    !top ||
    !Number.isFinite(top.engagementPct) || top.engagementPct <= 0
  ) {
    return null;
  }

  return {
    instagramHandle: snap.instagram_username as string,
    kpis: {
      followers,
      engagementPct,
      dominantFormat,
      benchmarkDeltaPp: Number.isFinite(benchmarkDeltaPp) ? benchmarkDeltaPp : 0,
    },
    topPost: {
      format: top.format,
      engagementPct: top.engagementPct,
      thumbnailUrl: (top as { thumbnailUrl?: string }).thumbnailUrl ?? null,
      permalink: top.permalink ?? null,
    },
  };
}