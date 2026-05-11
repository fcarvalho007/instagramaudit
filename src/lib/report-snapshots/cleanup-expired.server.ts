/**
 * Phase 4 — Cleanup nocturno de `report_snapshots` expirados.
 *
 * Liberta `report_payload_jsonb` (passa a `NULL`) e marca `expired_at`
 * para snapshots cujo `expires_at <= now()`. Mantém toda a metadata
 * histórica (id, instagram_username, competitor_usernames, versões,
 * relações). Idempotente: re-correr não muda nada.
 *
 * Não toca em `analysis_snapshots`, providers, emails ou storage.
 * Nunca lança — falhas são registadas como `report_snapshots_cleanup_failed`.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { recordProductEvent } from "@/lib/tracking.server";

export interface CleanupOptions {
  batchSize?: number;
  maxBatches?: number;
  now?: Date;
}

export interface CleanupBatchError {
  batchIndex: number;
  message: string;
}

export interface CleanupResult {
  ok: boolean;
  scanned: number;
  expiredCount: number;
  batches: number;
  durationMs: number;
  errors: CleanupBatchError[];
}

const DEFAULT_BATCH_SIZE = 100;
const DEFAULT_MAX_BATCHES = 10;

export async function cleanupExpiredReportSnapshots(
  opts: CleanupOptions = {},
): Promise<CleanupResult> {
  const batchSize = opts.batchSize ?? DEFAULT_BATCH_SIZE;
  const maxBatches = opts.maxBatches ?? DEFAULT_MAX_BATCHES;
  const now = opts.now ?? new Date();
  const nowIso = now.toISOString();

  const db = supabaseAdmin as any;
  const started = Date.now();

  const result: CleanupResult = {
    ok: true,
    scanned: 0,
    expiredCount: 0,
    batches: 0,
    durationMs: 0,
    errors: [],
  };

  for (let batchIndex = 0; batchIndex < maxBatches; batchIndex += 1) {
    const { data: rows, error: selErr } = await db
      .from("report_snapshots")
      .select("id, expires_at, expired_at")
      .lte("expires_at", nowIso)
      .not("report_payload_jsonb", "is", null)
      .limit(batchSize);

    if (selErr) {
      result.ok = false;
      result.errors.push({
        batchIndex,
        message: `select_failed: ${selErr.message ?? String(selErr)}`,
      });
      await recordProductEvent({
        eventType: "report_snapshots_cleanup_failed",
        metadata: {
          phase: "select",
          batch_index: batchIndex,
          error_message: selErr.message ?? String(selErr),
        },
      });
      break;
    }

    const list = (rows ?? []) as Array<{
      id: string;
      expires_at: string;
      expired_at: string | null;
    }>;

    if (list.length === 0) break;

    result.scanned += list.length;
    const ids = list.map((r) => r.id);

    const { error: updErr } = await db
      .from("report_snapshots")
      .update({ report_payload_jsonb: null, expired_at: nowIso })
      .in("id", ids)
      .is("expired_at", null);

    // Segundo update para snapshots que já tinham expired_at mas ainda
    // tinham payload (defensivo — não sobrescreve expired_at original).
    const { error: updErr2 } = await db
      .from("report_snapshots")
      .update({ report_payload_jsonb: null })
      .in("id", ids)
      .not("expired_at", "is", null);

    const firstErr = updErr ?? updErr2;
    if (firstErr) {
      result.ok = false;
      result.errors.push({
        batchIndex,
        message: `update_failed: ${firstErr.message ?? String(firstErr)}`,
      });
      await recordProductEvent({
        eventType: "report_snapshots_cleanup_failed",
        metadata: {
          phase: "update",
          batch_index: batchIndex,
          snapshot_ids: ids,
          error_message: firstErr.message ?? String(firstErr),
        },
      });
      // Continua para próximo batch (defensivo)
      result.batches += 1;
      if (list.length < batchSize) break;
      continue;
    }

    result.expiredCount += list.length;
    result.batches += 1;

    const expiresAtValues = list.map((r) => r.expires_at).filter(Boolean);
    const expiresAtMin = expiresAtValues.length
      ? expiresAtValues.reduce((a, b) => (a < b ? a : b))
      : null;
    const expiresAtMax = expiresAtValues.length
      ? expiresAtValues.reduce((a, b) => (a > b ? a : b))
      : null;

    await recordProductEvent({
      eventType: "report_snapshots_expired_batch",
      metadata: {
        count: list.length,
        snapshot_ids: ids,
        expires_at_min: expiresAtMin,
        expires_at_max: expiresAtMax,
        run_at: nowIso,
        batch_index: batchIndex,
      },
    });

    if (list.length < batchSize) break;
  }

  result.durationMs = Date.now() - started;
  return result;
}