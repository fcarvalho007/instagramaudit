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
import { recordProductEvent } from "@/lib/tracking.server";
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
        let row:
          | {
              id: string;
              lead_id: string;
              product: string;
              status: string;
              paid_at: string | null;
              metadata: Record<string, unknown> | null;
            }
          | null = null;

        if (providerPaymentId) {
          const { data } = await supabaseAdmin
            .from("lead_payments")
            .select("id, lead_id, product, status, paid_at, metadata")
            .eq("provider_payment_id", providerPaymentId)
            .maybeSingle();
          row = (data as typeof row) ?? null;
        }
        if (!row && identifier && UUID_RE.test(identifier)) {
          const { data } = await supabaseAdmin
            .from("lead_payments")
            .select("id, lead_id, product, status, paid_at, metadata")
            .eq("id", identifier)
            .maybeSingle();
          row = (data as typeof row) ?? null;
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

          try {
            await grantEntitlement({
              leadId: row.lead_id,
              productCode: row.product as ProductCode,
              paymentId: row.id,
            });
          } catch (err) {
            console.error("[eupago-webhook] grantEntitlement failed", err);
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