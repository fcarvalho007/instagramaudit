/**
 * Server-side accounting para a wallet de "report unlocks" (packs Pro:
 * `report_pack_5`, `report_pack_10`). Append-only sobre
 * `lead_report_unlocks`. Separado de `credit_ledger` (créditos de análise)
 * e de `lead_entitlements` (entitlement booleano global de `report_full_9`).
 *
 * Lifecycle:
 *   - grantReportUnlockPack   (+N, reason='pack_grant')  — idempotente por payment_id
 *   - consumeReportUnlock     (-1, reason='unlock')      — idempotente por (lead, cache_key)
 *
 * Não acumula créditos de análise nem altera entitlement global.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";

export const REPORT_PACK_KIND = "report_unlock_pack" as const;

/**
 * Mapeia um SKU de pack para a quantidade de unlocks que concede. Mantém
 * sincronizado com `SERVER_PRODUCTS`. Devolve null quando o SKU não é
 * reconhecido como pack de relatórios.
 */
export function getReportPackAmount(productCode: string): number | null {
  switch (productCode) {
    case "report_pack_5":
      return 5;
    case "report_pack_10":
      return 10;
    default:
      return null;
  }
}

export async function getReportUnlocksBalance(leadId: string): Promise<number> {
  const { data, error } = await supabaseAdmin.rpc("report_unlocks_balance", {
    p_lead_id: leadId,
  });
  if (error) {
    throw new Error(`report_unlocks_balance rpc failed: ${error.message}`);
  }
  return Number(data ?? 0);
}

/**
 * Idempotente por `payment_id` (índice único parcial
 * `uniq_report_unlocks_pack_grant`). Apenas chamado pelo webhook EuPago
 * após confirmação do pagamento.
 */
export async function grantReportUnlockPack(input: {
  leadId: string;
  paymentId: string;
  productCode: string;
  amount: number;
}): Promise<{ granted: boolean }> {
  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    throw new Error(
      `grantReportUnlockPack: invalid amount ${input.amount} for ${input.productCode}`,
    );
  }
  const { error } = await supabaseAdmin.from("lead_report_unlocks").insert({
    lead_id: input.leadId,
    delta: input.amount,
    reason: "pack_grant",
    payment_id: input.paymentId,
    metadata: {
      kind: REPORT_PACK_KIND,
      product_code: input.productCode,
      source: "payment_confirmed",
      pack_amount: input.amount,
    } as Json,
  });
  if (!error) return { granted: true };
  const code = (error as { code?: string }).code;
  if (code === "23505") return { granted: false };
  throw new Error(`grantReportUnlockPack failed: ${error.message}`);
}

/**
 * Verifica se já existe um unlock consumido para um `(lead, cache_key)`.
 * Usado pelo entitlement check para considerar premium um relatório cujo
 * unlock já foi gasto.
 */
export async function hasUnlockForCacheKey(input: {
  leadId: string;
  reportCacheKey: string;
}): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("lead_report_unlocks")
    .select("id")
    .eq("lead_id", input.leadId)
    .eq("reason", "unlock")
    .eq("report_cache_key", input.reportCacheKey)
    .limit(1)
    .maybeSingle();
  if (error) {
    throw new Error(`hasUnlockForCacheKey failed: ${error.message}`);
  }
  return Boolean(data);
}

/**
 * Consome 1 unlock para um relatório Pro específico. Idempotente por
 * `(lead, cache_key)` graças ao índice único parcial
 * `uniq_report_unlocks_per_cache_key`:
 *   - `consumed: true` quando esta chamada gravou efectivamente o lançamento.
 *   - `already: true` quando já existia unlock para o mesmo cache_key
 *     (cobertura de re-tentativas e double-click).
 *   - `insufficient: true` quando o saldo é 0 e não há unlock prévio.
 */
export async function consumeReportUnlock(input: {
  leadId: string;
  reportCacheKey: string;
  instagramUsername?: string | null;
}): Promise<
  | { consumed: true; balanceAfter: number }
  | { already: true }
  | { insufficient: true; balance: number }
> {
  // Curto-circuito: já está consumido para este cache_key.
  if (
    await hasUnlockForCacheKey({
      leadId: input.leadId,
      reportCacheKey: input.reportCacheKey,
    })
  ) {
    return { already: true };
  }

  const balance = await getReportUnlocksBalance(input.leadId);
  if (balance < 1) {
    return { insufficient: true, balance };
  }

  const { error } = await supabaseAdmin.from("lead_report_unlocks").insert({
    lead_id: input.leadId,
    delta: -1,
    reason: "unlock",
    report_cache_key: input.reportCacheKey,
    instagram_username: input.instagramUsername ?? null,
    metadata: { source: "report_open" } as Json,
  });

  if (error) {
    // Corrida: outra request consumiu primeiro para o mesmo cache_key.
    const code = (error as { code?: string }).code;
    if (code === "23505") return { already: true };
    throw new Error(`consumeReportUnlock failed: ${error.message}`);
  }

  const balanceAfter = await getReportUnlocksBalance(input.leadId);
  return { consumed: true, balanceAfter };
}