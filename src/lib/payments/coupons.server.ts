/**
 * Server-only coupon helpers. Stays minimal: validation, application during
 * checkout, and idempotent redemption registration on webhook success.
 *
 * Discount math is integer-cents only so we never end up with sub-cent rows.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";

import type { ProductCode } from "./products";

export interface CouponRow {
  code: string;
  discount_percent: number;
  applies_to: string[] | null;
  max_uses: number | null;
  uses: number;
  expires_at: string | null;
  active: boolean;
}

export interface CouponValidation {
  valid: boolean;
  reason?:
    | "not_found"
    | "inactive"
    | "expired"
    | "exhausted"
    | "not_applicable";
  discountPercent?: number;
  finalCents?: number;
  originalCents?: number;
}

export function normalizeCouponCode(input: string): string {
  return input.trim().toUpperCase();
}

export async function loadCoupon(code: string): Promise<CouponRow | null> {
  const normalized = normalizeCouponCode(code);
  if (!normalized) return null;
  const { data, error } = await supabaseAdmin
    .from("payment_coupons")
    .select("code, discount_percent, applies_to, max_uses, uses, expires_at, active")
    .eq("code", normalized)
    .maybeSingle();
  if (error) throw new Error(`loadCoupon failed: ${error.message}`);
  return (data as CouponRow | null) ?? null;
}

export function applyCouponToAmount(
  amountCents: number,
  discountPercent: number,
): number {
  const discounted = Math.round(amountCents * (1 - discountPercent / 100));
  // Never let a coupon drive an order to 0 or below — minimum 100 cents.
  return Math.max(100, discounted);
}

export async function validateCouponForProduct(
  rawCode: string,
  productCode: ProductCode,
  amountCents: number,
): Promise<CouponValidation> {
  const code = normalizeCouponCode(rawCode);
  if (!code) return { valid: false, reason: "not_found" };

  const row = await loadCoupon(code);
  if (!row) return { valid: false, reason: "not_found" };
  if (!row.active) return { valid: false, reason: "inactive" };
  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    return { valid: false, reason: "expired" };
  }
  if (row.max_uses != null && row.uses >= row.max_uses) {
    return { valid: false, reason: "exhausted" };
  }
  if (
    row.applies_to &&
    row.applies_to.length > 0 &&
    !row.applies_to.includes(productCode)
  ) {
    return { valid: false, reason: "not_applicable" };
  }

  const finalCents = applyCouponToAmount(amountCents, row.discount_percent);
  return {
    valid: true,
    discountPercent: row.discount_percent,
    finalCents,
    originalCents: amountCents,
  };
}

/**
 * Idempotent: the partial unique index on `payment_id` swallows duplicates
 * silently. Only increments `uses` when the redemption row is newly created.
 */
export async function redeemCouponForPayment(input: {
  couponCode: string;
  paymentId: string;
  productCode: string;
  leadId: string;
}): Promise<{ recorded: boolean }> {
  const code = normalizeCouponCode(input.couponCode);
  if (!code) return { recorded: false };

  const { error } = await supabaseAdmin
    .from("coupon_redemptions")
    .insert({
      coupon_code: code,
      payment_id: input.paymentId,
      product_code: input.productCode,
      lead_id: input.leadId,
    });

  if (error) {
    if ((error as { code?: string }).code === "23505") {
      return { recorded: false };
    }
    throw new Error(`redeemCouponForPayment failed: ${error.message}`);
  }

  // Best-effort increment; webhook stays successful even if this fails.
  try {
    const { data: row } = await supabaseAdmin
      .from("payment_coupons")
      .select("uses")
      .eq("code", code)
      .maybeSingle();
    const nextUses = ((row?.uses as number | undefined) ?? 0) + 1;
    await supabaseAdmin
      .from("payment_coupons")
      .update({ uses: nextUses })
      .eq("code", code);
  } catch (err) {
    console.error("[coupons] increment uses failed", err);
  }

  return { recorded: true };
}