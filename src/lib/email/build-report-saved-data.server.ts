/**
 * Server-only data builder para o email `report_saved`.
 *
 * Nunca lança. Lê apenas dados existentes (snapshots, credit_balance RPC,
 * constantes) e devolve uma struct totalmente formada para o renderer,
 * com `credits` ou `insights` a `null` quando o dado não é confiável.
 *
 * IMPORTANTE: não muta créditos, não escreve em DB, não toca em pagamentos
 * nem em entitlements. Só leitura.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  snapshotToReportData,
  type SnapshotPayload,
} from "@/lib/report/snapshot-to-report-data";
import { buildReportBenchmarkInput } from "@/lib/report/benchmark-input.server";
import { getBalance, INITIAL_GRANT } from "@/lib/credits/credits.server";
import { resolveReportUrl } from "./url";
import type {
  ReportSavedCredits,
  ReportSavedInsights,
} from "./templates/report-saved";

export interface BuildReportSavedDataArgs {
  snapshotId: string;
  instagramHandle: string;
  leadId: string;
  reportSnapshotId?: string | null;
  firstName: string | null;
  returningLead: boolean;
}

export interface ReportSavedEmailData {
  firstName: string | null;
  instagramHandle: string;
  reportUrl: string;
  analyzeAnotherUrl: string;
  variant: "welcome" | "returning";
  credits: ReportSavedCredits | null;
  insights: ReportSavedInsights | null;
}

const DEFAULT_BASE_URL = "https://auditprofiles.com";

function resolveAnalyzeAnotherUrl(): string {
  const base = (
    process.env.PUBLIC_APP_BASE_URL ??
    process.env.PDF_PUBLIC_BASE_URL ??
    DEFAULT_BASE_URL
  ).trim();
  return base.replace(/\/+$/, "") + "/";
}

function formatFollowers(n: number): string | null {
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n < 1000) return new Intl.NumberFormat("pt-PT").format(Math.round(n));
  const thousands = n / 1000;
  // 1 casa decimal, vírgula pt-PT
  const rounded = Math.round(thousands * 10) / 10;
  const str = rounded.toFixed(rounded >= 100 ? 0 : 1).replace(".", ",");
  return `${str} mil`;
}

function formatPercent(pct: number): string | null {
  if (!Number.isFinite(pct) || pct <= 0) return null;
  const decimals = pct < 1 ? 2 : 1;
  return `${pct.toFixed(decimals).replace(".", ",")}%`;
}

function formatBenchmarkDelta(deltaPct: number | null | undefined): string | null {
  if (deltaPct === null || deltaPct === undefined || !Number.isFinite(deltaPct)) {
    return null;
  }
  if (Math.abs(deltaPct) < 0.1) return "em linha com a média";
  const sign = deltaPct > 0 ? "+" : "−";
  const abs = Math.abs(deltaPct).toFixed(1).replace(".", ",");
  const direction = deltaPct > 0 ? "acima da média" : "abaixo da média";
  return `${sign}${abs} pp ${direction}`;
}

async function readInsights(
  snapshotId: string,
): Promise<ReportSavedInsights | null> {
  try {
    const { data: snap } = await (supabaseAdmin as any)
      .from("analysis_snapshots")
      .select("id, instagram_username, normalized_payload")
      .eq("id", snapshotId)
      .maybeSingle();
    if (!snap?.normalized_payload) return null;

    const payload = snap.normalized_payload as SnapshotPayload;
    let benchmark;
    try {
      benchmark = await buildReportBenchmarkInput(payload);
    } catch {
      benchmark = undefined;
    }
    const { data } = snapshotToReportData({
      payload,
      benchmark,
      isAdminPreview: false,
    });

    const followers = data.profile.followers;
    const engagementPct = data.keyMetrics.engagementRate;
    const dominantFormat = data.keyMetrics.dominantFormat;
    const deltaPp = data.keyMetrics.engagementDeltaPct;
    const top = data.topPosts[0];

    const followersLabel = formatFollowers(Number(followers));
    const engagementRate = formatPercent(Number(engagementPct));
    const benchmarkDelta = formatBenchmarkDelta(
      Number.isFinite(deltaPp) ? Number(deltaPp) : null,
    );
    const topPostFormat = top?.format ?? null;
    const topPostEngagement = top
      ? formatPercent(Number(top.engagementPct))
      : null;
    const domFormat = dominantFormat?.trim() || null;

    const insights: ReportSavedInsights = {
      followersLabel,
      dominantFormat: domFormat,
      engagementRate,
      benchmarkDelta,
      topPostFormat,
      topPostEngagement,
    };

    // Se NADA é utilizável, devolve null para o renderer mostrar fallback.
    const anyUseful =
      (followersLabel && domFormat) ||
      engagementRate ||
      (topPostFormat && topPostEngagement);
    return anyUseful ? insights : null;
  } catch (err) {
    console.error("[report-saved] readInsights failed:", err);
    return null;
  }
}

async function readCredits(
  leadId: string,
): Promise<ReportSavedCredits | null> {
  try {
    const remaining = await getBalance(leadId);
    if (!Number.isFinite(remaining) || remaining < 0) return null;
    const totalFree = INITIAL_GRANT;
    const used = Math.max(0, totalFree - remaining);
    return { totalFree, used, remaining };
  } catch (err) {
    console.error("[report-saved] readCredits failed:", err);
    return null;
  }
}

export async function buildReportSavedData(
  args: BuildReportSavedDataArgs,
): Promise<ReportSavedEmailData> {
  const reportUrl = resolveReportUrl(
    args.instagramHandle,
    args.reportSnapshotId ?? null,
  );
  const analyzeAnotherUrl = resolveAnalyzeAnotherUrl();

  const [insights, credits] = await Promise.all([
    readInsights(args.snapshotId),
    readCredits(args.leadId),
  ]);

  return {
    firstName: args.firstName,
    instagramHandle: args.instagramHandle,
    reportUrl,
    analyzeAnotherUrl,
    variant: args.returningLead ? "returning" : "welcome",
    credits,
    insights,
  };
}