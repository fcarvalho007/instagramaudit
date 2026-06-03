/**
 * Server function for creating an EuPago checkout for the current lead.
 * Called from the premium CTA. Returns a checkout URL the client redirects to.
 *
 * NOTE: This file is client-importable. Any server-only helpers must be
 * imported INSIDE `.handler()` with `await import(...)` so the
 * client.server module never reaches the browser bundle.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  PRODUCT_CODES,
  type ProductCode,
} from "./products";

const inputSchema = z
  .object({
    product_code: z.enum(PRODUCT_CODES),
    instagram_username: z
      .string()
      .trim()
      .min(1)
      .max(60)
      .regex(/^[A-Za-z0-9._]+$/)
      .optional(),
    report_cache_key: z.string().trim().min(1).max(200).optional(),
    return_path: z
      .string()
      .trim()
      .max(200)
      .regex(/^\/[A-Za-z0-9/_\-.?=&%]*$/, "must be a relative path")
      .optional(),
    source_component: z.string().trim().min(1).max(80).optional(),
    coupon_code: z
      .string()
      .trim()
      .min(1)
      .max(40)
      .regex(/^[A-Za-z0-9_-]+$/)
      .optional(),
    qualification: z
      .object({
        objective: z.enum([
          "improve_content",
          "growth_diagnostic",
          "brand_strategy",
          "competitor_compare",
          "other",
        ]),
        objective_other: z.string().trim().max(200).optional(),
        profile_ownership: z.enum([
          "mine",
          "my_brand",
          "client",
          "competitor",
        ]),
      })
      .optional(),
    upsell_interest: z
      .object({
        audit: z.boolean(),
        workshop: z.boolean(),
      })
      .optional(),
    billing: z
      .object({
        name: z.string().trim().min(1).max(200),
        tax_id: z
          .string()
          .trim()
          .regex(/^\d{9}$/)
          .optional(),
        address: z.string().trim().min(1).max(200),
        postal_code: z
          .string()
          .trim()
          .regex(/^\d{4}-?\d{3}$/),
        city: z.string().trim().min(1).max(120),
        invoice_email: z.string().trim().email().max(200),
      })
      .optional(),
  })
  .strict();

export type CreateCheckoutInput = z.infer<typeof inputSchema>;

export interface CreateCheckoutResult {
  ok: true;
  checkout_url: string;
  payment_id: string;
  product_code: ProductCode;
}

export const createEupagoCheckout = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => inputSchema.parse(raw))
  .handler(async ({ data }): Promise<CreateCheckoutResult> => {
    const { getLeadFromCookie } = await import(
      "@/lib/leads/lead-cookie.server"
    );
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { getServerProduct } = await import("./products.server");
    const { createEupagoCheckout: providerCreate } = await import(
      "./eupago.server"
    );
    const { recordProductEvent } = await import("@/lib/tracking.server");
    const { validateCouponForProduct, normalizeCouponCode } = await import(
      "./coupons.server"
    );

    const leadId = getLeadFromCookie();
    if (!leadId) {
      throw new Error("Unauthorized: no lead session");
    }

    const product = getServerProduct(data.product_code);

    // Re-validate the coupon server-side. The client value is advisory only.
    let appliedCents = product.amountCents;
    let appliedCoupon: string | null = null;
    let appliedDiscountPercent: number | null = null;
    if (data.coupon_code) {
      const couponResult = await validateCouponForProduct(
        data.coupon_code,
        data.product_code,
        product.amountCents,
      );
      if (couponResult.valid && couponResult.finalCents) {
        appliedCents = couponResult.finalCents;
        appliedCoupon = normalizeCouponCode(data.coupon_code);
        appliedDiscountPercent = couponResult.discountPercent ?? null;
      }
    }

    // Insert pending payment row first so we have a stable internal id.
    const { data: paymentRow, error: insertErr } = await supabaseAdmin
      .from("lead_payments")
      .insert({
        lead_id: leadId,
        product: product.code,
        amount_cents: appliedCents,
        currency: product.currency,
        status: "pending",
        provider: "eupago",
        report_cache_key: data.report_cache_key ?? null,
        instagram_username: data.instagram_username ?? null,
        checkout_started_at: new Date().toISOString(),
        metadata: {
          source_component: data.source_component ?? null,
          coupon_code: appliedCoupon,
          discount_percent: appliedDiscountPercent,
          original_amount_cents: appliedCoupon ? product.amountCents : null,
          qualification: data.qualification ?? null,
          upsell_interest: data.upsell_interest ?? null,
          billing: data.billing ?? null,
        } as never,
      })
      .select("id")
      .single();

    if (insertErr || !paymentRow) {
      throw new Error(`Failed to create payment row: ${insertErr?.message}`);
    }

    const baseUrl = (process.env.APP_BASE_URL ?? "").replace(/\/+$/, "");
    if (!baseUrl) {
      throw new Error("APP_BASE_URL not configured");
    }

    // Look up the lead email for the EuPago customer field (optional).
    let customerEmail: string | null = null;
    try {
      const { data: lead } = await supabaseAdmin
        .from("leads")
        .select("email")
        .eq("id", leadId)
        .maybeSingle();
      customerEmail = lead?.email ?? null;
    } catch {
      /* non-fatal */
    }

    try {
      const result = await providerCreate({
        productCode: product.code,
        amountCents: appliedCents,
        currency: product.currency,
        description: product.description,
        internalPaymentId: paymentRow.id,
        returnUrl: `${baseUrl}${data.return_path ?? "/"}`,
        webhookUrl: `${baseUrl}/api/public/eupago-webhook`,
        customerEmail,
      });

      await supabaseAdmin
        .from("lead_payments")
        .update({
          provider_payment_id: result.providerPaymentId,
          provider_reference: result.providerReference,
          provider_checkout_url: result.checkoutUrl,
        })
        .eq("id", paymentRow.id);

      await recordProductEvent({
        eventType: "payment_checkout_created",
        leadId,
        metadata: {
          payment_id: paymentRow.id,
          product_code: product.code,
          amount_cents: appliedCents,
          original_amount_cents: product.amountCents,
          coupon_code: appliedCoupon,
          discount_percent: appliedDiscountPercent,
          source_component: data.source_component ?? null,
        },
      });

      if (appliedCoupon) {
        await recordProductEvent({
          eventType: "pricing_coupon_applied",
          leadId,
          metadata: {
            payment_id: paymentRow.id,
            product_code: product.code,
            coupon_code: appliedCoupon,
            discount_percent: appliedDiscountPercent,
            final_cents: appliedCents,
          },
        }).catch(() => {});
      }

      return {
        ok: true,
        checkout_url: result.checkoutUrl,
        payment_id: paymentRow.id,
        product_code: product.code,
      };
    } catch (err) {
      await supabaseAdmin
        .from("lead_payments")
        .update({ status: "failed" })
        .eq("id", paymentRow.id);

      await recordProductEvent({
        eventType: "payment_checkout_failed",
        leadId,
        metadata: {
          payment_id: paymentRow.id,
          product_code: product.code,
          error: err instanceof Error ? err.message : String(err),
          source_component: data.source_component ?? null,
        },
      });

      throw new Error(
        "Não foi possível iniciar o pagamento. Tenta novamente em instantes.",
      );
    }
  });