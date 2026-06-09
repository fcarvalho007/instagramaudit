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
export const PURCHASE_INCLUDED_AMOUNT = 1;
export const PURCHASE_INCLUDED_KIND = "purchase_included_credit";
export const POST_PURCHASE_TOTAL_GRANTED =
  PURCHASE_INCLUDED_AMOUNT + POST_PURCHASE_BETA_BONUS;

/**
 * Kind for credits granted via a paid credit pack (`credit_pack_*` SKUs).
 * Distinct from `purchase_included_credit` / `post_purchase_beta_bonus`
 * so admin observability and analytics can differentiate "initial Pro
 * grant" from "subsequent pack top-up".
 */
export const CREDIT_PACK_KIND = "credit_pack_purchased";

/**
 * Bónus interno aplicado a cada compra de pack durante o lançamento
 * controlado: +2 créditos extra, não anunciados antes do pagamento.
 * Idempotente por `(lead_id, payment_id, kind)`.
 */
export const CREDIT_PACK_LAUNCH_BONUS_KIND = "credit_pack_launch_bonus";
export const CREDIT_PACK_LAUNCH_BONUS_AMOUNT = 2;

/**
 * Map a `credit_pack_*` product code to the amount of credits it grants.
 * Keep in sync with `SERVER_PRODUCTS`. Returns null when the SKU is not a
 * recognised credit-pack code.
 */
export function getCreditPackAmount(productCode: string): number | null {
  switch (productCode) {
    case "credit_pack_1":
      return 1;
    default:
      return null;
  }
}

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
  analysis_event_id?: string | null;
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
    analysis_event_id: row.analysis_event_id ?? null,
    metadata: (row.metadata ?? {}) as Json,
  });
  if (error) {
    throw new Error(`credit_ledger insert failed: ${error.message}`);
  }
}

/**
 * Back-fills `analysis_event_id` on the matching `reserve` row so the full
 * reserve→confirm/release chain becomes joinable via a single column.
 * Best-effort: a failure here is logged but never throws (credit lifecycle
 * already succeeded by the time we get here).
 */
async function backfillReserveEventId(
  reservationId: string,
  analysisEventId: string,
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("credit_ledger")
    .update({ analysis_event_id: analysisEventId })
    .eq("reservation_id", reservationId)
    .eq("reason", "reserve")
    .is("analysis_event_id", null);
  if (error) {
    console.error(
      "[credits] backfillReserveEventId failed",
      JSON.stringify({ reservationId, analysisEventId, message: error.message }),
    );
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
  productCode?: string | null;
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
      product_code: input.productCode ?? null,
      source: "payment_confirmed",
      beta_bonus: true,
      included_credits: PURCHASE_INCLUDED_AMOUNT,
      bonus_credits: POST_PURCHASE_BETA_BONUS,
      total_granted: POST_PURCHASE_TOTAL_GRANTED,
    } as Json,
  });
  return { granted: true };
}

/**
 * Idempotent +1 crédito "incluído na compra". Mesmo padrão de unicidade
 * aplicacional do bónus beta: `(lead_id, reason='admin_adjust',
 * metadata.kind='purchase_included_credit', metadata.payment_id)`.
 *
 * Apenas chamado pelo webhook EuPago para `report_full_9` (o caller é
 * responsável por restringir o produto).
 */
export async function grantPurchaseIncludedCredit(input: {
  leadId: string;
  paymentId: string;
  productCode?: string | null;
}): Promise<{ granted: boolean }> {
  const { data: existing, error: selectError } = await supabaseAdmin
    .from("credit_ledger")
    .select("id")
    .eq("lead_id", input.leadId)
    .eq("reason", "admin_adjust")
    .filter("metadata->>kind", "eq", PURCHASE_INCLUDED_KIND)
    .filter("metadata->>payment_id", "eq", input.paymentId)
    .limit(1)
    .maybeSingle();
  if (selectError) {
    throw new Error(
      `grantPurchaseIncludedCredit select failed: ${selectError.message}`,
    );
  }
  if (existing) return { granted: false };

  await insertLedger({
    lead_id: input.leadId,
    delta: PURCHASE_INCLUDED_AMOUNT,
    reason: "admin_adjust",
    metadata: {
      kind: PURCHASE_INCLUDED_KIND,
      payment_id: input.paymentId,
      product_code: input.productCode ?? null,
      source: "payment_confirmed",
      included_credits: PURCHASE_INCLUDED_AMOUNT,
      bonus_credits: POST_PURCHASE_BETA_BONUS,
      total_granted: POST_PURCHASE_TOTAL_GRANTED,
    } as Json,
  });
  return { granted: true };
}

