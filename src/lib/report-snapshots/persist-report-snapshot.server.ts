/**
 * Phase 2 — Persiste um `report_snapshots` imutável associado a um
 * `report_request`. Idempotente, fail-soft, sem providers.
 *
 * Idempotência em três camadas:
 *   1. short-circuit se `report_requests.report_snapshot_id` já preenchido
 *   2. índice único parcial `report_snapshots_report_request_id_unique`
 *   3. recovery 23505 → re-SELECT
 *
 * Não lança. Em qualquer falha devolve `snapshotId: null` + `reason`.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { recordProductEvent } from "@/lib/tracking.server";
import {
  buildReportSnapshotPayload,
} from "./build-report-snapshot-payload.server";
import {
  REPORT_PAYLOAD_SCHEMA_VERSION,
  REPORT_VERSION_FREE_V1,
} from "./schema";
import { getReportSnapshotExpiresAt } from "@/lib/report/retention";

export type PersistSource =
  | "public_unlock"
  | "beta_request"
  | "admin_generate";

export type PersistReason =
  | "missing_request"
  | "missing_analysis_snapshot"
  | "build_error"
  | "insert_error";

export interface PersistResult {
  snapshotId: string | null;
  created: boolean;
  reason?: PersistReason;
  /**
   * Mensagem técnica curta e sanitizada (≤300 chars). Sem emails,
   * sem tokens longos, sem JSON bruto. Só presente em casos de falha.
   */
  errorMessage?: string;
  sourceAnalysisSnapshotId?: string | null;
  payloadSchemaVersion?: string;
  reportVersion?: string;
  algorithmVersion?: string;
  expiresAt?: string;
}

const MAX_ERROR_MESSAGE_LENGTH = 300;

/**
 * Extrai uma mensagem técnica curta de um erro arbitrário, garantindo
 * que não vazam emails, tokens, secrets, payloads JSON ou stack traces.
 */
function sanitizeErrorMessage(err: unknown): string {
  let raw: string | undefined;
  if (err instanceof Error) raw = err.message;
  else if (typeof err === "string") raw = err;
  else if (err && typeof err === "object" && "message" in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === "string") raw = m;
  }
  if (!raw) return "unknown_error";
  const trimmed = raw.trim();
  if (!trimmed) return "unknown_error";
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return "non_text_error";

  let cleaned = trimmed
    // emails
    .replace(/\S+@\S+\.\S+/g, "[email]")
    // tokens longos / JWTs / chaves
    .replace(/[A-Za-z0-9_\-]{32,}/g, "[token]")
    // controle / quebras de linha
    .replace(/[\r\n\t\u0000-\u001F]+/g, " ")
    // colapsar whitespace
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return "unknown_error";
  if (cleaned.length > MAX_ERROR_MESSAGE_LENGTH) {
    cleaned = cleaned.slice(0, MAX_ERROR_MESSAGE_LENGTH - 1) + "…";
  }
  return cleaned;
}

