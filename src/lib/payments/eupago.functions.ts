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
import { safeReturnPath } from "@/lib/security/safe-return-path";
import {
  SAFE_CHECKOUT_PREPARE_ERROR,
  safeCheckoutPrepareError,
} from "./checkout-errors";

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
        audit_interest: z.boolean().optional(),
        workshop_interest: z.boolean().optional(),
        audit_interest_context: z
          .enum(["full_digital_audit"])
          .nullable()
          .optional(),
        workshop_interest_context: z
          .enum(["team_workshop"])
          .nullable()
          .optional(),
      })
      .optional(),
    report_priority: z
      .enum([
        "content",
        "frequency",
        "formats",
        "comparison",
        "recommendations",
      ])
      .optional(),
    report_goals: z
      .array(
        z.enum([
          "compare_competitors",
          "what_to_publish",
          "what_works",
          "present_to_client",
        ]),
      )
      .min(1)
      .max(4)
      .optional(),
    upsell: z
      .object({
        presented: z.boolean(),
        accepted: z.boolean(),
        source_product: z.enum(PRODUCT_CODES),
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
    // Compatibility-only: ignored server-side. Lead id is always resolved
    // from the signed `lead_session` cookie, never from the client.
    lead_id: z.string().trim().max(64).optional(),
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
    const { resolveCheckoutIdentity, isScopedCheckoutAllowed } = await import(
      "@/lib/leads/resolve-checkout-lead.server"
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

    // Identidade: `lead_session` (global) tem precedência; caso contrário
    // aceitamos `report_capture_session` desde que esteja assinada, dentro
    // do TTL e ligada exactamente ao relatório indicado.
    const identity = await resolveCheckoutIdentity({
      reportRef: data.report_cache_key ?? null,
    });

    if (!identity.leadId) {
      // eslint-disable-next-line no-console
      console.warn("[checkout] no valid checkout identity");
      throw safeCheckoutPrepareError();
    }

    // Identidade scoped só pode comprar o produto ligado ao relatório.
    // Packs e diagnóstico humano continuam a exigir sessão global.
    if (
      identity.source === "report_capture_session" &&
      !isScopedCheckoutAllowed(data.product_code)
    ) {
      // eslint-disable-next-line no-console
      console.warn("[checkout] scoped identity cannot buy product", {
        product: data.product_code,
      });
      throw safeCheckoutPrepareError();
    }

    // Verify the lead row still exists. Stale cookies (lead deleted) used
    // to crash with `lead_payments_lead_id_fkey` and leak the raw error.
    const { data: leadRow, error: leadErr } = await supabaseAdmin
      .from("leads")
      .select("id, email")
      .eq("id", identity.leadId)
      .maybeSingle();

    if (leadErr) {
      // eslint-disable-next-line no-console
      console.error("[checkout] lead lookup failed", leadErr);
      throw safeCheckoutPrepareError();
    }
    if (!leadRow) {
      // eslint-disable-next-line no-console
      console.warn("[checkout] identity points to missing lead", {
        leadId: identity.leadId,
      });
      throw safeCheckoutPrepareError();
    }

    const leadId = leadRow.id;
    const customerEmailFromLead: string | null = leadRow.email ?? null;

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

    const upsellSource =
      data.upsell?.source_product ?? null;
    const upsellPresented = data.upsell?.presented ?? false;
    const upsellAccepted = data.upsell?.accepted ?? false;
    const upsellFrom =
      upsellAccepted && upsellSource && upsellSource !== product.code
        ? upsellSource
        : null;
    const upsellTo = upsellFrom ? product.code : null;

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
          report_priority: data.report_priority ?? null,
          report_goals: data.report_goals ?? null,
          primary_goal: data.report_goals?.[0] ?? null,
          billing: data.billing ?? null,
          source_product: upsellSource ?? product.code,
          target_product: upsellPresented
            ? "authority_diagnosis_97"
            : null,
          final_product: product.code,
          upsell_presented: upsellPresented,
          upsell_accepted: upsellAccepted,
          upsell_from: upsellFrom,
          upsell_to: upsellTo,
        } as never,
      })
      .select("id")
      .single();

    if (insertErr || !paymentRow) {
      // eslint-disable-next-line no-console
      console.error("[checkout] lead_payments insert failed", {
        leadId,
        product: product.code,
        message: insertErr?.message,
        code: (insertErr as { code?: string } | null)?.code,
      });
      throw safeCheckoutPrepareError();
    }

    const baseUrl = (process.env.APP_BASE_URL ?? "").replace(/\/+$/, "");
    if (!baseUrl) {
      throw new Error("APP_BASE_URL not configured");
    }

    const customerEmail = customerEmailFromLead;

    try {
      const result = await providerCreate({
        productCode: product.code,
        amountCents: appliedCents,
        currency: product.currency,
        description: product.description,
        internalPaymentId: paymentRow.id,
      returnUrl: `${baseUrl}${safeReturnPath(data.return_path, "/")}`,
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
          source_product: upsellSource ?? product.code,
          final_product: product.code,
          upsell_presented: upsellPresented,
          upsell_accepted: upsellAccepted,
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

      throw new Error(SAFE_CHECKOUT_PREPARE_ERROR);
    }
  });