/**
 * Idempotent grant for a paid credit pack (`credit_pack_*` SKUs).
 *
 * Unicidade aplicacional: `(lead_id, reason='admin_adjust',
 * metadata.kind='credit_pack_purchased', metadata.payment_id)` — uma
 * segunda execução para o mesmo `payment_id` devolve `{ granted: false }`
 * em vez de duplicar créditos. Apenas chamado pelo webhook EuPago após
 * confirmação do pagamento.
 */
export async function grantCreditPack(input: {
  leadId: string;
  paymentId: string;
  productCode: string;
  amount: number;
}): Promise<{ granted: boolean }> {
  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    throw new Error(
      `grantCreditPack: invalid amount ${input.amount} for ${input.productCode}`,
    );
  }

  const { data: existing, error: selectError } = await supabaseAdmin
    .from("credit_ledger")
    .select("id")
    .eq("lead_id", input.leadId)
    .eq("reason", "admin_adjust")
    .filter("metadata->>kind", "eq", CREDIT_PACK_KIND)
    .filter("metadata->>payment_id", "eq", input.paymentId)
    .limit(1)
    .maybeSingle();
  if (selectError) {
    throw new Error(
      `grantCreditPack select failed: ${selectError.message}`,
    );
  }
  if (existing) return { granted: false };

  await insertLedger({
    lead_id: input.leadId,
    delta: input.amount,
    reason: "admin_adjust",
    metadata: {
      kind: CREDIT_PACK_KIND,
      payment_id: input.paymentId,
      product_code: input.productCode,
      source: "payment_confirmed",
      pack_amount: input.amount,
    } as Json,
  });
  return { granted: true };
}

/**
 * Idempotent +2 créditos "bónus de lançamento controlado", aplicados
 * em cima de cada compra de pack (`credit_pack_*`). Não anunciado
 * antes do pagamento. Unicidade aplicacional:
 * `(lead_id, reason='admin_adjust',
 *   metadata.kind='credit_pack_launch_bonus', metadata.payment_id)`.
 */
export async function grantCreditPackLaunchBonus(input: {
  leadId: string;
  paymentId: string;
  productCode: string;
}): Promise<{ granted: boolean }> {
  const { data: existing, error: selectError } = await supabaseAdmin
    .from("credit_ledger")
    .select("id")
    .eq("lead_id", input.leadId)
    .eq("reason", "admin_adjust")
    .filter("metadata->>kind", "eq", CREDIT_PACK_LAUNCH_BONUS_KIND)
    .filter("metadata->>payment_id", "eq", input.paymentId)
    .limit(1)
    .maybeSingle();
  if (selectError) {
    throw new Error(
      `grantCreditPackLaunchBonus select failed: ${selectError.message}`,
    );
  }
  if (existing) return { granted: false };

  await insertLedger({
    lead_id: input.leadId,
    delta: CREDIT_PACK_LAUNCH_BONUS_AMOUNT,
    reason: "admin_adjust",
    metadata: {
      kind: CREDIT_PACK_LAUNCH_BONUS_KIND,
      payment_id: input.paymentId,
      product_code: input.productCode,
      source: "payment_confirmed",
      launch_bonus: true,
      bonus_credits: CREDIT_PACK_LAUNCH_BONUS_AMOUNT,
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
  analysisEventId?: string | null;
}): Promise<void> {
  await insertLedger({
    lead_id: input.leadId,
    delta: 0,
    reason: "confirm",
    reservation_id: input.reservationId,
    analysis_snapshot_id: input.analysisSnapshotId ?? null,
    analysis_event_id: input.analysisEventId ?? null,
  });
  if (input.analysisEventId) {
    await backfillReserveEventId(input.reservationId, input.analysisEventId);
  }
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
  analysisEventId?: string | null;
}): Promise<void> {
  await insertLedger({
    lead_id: input.leadId,
    delta: 1,
    reason: "release",
    reservation_id: input.reservationId,
    analysis_event_id: input.analysisEventId ?? null,
      metadata: (input.reason ? { release_reason: input.reason } : {}) as Json,
  });
  if (input.analysisEventId) {
    await backfillReserveEventId(input.reservationId, input.analysisEventId);
  }
}