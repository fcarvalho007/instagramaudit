/**
 * Client-callable server function for product event tracking.
 * Fire-and-forget — callers should not await the result.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Adding a new event requires a corresponding handler in src/lib/admin/lead-lifecycle.ts.
const ALLOWED_EVENTS = [
  "report_viewed",
  "public_report_link_copied",
  "feedback_started",
  "feedback_submitted",
  "pricing_clicked",
  "pricing_option_clicked",
  "unlock_clicked",
  "feedback_requested",
  "report_link_sent",
  // Public report unlock flow (Phase 3 — backend persistence)
  "unlock_email_submitted",
  "unlock_completed",
  "report_saved_to_account",
  "returning_lead_detected",
  "personal_area_email_sent",
  "personal_area_email_failed",
  // Provider-level transactional email events (Brevo-first + Resend fallback)
  "brevo_email_sent",
  "brevo_email_failed",
  "resend_fallback_email_sent",
  "report_ready_email_failed",
  "feedback_request_email_failed",
  "request_received_email_failed",
  // Beta welcome email (first unlock only)
  "beta_welcome_email_sent",
  "beta_welcome_email_failed",
  // Report summary email (manual admin trigger; cron later)
  "report_summary_email_sent",
  "report_summary_email_failed",
  "report_summary_skipped_no_data",
  // Brevo contact mirror (Phase — contact sync only, no emails)
  "brevo_contact_synced",
  "brevo_contact_sync_failed",
  // Brevo customer mirror (paid customer sync)
  "brevo_customer_synced",
  "brevo_customer_sync_failed",
  // Contextual pricing-feedback sheet (post-value)
  "pricing_feedback_shown",
  "pricing_feedback_submitted",
  "pricing_feedback_dismissed",
  // Unlock-check (per-field returning lead detection)
  "unlock_check_returning_lead",
  "unlock_check_skipped_steps",
  "unlock_modal_intro_viewed",
  // Premium CTA flow (report — unified entry points)
  "premium_cta_clicked",
  "premium_window_interest",
  // Payments (EuPago)
  "payment_cta_clicked",
  "payment_checkout_created",
  "payment_checkout_failed",
  "payment_webhook_paid",
  "payment_webhook_failed",
  // Focused checkout flow (authority diagnosis)
  "checkout_started",
  "checkout_step_view",
  "checkout_step_complete",
  "checkout_upsell_interest",
  "checkout_upsell_seen",
  "checkout_upsell_accepted",
  "checkout_upsell_declined",
  "checkout_payment_started",
  "checkout_payment_failed",
  // Pricing page coupon flow
  "pricing_coupon_attempt",
  "pricing_coupon_applied",
  // Services inquiries
  "services_inquiry_submitted",
  // Beta credits — post-purchase
  "credit_consume_dialog_opened",
  "beta_credit_used",
  "beta_credit_used_period",
  "beta_credit_used_competitor",
  "post_purchase_view",
  "post_purchase_bonus_seen",
  // Inline onboarding inside checkout (from /precos with no lead session)
  "checkout_onboarding_shown",
  "checkout_onboarding_completed",
  "credits_pack_non_pro_warning_shown",
] as const;

const trackEventSchema = z.object({
  eventType: z.enum(ALLOWED_EVENTS),
  snapshotId: z.string().uuid().optional(),
  handle: z.string().max(60).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const trackEvent = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => trackEventSchema.parse(data))
  .handler(async ({ data }) => {
    const { recordProductEvent } = await import("./tracking.server");

    // Resolve lead_id server-side for snapshot-bound events so we can
    // correlate public views with the originating beta request.
    let leadId: string | null | undefined = undefined;
    if (data.snapshotId) {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: rr } = await supabaseAdmin
          .from("report_requests")
          .select("lead_id")
          .eq("analysis_snapshot_id", data.snapshotId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        leadId = rr?.lead_id ?? null;
      } catch {
        leadId = null;
      }
    }

    // Defensive server-side dedup for `report_viewed`: se já existe um
    // evento idêntico (mesmo snapshot + mesmo lead) nos últimos 5s,
    // ignora silenciosamente. Protege contra StrictMode, remounts,
    // duplo-clique e refreshes rápidos. Fail-open: erros aqui caem para
    // o insert normal.
    if (data.eventType === "report_viewed" && data.snapshotId) {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const sinceIso = new Date(Date.now() - 5_000).toISOString();
        let q = (supabaseAdmin as any)
          .from("product_events")
          .select("id")
          .eq("event_type", "report_viewed")
          .eq("snapshot_id", data.snapshotId)
          .gte("created_at", sinceIso)
          .limit(1);
        q = leadId ? q.eq("lead_id", leadId) : q.is("lead_id", null);
        const { data: existing } = await q.maybeSingle();
        if (existing) {
          return { ok: true, deduped: true };
        }
      } catch {
        // fall through to normal insert
      }
    }

    await recordProductEvent({
      eventType: data.eventType,
      snapshotId: data.snapshotId,
      handle: data.handle,
      leadId,
      metadata: data.metadata as Record<string, unknown> | undefined,
    });

    // Post-insert cleanup para `report_viewed`: fecha a janela de race em que
    // várias requests paralelas passam o pré-check ao mesmo tempo e inserem
    // todas. Mantém o mais antigo, apaga os restantes dos últimos 5s.
    if (data.eventType === "report_viewed" && data.snapshotId && leadId) {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const sinceIso = new Date(Date.now() - 5_000).toISOString();
        const { data: rows } = await (supabaseAdmin as any)
          .from("product_events")
          .select("id, created_at")
          .eq("event_type", "report_viewed")
          .eq("snapshot_id", data.snapshotId)
          .eq("lead_id", leadId)
          .gte("created_at", sinceIso)
          .order("created_at", { ascending: true });
        if (Array.isArray(rows) && rows.length > 1) {
          const idsToDelete = rows.slice(1).map((r: any) => r.id as string);
          if (idsToDelete.length > 0) {
            await (supabaseAdmin as any)
              .from("product_events")
              .delete()
              .in("id", idsToDelete);
          }
        }
      } catch {
        /* fail open */
      }
    }

    // Auto-advance lead lifecycle on `report_viewed`. Defensive: only moves
    // forward, never regresses, never touches leads already outside the funnel.
    if (data.eventType === "report_viewed" && leadId) {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { maybeAdvanceLeadStatus } = await import("@/lib/admin/lead-lifecycle");
        const { updateLeadCommercialStatus } = await import("@/lib/admin/lead-events.server");
        const { data: leadRow } = await supabaseAdmin
          .from("leads")
          .select("commercial_status")
          .eq("id", leadId)
          .maybeSingle();
        const next = maybeAdvanceLeadStatus(
          leadRow?.commercial_status ?? null,
          "relatorio_visto",
        );
        if (next) {
          await updateLeadCommercialStatus({
            leadId,
            status: next,
            source: "auto",
            reason: "report_viewed event",
          });
        }
      } catch (err) {
        console.error("[tracking] Auto-advance on report_viewed failed:", err);
      }
    }

    return { ok: true };
  });