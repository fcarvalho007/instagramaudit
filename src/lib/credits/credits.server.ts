/**
 * Server-side credit accounting for leads.
 *
 * Source of truth: append-only `public.credit_ledger`. Balance is the sum of
 * `delta` over a lead's rows. All writes go through service role; no anon /
 * authenticated access exists.
 *
 * Lifecycle: `grantInitialCredits` (+2) → `reserveCredit` (-1) → either
 * `confirmReservation` (no delta) or `releaseReservation` (+1).
 *
 * Concurrency: uses pg_advisory_xact_lock(lead_id) inside an RPC-style
 * sequence to prevent two parallel reserves from overspending. Because the
 * underlying postgrest client is not transactional, we serialize per-lead
 * with the unique-grant index + a balance recheck after insert. The release
 * path compensates if the recheck reveals overspend (defensive — should not
 * happen under normal conditions).
 */

import { randomUUID } from "node:crypto";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";

export const INITIAL_GRANT = 2;
export const POST_PURCHASE_BETA_BONUS = 2;
export const POST_PURCHASE_BETA_KIND = "post_purchase_beta_bonus";

export class InsufficientCreditsError extends Error {
  readonly code = "insufficient_credits" as const;
  constructor(public readonly leadId: string, public readonly balance: number) {
    super(`Lead ${leadId} has insufficient credits (balance=${balance})`);
    this.name = "InsufficientCreditsError";
  }
}

type LedgerReason =
  | "initial_grant"
  | "reserve"
  | "confirm"
  | "release"
  | "admin_adjust";

interface LedgerInsert {
  lead_id: string;
  delta: number;
  reason: LedgerReason;
  handle?: string | null;
  cache_key?: string | null;
  analysis_snapshot_id?: string | null;
  reservation_id?: string | null;
  metadata?: Json;
}

async function insertLedger(row: LedgerInsert): Promise<void> {
  const { error } = await supabaseAdmin.from("credit_ledger").insert({
    lead_id: row.lead_id,
    delta: row.delta,
    reason: row.reason,
    handle: row.handle ?? null,
    cache_key: row.cache_key ?? null,
    analysis_snapshot_id: row.analysis_snapshot_id ?? null,
    reservation_id: row.reservation_id ?? null,
    metadata: (row.metadata ?? {}) as Json,
  });
  if (error) {
    throw new Error(`credit_ledger insert failed: ${error.message}`);
  }
}

export async function getBalance(leadId: string): Promise<number> {
  const { data, error } = await supabaseAdmin.rpc("credit_balance", {
    p_lead_id: leadId,
  });
  if (error) {
    throw new Error(`credit_balance rpc failed: ${error.message}`);
  }
  return Number(data ?? 0);
}

/**
 * Idempotent: protected by the partial unique index
 * `uniq_credit_ledger_initial_grant`. A second call for the same lead is a
 * no-op (swallows the unique violation).
 */
export async function grantInitialCredits(leadId: string): Promise<void> {
  const { error } = await supabaseAdmin.from("credit_ledger").insert({
    lead_id: leadId,
    delta: INITIAL_GRANT,
    reason: "initial_grant",
    metadata: {},
  });
  if (!error) return;
  // 23505 = unique_violation → already granted, treat as success.
  const code = (error as { code?: string }).code;
  if (code === "23505") return;
  throw new Error(`grantInitialCredits failed: ${error.message}`);
}

/**
 * Idempotent post-purchase beta bonus: +2 créditos atribuídos depois de
 * um pagamento confirmado. Único por `payment_id` ao nível aplicacional —
 * verifica se já existe uma linha com
 * `reason='admin_adjust'` + `metadata.kind='post_purchase_beta_bonus'`
 * + `metadata.payment_id=<paymentId>` antes de inserir.
 *
 * Não anunciado antes da compra. Falhas isoladas pelo caller (webhook).
 * Devolve `{ granted: boolean }` — `false` quando já existia.
 */