export async function persistReportSnapshotInternal(
  reportRequestId: string,
  source: PersistSource,
): Promise<PersistResult> {
  const db = supabaseAdmin as any;

  // 1. Carregar report_request
  const { data: rr, error: rrErr } = await db
    .from("report_requests")
    .select(
      "id, lead_id, user_id, instagram_username, competitor_usernames, analysis_snapshot_id, report_snapshot_id",
    )
    .eq("id", reportRequestId)
    .maybeSingle();

  if (rrErr || !rr) {
    console.error(
      "[persist-report-snapshot] report_request not found",
      reportRequestId,
      rrErr,
    );
    return { snapshotId: null, created: false, reason: "missing_request" };
  }

  // 2. Já existe → short-circuit
  if (rr.report_snapshot_id) {
    return { snapshotId: rr.report_snapshot_id as string, created: false };
  }

  // 3. Sem analysis_snapshot_id (ex.: unlock pré-análise) → nada a fazer
  if (!rr.analysis_snapshot_id) {
    return {
      snapshotId: null,
      created: false,
      reason: "missing_analysis_snapshot",
    };
  }

  // 4. Carregar analysis_snapshot fonte
  const { data: snap, error: snapErr } = await db
    .from("analysis_snapshots")
    .select("id, instagram_username, normalized_payload, created_at")
    .eq("id", rr.analysis_snapshot_id)
    .maybeSingle();

  if (snapErr || !snap) {
    console.error(
      "[persist-report-snapshot] analysis_snapshot not found",
      rr.analysis_snapshot_id,
      snapErr,
    );
    return {
      snapshotId: null,
      created: false,
      reason: "missing_analysis_snapshot",
    };
  }

  // 5. Construir payload
  const competitors = Array.isArray(rr.competitor_usernames)
    ? (rr.competitor_usernames as string[])
    : [];

  let built;
  try {
    built = buildReportSnapshotPayload({
      normalized_payload: snap.normalized_payload,
      instagram_username: rr.instagram_username as string,
      competitor_usernames: competitors,
      generated_at: snap.created_at as string,
    });
  } catch (err) {
    console.error(
      "[persist-report-snapshot] payload build failed",
      reportRequestId,
      err,
    );
    return {
      snapshotId: null,
      created: false,
      reason: "build_error",
      errorMessage: sanitizeErrorMessage(err),
    };
  }

  const nowIso = new Date().toISOString();
  const expiresAt = getReportSnapshotExpiresAt(new Date()).toISOString();

  // 6. Insert
  const { data: inserted, error: insertErr } = await db
    .from("report_snapshots")
    .insert({
      report_request_id: rr.id,
      lead_id: rr.lead_id,
      user_id: rr.user_id ?? null,
      source_analysis_snapshot_id: rr.analysis_snapshot_id,
      instagram_username: rr.instagram_username,
      competitor_usernames: competitors,
      payload_schema_version: REPORT_PAYLOAD_SCHEMA_VERSION,
      report_payload_jsonb: built.payload,
      report_version: REPORT_VERSION_FREE_V1,
      algorithm_version: built.algorithm_version,
      expires_at: expiresAt,
      metadata: { source, persisted_at: nowIso },
    })
    .select("id")
    .single();

  let snapshotId: string | null = null;
  let created = false;

  if (insertErr || !inserted) {
    // 7. Race: índice parcial único — recuperar existente
    if ((insertErr as { code?: string } | null)?.code === "23505") {
      const { data: race } = await db
        .from("report_snapshots")
        .select("id")
        .eq("report_request_id", rr.id)
        .limit(1)
        .maybeSingle();
      if (race?.id) {
        snapshotId = race.id as string;
        created = false;
      } else {
        console.error(
          "[persist-report-snapshot] 23505 but no row found",
          reportRequestId,
          insertErr,
        );
        return {
          snapshotId: null,
          created: false,
          reason: "insert_error",
          errorMessage: sanitizeErrorMessage(insertErr),
        };
      }
    } else {
      console.error(
        "[persist-report-snapshot] insert failed",
        reportRequestId,
        insertErr,
      );
      return {
        snapshotId: null,
        created: false,
        reason: "insert_error",
        errorMessage: sanitizeErrorMessage(insertErr),
      };
    }
  } else {
    snapshotId = inserted.id as string;
    created = true;
  }

  // 8. Best-effort link no report_request (se ainda NULL)
  if (snapshotId) {
    await db
      .from("report_requests")
      .update({
        report_snapshot_id: snapshotId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", rr.id)
      .is("report_snapshot_id", null);
  }

  return {
    snapshotId,
    created,
    sourceAnalysisSnapshotId: rr.analysis_snapshot_id as string,
    payloadSchemaVersion: REPORT_PAYLOAD_SCHEMA_VERSION,
    reportVersion: REPORT_VERSION_FREE_V1,
    algorithmVersion: built.algorithm_version,
    expiresAt,
  };
}

/**
 * Wrapper fail-soft usado pelos call sites (await-able). Em sucesso emite
 * `report_snapshot_persisted`; em falha emite `report_snapshot_persist_failed`
 * com o motivo. Nunca lança. Idempotente — só emite `_persisted` quando um
 * novo snapshot é efectivamente criado (não em short-circuit).
 */
export async function ensureReportSnapshotForRequest(
  reportRequestId: string,
  source: PersistSource,
  ctx?: { handle?: string; leadId?: string | null; snapshotId?: string | null },
): Promise<PersistResult> {
  try {
    const result = await persistReportSnapshotInternal(reportRequestId, source);

    if (result.created && result.snapshotId) {
      try {
        await recordProductEvent({
          eventType: "report_snapshot_persisted",
          leadId: ctx?.leadId ?? null,
          snapshotId: ctx?.snapshotId ?? null,
          handle: ctx?.handle,
          metadata: {
            report_request_id: reportRequestId,
            report_snapshot_id: result.snapshotId,
            source,
            source_analysis_snapshot_id: result.sourceAnalysisSnapshotId ?? null,
            created: true,
            payload_schema_version: result.payloadSchemaVersion,
            report_version: result.reportVersion,
            algorithm_version: result.algorithmVersion,
            expires_at: result.expiresAt,
          },
        });
      } catch {
        /* event tracking is best-effort */
      }
    } else if (!result.snapshotId && result.reason && result.reason !== "missing_analysis_snapshot") {
      try {
        await recordProductEvent({
          eventType: "report_snapshot_persist_failed",
          leadId: ctx?.leadId ?? null,
          snapshotId: ctx?.snapshotId ?? null,
          handle: ctx?.handle,
          metadata: {
            report_request_id: reportRequestId,
            source,
            reason: result.reason,
            error_message: result.errorMessage ?? null,
          },
        });
      } catch {
        /* event tracking is best-effort */
      }
    }
    return result;
  } catch (err) {
    console.error(
      "[persist-report-snapshot] unexpected error",
      reportRequestId,
      err,
    );
    return {
      snapshotId: null,
      created: false,
      reason: "insert_error",
      errorMessage: sanitizeErrorMessage(err),
    };
  }
}

/**
 * @deprecated Usar `ensureReportSnapshotForRequest`. Mantido temporariamente
 * para retro-compatibilidade durante a migração da Fase 2.
 */
export const persistReportSnapshotForRequest = ensureReportSnapshotForRequest;