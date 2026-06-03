/**
 * Public server function that validates a coupon against a product without
 * applying any state change. Used by the pricing page coupon input.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { PRODUCT_CODES } from "./products";

const inputSchema = z
  .object({
    code: z.string().trim().min(1).max(40).regex(/^[A-Za-z0-9_-]+$/),
    product_code: z.enum(PRODUCT_CODES),
  })
  .strict();

export interface CouponCheckResult {
  valid: boolean;
  reason?: string;
  discount_percent?: number;
  final_cents?: number;
  original_cents?: number;
}

export const checkCoupon = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => inputSchema.parse(raw))
  .handler(async ({ data }): Promise<CouponCheckResult> => {
    const { getServerProduct } = await import("./products.server");
    const { validateCouponForProduct } = await import("./coupons.server");
    const { recordProductEvent } = await import("@/lib/tracking.server");
    const { getLeadFromCookie } = await import(
      "@/lib/leads/lead-cookie.server"
    );

    const product = getServerProduct(data.product_code);
    const result = await validateCouponForProduct(
      data.code,
      data.product_code,
      product.amountCents,
    );

    let leadId: string | null = null;
    try {
      leadId = getLeadFromCookie();
    } catch {
      leadId = null;
    }

    await recordProductEvent({
      eventType: "pricing_coupon_attempt",
      leadId,
      metadata: {
        product_code: data.product_code,
        valid: result.valid,
        reason: result.reason ?? null,
      },
    }).catch(() => {});

    return {
      valid: result.valid,
      reason: result.reason,
      discount_percent: result.discountPercent,
      final_cents: result.finalCents,
      original_cents: result.originalCents,
    };
  });