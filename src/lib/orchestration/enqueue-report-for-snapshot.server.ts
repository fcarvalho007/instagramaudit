/**
 * Garante que existe um `report_request` (PDF + email) para o par
 * `(lead_id, analysis_snapshot_id)` e dispara o pipeline em background.
 *
 * Idempotente:
 *   - se já existir uma linha para o par, devolve o id existente sem
 *     re-enfileirar (o pipeline já tem o seu próprio guard de
 *     `request_status='processing'|'completed'`).
 *   - tolera a corrida do índice único `report_requests_lead_snapshot_unique`
 *     (PostgreSQL `23505`).
 *
 * Usado por:
 *   - `/api/onboarding/start` logo após criar a conta + lead.
 *   - Server fn `enqueueReportForSnapshot` chamada por `analyze.$username`
 *     como rede de segurança (utilizadores autenticados que cheguem ao
 *     snapshot sem report associado).
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  runInBackground,
  runReportPipeline,
} from "@/lib/orchestration/run-report-pipeline";
import { ensureReportSnapshotForRequest } from "@/lib/report-snapshots/persist-report-snapshot.server";

export interface EnqueueArgs {
  leadId: string;
  userId?: string | null;
  instagramUsername: string;
  analysisSnapshotId: string;
  competitorUsernames?: string[];
  origin: string;
  source?: string; // request_source
}

export interface EnqueueResult {
  ok: boolean;
  reportRequestId?: string;
  created: boolean;
  reason?: string;
}

export async function enqueueReportForSnapshot(
  args: EnqueueArgs,
): Promise<EnqueueResult> {
  const {
    leadId,
    userId,
    instagramUsername,
    analysisSnapshotId,
    competitorUsernames = [],
    origin,
    source = "onboarding_signup",
  } = args;

  // 1) Já existe?
  const existing = await supabaseAdmin
    .from("report_requests")
    .select("id, user_id")
    .eq("lead_id", leadId)
    .eq("analysis_snapshot_id", analysisSnapshotId)
    .limit(1)
    .maybeSingle();

  if (existing.error) {
    console.error("[enqueue-report] lookup failed", existing.error);
    return { ok: false, created: false, reason: "lookup_failed" };
  }

  if (existing.data) {
    // Backfill user_id se faltar
    if (userId && !existing.data.user_id) {
      await supabaseAdmin
        .from("report_requests")
        .update({ user_id: userId, updated_at: new Date().toISOString() })
        .eq("id", existing.data.id);
    }
    return { ok: true, reportRequestId: existing.data.id, created: false };
  }

  // 2) Insert
  const inserted = await supabaseAdmin
    .from("report_requests")
    .insert({
      lead_id: leadId,
      user_id: userId ?? null,
      instagram_username: instagramUsername,
      competitor_usernames: competitorUsernames,
      analysis_snapshot_id: analysisSnapshotId,
      request_source: source,
      request_status: "pending",
      is_free_request: true,
      metadata: {
        flow: "onboarding_first",
        source,
      },
    })
    .select("id")
    .single();

  let reportRequestId: string;

  if (inserted.error || !inserted.data) {
    const code = (inserted.error as { code?: string } | null)?.code;
    if (code === "23505") {
      // race — re-fetch
      const race = await supabaseAdmin
        .from("report_requests")
        .select("id")
        .eq("lead_id", leadId)
        .eq("analysis_snapshot_id", analysisSnapshotId)
        .limit(1)
        .maybeSingle();
      if (!race.data?.id) {
        console.error("[enqueue-report] 23505 but no row", race.error);
        return { ok: false, created: false, reason: "race_not_found" };
      }
      reportRequestId = race.data.id;
      return { ok: true, reportRequestId, created: false };
    }
    console.error("[enqueue-report] insert failed", inserted.error);
    return { ok: false, created: false, reason: "insert_failed" };
  }

  reportRequestId = inserted.data.id;

  // 3) Persist immutable report snapshot (fail-soft)
  await ensureReportSnapshotForRequest(reportRequestId, "beta_request", {
    handle: instagramUsername,
    leadId,
    snapshotId: analysisSnapshotId,
  });

  // 4) Kick off pipeline (PDF → email)
  runInBackground(runReportPipeline(reportRequestId, origin));

  return { ok: true, reportRequestId, created: true };
}