/**
 * Server-only sender for the "payment-confirmed" transactional email.
 *
 * Fired fire-and-forget from the EuPago webhook after the existing paid
 * branch has already updated `lead_payments.status = 'paid'`, granted the
 * entitlement and recorded `payment_webhook_paid`.
 *
 * Guards (in order):
 *   1. Kill-switch `PAYMENT_CONFIRMATION_EMAIL_ENABLED` — default OFF.
 *      Any value other than literal "true" (case-insensitive, trimmed)
 *      skips the send.
 *   2. Idempotency: skip if a `payment_confirmation_email_sent` event
 *      already exists for the same `payment_id` in `product_events`.
 *   3. Payment row must exist and `status === 'paid'`.
 *   4. Lead must have an email.
 *   5. Report URL must be derivable (handle OR snapshot id).
 *
 * Never throws. Returns a structured result for logs. A failure here
 * MUST NOT affect payment state, entitlement granting or webhook response.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { recordProductEvent } from "@/lib/tracking.server";
import { PUBLIC_PRODUCTS, isProductCode } from "@/lib/payments/products";
import {
  POST_PURCHASE_BETA_BONUS,
  PURCHASE_INCLUDED_AMOUNT,
} from "@/lib/credits/credits.server";

import { renderPaymentConfirmed } from "./templates/payment-confirmed";
import { sendTransactionalEmail } from "./transactional-email.server";
import { resolveReportUrl } from "./url";
import { renderWithOverride } from "./template-overrides.server";

export interface SendPaymentConfirmedArgs {
  /** lead_payments.id — used as the idempotency key. */
  paymentId: string;
  /** Optional: pin the report CTA to a specific snapshot id. */
  reportSnapshotId?: string | null;
}

export type SendPaymentConfirmedResult =
  | { ok: true; provider: "brevo" | "resend"; messageId: string | null }
  | { ok: false; reason: string };

const SKIPPED_EVENT = "payment_confirmation_email_skipped";
const SENT_EVENT = "payment_confirmation_email_sent";

function isKillSwitchOn(): boolean {
  return (
    (process.env.PAYMENT_CONFIRMATION_EMAIL_ENABLED ?? "")
      .trim()
      .toLowerCase() === "true"
  );
}

function formatAmountLabel(amountCents: number, currency: string): string {
  const amount = (amountCents || 0) / 100;
  try {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: (currency || "EUR").toUpperCase(),
    }).format(amount);
  } catch {
    // Fallback if currency code is invalid for Intl.
    return `${amount.toFixed(2)} ${currency || "EUR"}`.trim();
  }
}

function firstNameFrom(name: string | null | undefined): string | null {
  if (!name) return null;
  const trimmed = name.trim();
  if (!trimmed) return null;
  return trimmed.split(/\s+/)[0] ?? null;
}

async function safeRecordSkipped(
  paymentId: string,
  leadId: string | null,
  reason: string,
  extra: Record<string, unknown> = {},
): Promise<void> {
  try {
    await recordProductEvent({
      eventType: SKIPPED_EVENT,
      leadId,
      metadata: { payment_id: paymentId, reason, ...extra },
    });
  } catch (err) {
    console.error("[send-payment-confirmed] failed to record skipped:", err);
  }
}

async function alreadySentForPayment(paymentId: string): Promise<boolean> {
  try {
    const { data } = await (supabaseAdmin as any)
      .from("product_events")
      .select("id")
      .eq("event_type", SENT_EVENT)
      .contains("metadata", { payment_id: paymentId })
      .limit(1)
      .maybeSingle();
    return Boolean(data);
  } catch (err) {
    console.error(
      "[send-payment-confirmed] dedup lookup failed:",
      err,
    );
    // Fail-open: dedup query errors should not block a legitimate send;
    // the kill-switch + the existing "row.status === paid" short-circuit in
    // the webhook remain the upstream safety nets.
    return false;
  }
}

