/**
 * EuPago Webhooks 2.0 receiver.
 *
 * Security:
 *   - HMAC-SHA256 over raw body, verified with `EUPAGO_WEBHOOK_SECRET`.
 *   - Idempotent: re-deliveries do not duplicate entitlements or paid_at.
 *
 * EuPago has multiple payload shapes depending on payment method. We look
 * up the matching row by either `provider_payment_id` (set when we created
 * the checkout) or by `identifier` echoed back in the payload (our
 * internal payment row id).
 */

import { createFileRoute } from "@tanstack/react-router";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyWebhookSignature } from "@/lib/payments/eupago.server";
import { grantEntitlement } from "@/lib/payments/entitlements.server";
import {
  grantPostPurchaseBetaCredits,
  grantPurchaseIncludedCredit,
  POST_PURCHASE_BETA_BONUS,
  POST_PURCHASE_TOTAL_GRANTED,
  PURCHASE_INCLUDED_AMOUNT,
  PURCHASE_INCLUDED_KIND,
  POST_PURCHASE_BETA_KIND,
  CREDIT_PACK_KIND,
  getCreditPackAmount,
  grantCreditPack,
  grantCreditPackLaunchBonus,
  CREDIT_PACK_LAUNCH_BONUS_AMOUNT,
  CREDIT_PACK_LAUNCH_BONUS_KIND,
} from "@/lib/credits/credits.server";
import { recordProductEvent } from "@/lib/tracking.server";
import {
  enqueuePaidEnrichmentsForPayment,
  enqueueCommentScrapingForPayment,
} from "@/lib/enrichment/enqueue-paid.server";
import type { ProductCode } from "@/lib/payments/products";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface WebhookPayload {
  status?: string;
  state?: string;
  event?: string;
  identifier?: string;
  reference?: string;
  transactionID?: string;
  payment?: {
    id?: string;
    identifier?: string;
    reference?: string;
    status?: string;
  };
}

function pickStatus(payload: WebhookPayload): string {
  const raw =
    payload.status ??
    payload.state ??
    payload.payment?.status ??
    payload.event ??
    "";
  return raw.toLowerCase();
}

function normalizeStatus(raw: string): "paid" | "failed" | "expired" | "pending" {
  if (["paid", "success", "completed", "captured"].some((s) => raw.includes(s))) {
    return "paid";
  }
  if (raw.includes("expired")) return "expired";
  if (
    raw.includes("failed") ||
    raw.includes("cancel") ||
    raw.includes("rejected") ||
    raw.includes("declined")
  ) {
    return "failed";
  }
  return "pending";
}

