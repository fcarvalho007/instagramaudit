/**
 * Minimal entitlements helper. Idempotent thanks to the
 * `(lead_id, product_code)` unique constraint.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { ProductCode } from "./products";

export interface GrantEntitlementInput {
  leadId: string;
  productCode: ProductCode;
  paymentId: string;
  metadata?: Record<string, unknown>;
}

export async function grantEntitlement(
  input: GrantEntitlementInput,
): Promise<{ created: boolean }> {
  const { error } = await supabaseAdmin
    .from("lead_entitlements")
    .insert({
      lead_id: input.leadId,
      product_code: input.productCode,
      payment_id: input.paymentId,
      metadata: (input.metadata ?? {}) as never,
    })
    .select("id")
    .single();

  if (error) {
    // 23505 = unique_violation → already granted. Treat as success.
    if ((error as { code?: string }).code === "23505") {
      return { created: false };
    }
    throw new Error(`grantEntitlement failed: ${error.message}`);
  }
  return { created: true };
}

export async function hasEntitlement(
  leadId: string,
  productCode: ProductCode,
): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("lead_entitlements")
    .select("id")
    .eq("lead_id", leadId)
    .eq("product_code", productCode)
    .maybeSingle();
  if (error) throw new Error(`hasEntitlement failed: ${error.message}`);
  return Boolean(data);
}