export async function sendPaymentConfirmedEmail(
  args: SendPaymentConfirmedArgs,
): Promise<SendPaymentConfirmedResult> {
  const paymentId = args.paymentId;

  if (!paymentId) {
    return { ok: false, reason: "MISSING_PAYMENT_ID" };
  }

  try {
    // 1. Kill-switch — default OFF.
    if (!isKillSwitchOn()) {
      await safeRecordSkipped(paymentId, null, "DISABLED_BY_FLAG", {
        flag: "PAYMENT_CONFIRMATION_EMAIL_ENABLED",
      });
      return { ok: false, reason: "DISABLED_BY_FLAG" };
    }

    // 2. Idempotency check.
    if (await alreadySentForPayment(paymentId)) {
      return { ok: false, reason: "ALREADY_SENT" };
    }

    // 3. Load payment row.
    type PaymentRow = {
      id: string;
      lead_id: string;
      product: string;
      status: string;
      amount_cents: number;
      currency: string;
      provider_reference: string | null;
      provider_payment_id: string | null;
      instagram_username: string | null;
      metadata: Record<string, unknown> | null;
    };
    const { data: paymentRaw } = await (supabaseAdmin as any)
      .from("lead_payments")
      .select(
        "id, lead_id, product, status, amount_cents, currency, provider_reference, provider_payment_id, instagram_username, metadata",
      )
      .eq("id", paymentId)
      .maybeSingle();
    const payment = (paymentRaw as PaymentRow | null) ?? null;

    if (!payment) {
      await safeRecordSkipped(paymentId, null, "PAYMENT_NOT_FOUND");
      return { ok: false, reason: "PAYMENT_NOT_FOUND" };
    }
    if (payment.status !== "paid") {
      await safeRecordSkipped(paymentId, payment.lead_id, "PAYMENT_NOT_PAID", {
        status: payment.status,
      });
      return { ok: false, reason: "PAYMENT_NOT_PAID" };
    }

    // 4. Load lead row.
    type LeadRow = { id: string; email: string | null; name: string | null };
    const { data: leadRaw } = await (supabaseAdmin as any)
      .from("leads")
      .select("id, email, name")
      .eq("id", payment.lead_id)
      .maybeSingle();
    const lead = (leadRaw as LeadRow | null) ?? null;

    if (!lead || !lead.email || !lead.email.trim()) {
      await safeRecordSkipped(paymentId, payment.lead_id, "NO_EMAIL");
      return { ok: false, reason: "NO_EMAIL" };
    }

    // 5. Build report URL.
    const handle = payment.instagram_username
      ? payment.instagram_username.replace(/^@/, "")
      : null;
    if (!handle && !args.reportSnapshotId) {
      await safeRecordSkipped(paymentId, payment.lead_id, "NO_REPORT_URL");
      return { ok: false, reason: "NO_REPORT_URL" };
    }
    const reportUrl = resolveReportUrl(
      handle ?? "",
      args.reportSnapshotId ?? null,
    );
    if (!reportUrl || !reportUrl.trim()) {
      await safeRecordSkipped(paymentId, payment.lead_id, "NO_REPORT_URL");
      return { ok: false, reason: "NO_REPORT_URL" };
    }

    // Build template inputs.
    const productName = isProductCode(payment.product)
      ? PUBLIC_PRODUCTS[payment.product].namePt
      : "Relatório";
    const amountLabel = formatAmountLabel(
      payment.amount_cents,
      payment.currency,
    );
    const metadata = (payment.metadata ?? {}) as Record<string, unknown>;
    const rawPaymentMethod = metadata["payment_method"];
    const paymentMethod =
      typeof rawPaymentMethod === "string" && rawPaymentMethod.trim()
        ? rawPaymentMethod.trim()
        : null;
    const paymentReference =
      (payment.provider_reference && payment.provider_reference.trim()) ||
      (payment.provider_payment_id && payment.provider_payment_id.trim()) ||
      null;
    const firstName = firstNameFrom(lead.name);

    // Créditos pós-compra (alinhado com o webhook): apenas
    // `report_full_9` recebe a breakdown 1 incluído + 2 bónus beta.
    const creditsGranted =
      payment.product === "report_full_9"
        ? {
            included: PURCHASE_INCLUDED_AMOUNT,
            bonus: POST_PURCHASE_BETA_BONUS,
          }
        : null;

    let rendered;
    try {
      rendered = await renderWithOverride(
        "payment_confirmed",
        {
          firstName: firstName ?? "",
          instagramHandle: handle ?? "",
          productName,
          amountLabel,
          paymentMethod: paymentMethod ?? "",
          paymentReference: paymentReference ?? "",
          reportUrl,
        },
        () =>
          renderPaymentConfirmed({
            firstName,
            instagramHandle: handle,
            productName,
            amountLabel,
            paymentMethod,
            paymentReference,
            reportUrl,
            creditsGranted,
          }),
      );
    } catch (err) {
      const reason = `RENDER_FAILED:${err instanceof Error ? err.message : "unknown"}`;
      await safeRecordSkipped(paymentId, payment.lead_id, reason);
      return { ok: false, reason };
    }

    // 6. Send.
    const result = await sendTransactionalEmail({
      to: lead.email.trim(),
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      flowType: "payment-confirmed",
      leadId: payment.lead_id,
      handle,
      metadata: {
        payment_id: paymentId,
        product_code: payment.product,
        amount_cents: payment.amount_cents,
        currency: payment.currency,
      },
    });

    if (!result.ok) {
      const reason = result.resendReason
        ? `${result.brevoReason} | ${result.resendReason}`
        : result.brevoReason;
      // transactional-email.server already records
      // `payment_confirmation_email_failed` (via FLOW_FAILURE_EVENT) with
      // metadata.payment_id propagated through `metadata`.
      return { ok: false, reason };
    }

    // 7. Record the idempotent "sent" event.
    try {
      await recordProductEvent({
        eventType: SENT_EVENT,
        leadId: payment.lead_id,
        handle,
        metadata: {
          payment_id: paymentId,
          product_code: payment.product,
          amount_cents: payment.amount_cents,
          currency: payment.currency,
          message_id: result.messageId,
          provider: result.provider,
        },
      });
    } catch (err) {
      console.error(
        "[send-payment-confirmed] failed to record sent event:",
        err,
      );
    }

    return {
      ok: true,
      provider: result.provider,
      messageId: result.messageId,
    };
  } catch (err) {
    const reason = `UNEXPECTED:${err instanceof Error ? err.message : "unknown"}`;
    console.error("[send-payment-confirmed] unexpected error:", err);
    try {
      await safeRecordSkipped(paymentId, null, reason);
    } catch {
      // already best-effort
    }
    return { ok: false, reason };
  }
}