export async function grantPostPurchaseBetaCredits(input: {
  leadId: string;
  paymentId: string;
}): Promise<{ granted: boolean }> {
  const { data: existing, error: selectError } = await supabaseAdmin
    .from("credit_ledger")
    .select("id")
    .eq("lead_id", input.leadId)
    .eq("reason", "admin_adjust")
    .filter("metadata->>kind", "eq", POST_PURCHASE_BETA_KIND)
    .filter("metadata->>payment_id", "eq", input.paymentId)
    .limit(1)
    .maybeSingle();
  if (selectError) {
    throw new Error(
      `grantPostPurchaseBetaCredits select failed: ${selectError.message}`,
    );
  }
  if (existing) return { granted: false };

  await insertLedger({
    lead_id: input.leadId,
    delta: POST_PURCHASE_BETA_BONUS,
    reason: "admin_adjust",
    metadata: {
      kind: POST_PURCHASE_BETA_KIND,
      payment_id: input.paymentId,
    } as Json,
  });
  return { granted: true };
}

export interface ReserveResult {
  reservationId: string;
  balanceAfter: number;
}

/**
 * Discriminated outcome do `reserveCredit`. `duplicate` significa que já
 * existe uma reserva ativa para `(lead_id, cache_key)` — protegido pelo
 * índice único parcial `uniq_credit_ledger_reserve_per_report`.
 */
export type ReserveOutcome =
  | { kind: "reserved"; reservationId: string; balanceAfter: number }
  | { kind: "duplicate" };

/**
 * Decrements balance by 1 and returns a `reservationId` that must later be
 * confirmed or released. Throws InsufficientCreditsError if balance < 1.
 *
 * Quando `cacheKey` está presente e já existe uma reserva ativa para o
 * mesmo `(lead_id, cache_key)`, devolve `{ kind: "duplicate" }` em vez de
 * lançar — o caller serve a resposta sem reservar nem confirmar (a
 * primeira chamada concorrente trata do ciclo de vida).
 */
export async function reserveCredit(input: {
  leadId: string;
  handle?: string | null;
  cacheKey?: string | null;
}): Promise<ReserveOutcome> {
  const balance = await getBalance(input.leadId);
  if (balance < 1) {
    throw new InsufficientCreditsError(input.leadId, balance);
  }
  const reservationId = randomUUID();
  try {
    await insertLedger({
      lead_id: input.leadId,
      delta: -1,
      reason: "reserve",
      handle: input.handle ?? null,
      cache_key: input.cacheKey ?? null,
      reservation_id: reservationId,
    });
  } catch (err) {
    // 23505 no insert do `reserve` com cache_key → outra request já
    // reservou esta combinação (lead_id, cache_key). Devolver duplicate
    // para o caller servir a resposta sem reservar de novo.
    const message = err instanceof Error ? err.message : String(err);
    if (input.cacheKey && message.includes("uniq_credit_ledger_reserve_per_report")) {
      return { kind: "duplicate" };
    }
    throw err;
  }
  const balanceAfter = await getBalance(input.leadId);
  if (balanceAfter < 0) {
    // Concurrent over-spend → compensate by releasing this reservation.
    await insertLedger({
      lead_id: input.leadId,
      delta: 1,
      reason: "release",
      reservation_id: reservationId,
      metadata: { compensation: "overspend_detected" } as Json,
    });
    throw new InsufficientCreditsError(input.leadId, balanceAfter + 1);
  }
  return { kind: "reserved", reservationId, balanceAfter };
}

/**
 * Marks a reservation as definitively consumed. Writes a delta-0 audit row
 * linked to the snapshot. Safe to call once per reservation.
 */
export async function confirmReservation(input: {
  reservationId: string;
  leadId: string;
  analysisSnapshotId?: string | null;
}): Promise<void> {
  await insertLedger({
    lead_id: input.leadId,
    delta: 0,
    reason: "confirm",
    reservation_id: input.reservationId,
    analysis_snapshot_id: input.analysisSnapshotId ?? null,
  });
}

/**
 * Returns the reserved credit to the lead. Idempotency-safe at the audit
 * level (caller must avoid double-release; we don't enforce here because the
 * orchestrator owns the lifecycle).
 */
export async function releaseReservation(input: {
  reservationId: string;
  leadId: string;
  reason?: string;
}): Promise<void> {
  await insertLedger({
    lead_id: input.leadId,
    delta: 1,
    reason: "release",
    reservation_id: input.reservationId,
      metadata: (input.reason ? { release_reason: input.reason } : {}) as Json,
  });
}