export const Route = createFileRoute("/api/public/eupago-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawBody = await request.text();

        const signature =
          request.headers.get("x-eupago-signature") ??
          request.headers.get("x-signature") ??
          null;

        if (!verifyWebhookSignature(rawBody, signature)) {
          return new Response("Invalid signature", { status: 401 });
        }

        let payload: WebhookPayload;
        try {
          payload = JSON.parse(rawBody) as WebhookPayload;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const providerPaymentId =
          payload.payment?.id ??
          payload.transactionID ??
          payload.reference ??
          payload.payment?.reference ??
          null;

        const identifier =
          payload.identifier ?? payload.payment?.identifier ?? null;

        // Resolve payment row: prefer provider_payment_id, fall back to
        // our internal id we passed as `identifier`.
        type PaymentRow = {
          id: string;
          lead_id: string;
          product: string;
          status: string;
          paid_at: string | null;
          metadata: Record<string, unknown> | null;
          report_cache_key?: string | null;
        };
        let row: PaymentRow | null = null;

        if (providerPaymentId) {
          const { data } = await supabaseAdmin
            .from("lead_payments")
            .select("id, lead_id, product, status, paid_at, metadata, report_cache_key")
            .eq("provider_payment_id", providerPaymentId)
            .maybeSingle();
          row = (data as PaymentRow | null) ?? null;
        }
        if (!row && identifier && UUID_RE.test(identifier)) {
          const { data } = await supabaseAdmin
            .from("lead_payments")
            .select("id, lead_id, product, status, paid_at, metadata, report_cache_key")
            .eq("id", identifier)
            .maybeSingle();
          row = (data as PaymentRow | null) ?? null;
        }

        if (!row) {
          // Acknowledge so EuPago stops retrying, but log.
          console.warn(
            "[eupago-webhook] payment not found",
            { providerPaymentId, identifier },
          );
          return new Response("ok", { status: 200 });
        }

        const normalized = normalizeStatus(pickStatus(payload));

        if (normalized === "paid") {
          // Idempotent: if already paid, do nothing.
          if (row.status === "paid" && row.paid_at) {
            return new Response("ok", { status: 200 });
          }

          await supabaseAdmin
            .from("lead_payments")
            .update({
              status: "paid",
              paid_at: new Date().toISOString(),
              provider_payment_id: providerPaymentId ?? undefined,
            })
            .eq("id", row.id);

          // ── Credit-pack SKUs ─────────────────────────────────────────
          // Packs (`credit_pack_*`) só adicionam créditos. NÃO concedem
          // entitlement Pro, não disparam enrichments (o snapshot já está
          // pago) e não somam bónus beta. Idempotente por payment_id.
          const packAmount = getCreditPackAmount(row.product);
          if (packAmount != null) {
            try {
              const result = await grantCreditPack({
                leadId: row.lead_id,
                paymentId: row.id,
                productCode: row.product,
                amount: packAmount,
              });
              if (result.granted) {
                await recordProductEvent({
                  eventType: "credits_pack_granted",
                  leadId: row.lead_id,
                  metadata: {
                    payment_id: row.id,
                    product_code: row.product,
                    delta: packAmount,
                    kind: CREDIT_PACK_KIND,
                    source: "payment_confirmed",
                  },
                });
              }
            } catch (err) {
              console.error("[eupago-webhook] grantCreditPack failed", err);
            }

            // Bónus interno de lançamento controlado: +2 créditos extra
            // em cada compra de pack. Idempotente por payment_id.
            try {
              const bonus = await grantCreditPackLaunchBonus({
                leadId: row.lead_id,
                paymentId: row.id,
                productCode: row.product,
              });
              if (bonus.granted) {
                await recordProductEvent({
                  eventType: "credits_pack_launch_bonus_granted",
                  leadId: row.lead_id,
                  metadata: {
                    payment_id: row.id,
                    product_code: row.product,
                    delta: CREDIT_PACK_LAUNCH_BONUS_AMOUNT,
                    kind: CREDIT_PACK_LAUNCH_BONUS_KIND,
                    source: "payment_confirmed",
                    launch_bonus: true,
                  },
                });
              }
            } catch (err) {
              console.error(
                "[eupago-webhook] grantCreditPackLaunchBonus failed",
                err,
              );
            }

            // Coupon redemption ainda corre (caso queiramos lançar cupões
            // de pack no futuro); por agora `payment_coupons` valida
            // por produto e bloqueia se não existir.
            const couponCode =
              (row.metadata?.coupon_code as string | null | undefined) ?? null;
            if (couponCode) {
              try {
                const { redeemCouponForPayment } = await import(
                  "@/lib/payments/coupons.server"
                );
                await redeemCouponForPayment({
                  couponCode,
                  paymentId: row.id,
                  productCode: row.product,
                  leadId: row.lead_id,
                });
              } catch (err) {
                console.error(
                  "[eupago-webhook] coupon redemption failed (pack)",
                  err,
                );
              }
            }

            await recordProductEvent({
              eventType: "payment_webhook_paid",
              leadId: row.lead_id,
              metadata: {
                payment_id: row.id,
                product_code: row.product,
                provider_payment_id: providerPaymentId,
                pack_amount: packAmount,
              },
            });

            return new Response("ok", { status: 200 });
          }

          try {
            await grantEntitlement({
              leadId: row.lead_id,
              productCode: row.product as ProductCode,
              paymentId: row.id,
            });
          } catch (err) {
            console.error("[eupago-webhook] grantEntitlement failed", err);
          }

          // Top-up paid enrichments on the snapshot the user just unlocked.
          // Best-effort: never throws. Runs Apify-derived snapshot through
          // the DataForSEO + OpenAI + visual_cover + caption_semantic
          // pipeline so the Pro view has full data on next render.
          try {
            await enqueuePaidEnrichmentsForPayment({
              reportCacheKey: row.report_cache_key ?? null,
              origin: new URL(request.url).origin,
            });
          } catch (err) {
            console.error(
              "[eupago-webhook] enqueuePaidEnrichmentsForPayment failed",
              err,
            );
          }

          // Post-payment: also enqueue the comment scraper (Pro-only path).
          // Best-effort; bounded by per-snapshot budget plan in the scraper.
          try {
            await enqueueCommentScrapingForPayment({
              reportCacheKey: row.report_cache_key ?? null,
              origin: new URL(request.url).origin,
            });
          } catch (err) {
            console.error(
              "[eupago-webhook] enqueueCommentScrapingForPayment failed",
              err,
            );
          }

          // Créditos pós-compra: aplica-se apenas a `report_full_9`.
          // (+1 incluído na compra) + (+2 bónus beta) = 3.
          // Cada grant é idempotente por (lead_id, payment_id, metadata.kind).
          if (row.product === "report_full_9") {
            try {
              const included = await grantPurchaseIncludedCredit({
                leadId: row.lead_id,
                paymentId: row.id,
                productCode: row.product,
              });
              if (included.granted) {
                await recordProductEvent({
                  eventType: "credits_purchase_included_granted",
                  leadId: row.lead_id,
                  metadata: {
                    payment_id: row.id,
                    product_code: row.product,
                    delta: PURCHASE_INCLUDED_AMOUNT,
                    kind: PURCHASE_INCLUDED_KIND,
                    source: "payment_confirmed",
                    total_granted: POST_PURCHASE_TOTAL_GRANTED,
                  },
                });
              }
            } catch (err) {
              console.error(
                "[eupago-webhook] grantPurchaseIncludedCredit failed",
                err,
              );
            }

            try {
              const bonus = await grantPostPurchaseBetaCredits({
                leadId: row.lead_id,
                paymentId: row.id,
                productCode: row.product,
              });
              if (bonus.granted) {
                await recordProductEvent({
                  eventType: "credits_post_purchase_granted",
                  leadId: row.lead_id,
                  metadata: {
                    payment_id: row.id,
                    product_code: row.product,
                    delta: POST_PURCHASE_BETA_BONUS,
                    kind: POST_PURCHASE_BETA_KIND,
                    source: "payment_confirmed",
                    beta_bonus: true,
                    included_credits: PURCHASE_INCLUDED_AMOUNT,
                    bonus_credits: POST_PURCHASE_BETA_BONUS,
                    total_granted: POST_PURCHASE_TOTAL_GRANTED,
                  },
                });
              }
            } catch (err) {
              console.error(
                "[eupago-webhook] grantPostPurchaseBetaCredits failed",
                err,
              );
            }
          }

          // Register coupon redemption (idempotent) if the payment was created
          // with one.
          const couponCode =
            (row.metadata?.coupon_code as string | null | undefined) ?? null;
          if (couponCode) {
            try {
              const { redeemCouponForPayment } = await import(
                "@/lib/payments/coupons.server"
              );
              await redeemCouponForPayment({
                couponCode,
                paymentId: row.id,
                productCode: row.product,
                leadId: row.lead_id,
              });
            } catch (err) {
              console.error("[eupago-webhook] coupon redemption failed", err);
            }
          }

          await recordProductEvent({
            eventType: "payment_webhook_paid",
            leadId: row.lead_id,
            metadata: {
              payment_id: row.id,
              product_code: row.product,
              provider_payment_id: providerPaymentId,
            },
          });

          // Fire-and-forget transactional confirmation email.
          // The sender owns its own try/catch, the kill-switch
          // (PAYMENT_CONFIRMATION_EMAIL_ENABLED, default OFF) and the
          // idempotency check (product_events.payment_confirmation_email_sent
          // deduped by payment_id). A failure here MUST NOT affect payment
          // state, entitlement granting or the webhook response.
          void (async () => {
            try {
              const { sendPaymentConfirmedEmail } = await import(
                "@/lib/email/send-payment-confirmed.server"
              );
              await sendPaymentConfirmedEmail({ paymentId: row.id });
            } catch (err) {
              console.error(
                "[eupago-webhook] payment_confirmed dispatch error",
                err,
              );
            }
          })();

          return new Response("ok", { status: 200 });
        }

        if (normalized === "expired" || normalized === "failed") {
          // Don't downgrade an already-paid row.
          if (row.status !== "paid") {
            const patch: Record<string, unknown> = { status: normalized };
            if (normalized === "expired") {
              patch.expired_at = new Date().toISOString();
            }
            await supabaseAdmin
              .from("lead_payments")
              .update(patch as never)
              .eq("id", row.id);
          }

          await recordProductEvent({
            eventType: "payment_webhook_failed",
            leadId: row.lead_id,
            metadata: {
              payment_id: row.id,
              product_code: row.product,
              normalized_status: normalized,
              raw_status: pickStatus(payload),
            },
          });

          return new Response("ok", { status: 200 });
        }

        // Unknown / pending — ack without state change.
        return new Response("ok", { status: 200 });
      },
    },
  },
});