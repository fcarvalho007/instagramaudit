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

  // 3) Persist immutable report snapshot (awaited — fail-soft).
  //    Tem de estar feito ANTES de devolver, senão report_snapshot_id
  //    fica para sempre a NULL quando o caller é uma fire-and-forget
  //    no Cloudflare Worker (a promise é terminada após o response).
  try {
    await ensureReportSnapshotForRequest(reportRequestId, "beta_request", {
      handle: instagramUsername,
      leadId,
      snapshotId: analysisSnapshotId,
    });
  } catch (err) {
    console.warn("[enqueue-report] ensureReportSnapshot warn (soft)", err);
  }

  // 4) Kick off pipeline via internal endpoint (NOT via in-process
  //    promise). No Cloudflare Workers as promessas soltas com `void`
  //    são terminadas ao devolver o Response; um subrequest HTTP
  //    inicia um novo isolate cujo lifecycle é independente.
  triggerPipelineSubrequest(reportRequestId, origin);

  return { ok: true, reportRequestId, created: true };
}

function triggerPipelineSubrequest(
  reportRequestId: string,
  origin: string,
): void {
  const token = process.env.INTERNAL_API_TOKEN;
  if (!token) {
    console.error(
      "[enqueue-report] INTERNAL_API_TOKEN missing — pipeline will not run",
    );
    return;
  }
  // Initiate the subrequest but don't await: the worker stays alive
  // until the parent handler returns Response, which is long enough to
  // open the outbound TCP connection. The target endpoint runs the
  // pipeline synchronously in its own isolate.
  fetch(`${origin}/api/internal/run-report-pipeline`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-token": token,
    },
    body: JSON.stringify({ report_request_id: reportRequestId, origin }),
  }).catch((err) => {
    const msg = err instanceof Error ? err.message : "unknown";
    console.warn(
      `[enqueue-report] pipeline subrequest failed for ${reportRequestId}: ${msg}`,
    );
  });
}