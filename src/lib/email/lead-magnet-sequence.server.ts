/**
 * Lead-magnet email sequence orchestrator.
 *
 * Step 3 da consolidação: substitui o par `welcome-beta` + `report-summary`
 * por um único envio `report-saved` (template `report_saved`).
 *
 * Idempotência: dedupa contra `product_events` por
 * `(lead_id, metadata.report_request_id)` para QUALQUER um dos eventos
 * abaixo, garantindo que leads processados pelo orquestrador antigo não
 * recebem o novo email duplicado:
 *   - `report_saved_email_sent` (novo)
 *   - `beta_welcome_email_sent` (legacy)
 *   - `report_summary_email_sent` (legacy)
 *
 * Retorna o shape `{ welcome, summary }` por compatibilidade com o caller
 * (unlock.server.ts e logs). Ambos os campos recebem o mesmo outcome
 * derivado do envio único.
 *
 * Nunca lança — caller pode `await` sem try/catch defensivo.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { recordProductEvent } from "@/lib/tracking.server";

export interface LeadMagnetSequenceArgs {
  leadId: string;
  reportRequestId: string;
  snapshotId: string;
  /**
   * Optional immutable historical snapshot id. When provided, email CTAs
   * point to `/reports/{reportSnapshotId}`. Falls back to handle-based URL
   * when missing.
   */
  reportSnapshotId?: string | null;
  toEmail: string;
  firstName: string | null;
  instagramHandle: string;
  /** Send welcome-beta only when true (brand-new lead). Default false. */
  sendWelcome?: boolean;
}

export type WelcomeOutcome =
  | "sent"
  | "failed"
  | "skipped_duplicate"
  | "skipped_disabled";

export type SummaryOutcome =
  | "sent"
  | "failed"
  | "skipped_no_data"
  | "skipped_duplicate";

export interface LeadMagnetSequenceResult {
  welcome: WelcomeOutcome;
  summary: SummaryOutcome;
}

/**
 * Dedup: retorna true se já existe QUALQUER um dos eventos de entrega
 * (novo `report_saved_email_sent` OU legacy
 * `beta_welcome_email_sent`/`report_summary_email_sent`) para
 * (lead_id, report_request_id). Fail-open em caso de erro de leitura.
 */
async function deliveryAlreadyEmitted(
  leadId: string,
  reportRequestId: string,
): Promise<boolean> {
  const eventTypes = [
    "report_saved_email_sent",
    "beta_welcome_email_sent",
    "report_summary_email_sent",
  ];
  try {
    const { data } = await (supabaseAdmin as any)
      .from("product_events")
      .select("id")
      .eq("lead_id", leadId)
      .in("event_type", eventTypes)
      .contains("metadata", { report_request_id: reportRequestId })
      .limit(1)
      .maybeSingle();
    return Boolean(data);
  } catch (err) {
    console.error("[lead-magnet] dedup lookup failed:", err);
    return false;
  }
}

export async function sendLeadMagnetSequence(
  args: LeadMagnetSequenceArgs,
): Promise<LeadMagnetSequenceResult> {
  // Kill switch: LEAD_MAGNET_EMAIL_SEQUENCE_ENABLED. Default ON; set to
  // literal "false" to disable the sequence.
  if (
    (process.env.LEAD_MAGNET_EMAIL_SEQUENCE_ENABLED ?? "true")
      .trim()
      .toLowerCase() === "false"
  ) {
    try {
      await recordProductEvent({
        eventType: "lead_magnet_sequence_skipped" as any,
        leadId: args.leadId,
        snapshotId: args.snapshotId,
        handle: args.instagramHandle,
        metadata: {
          report_request_id: args.reportRequestId,
          flag: "LEAD_MAGNET_EMAIL_SEQUENCE_ENABLED",
        },
      });
    } catch (err) {
      console.error("[lead-magnet] failed to record skipped event:", err);
    }
    return { welcome: "skipped_disabled", summary: "skipped_no_data" };
  }

  // Marketing-consent lookup (NÃO bloqueia entrega — só enriquece metadata).
  let marketingConsent = false;
  try {
    const { data: leadRow } = await (supabaseAdmin as any)
      .from("leads")
      .select("marketing_consent")
      .eq("id", args.leadId)
      .maybeSingle();
    marketingConsent = leadRow?.marketing_consent === true;
  } catch (err) {
    console.error("[lead-magnet] consent lookup failed (continuing transactional):", err);
    marketingConsent = false;
  }

  // Dedup unificado: cobre novo + legacy.
  const dup = await deliveryAlreadyEmitted(args.leadId, args.reportRequestId);
  if (dup) {
    return { welcome: "skipped_duplicate", summary: "skipped_duplicate" };
  }

  const isWelcome = args.sendWelcome === true;

  try {
    const { sendReportSavedEmail } = await import("./send-report-saved.server");
    const res = await sendReportSavedEmail({
      toEmail: args.toEmail,
      firstName: args.firstName,
      instagramHandle: args.instagramHandle,
      leadId: args.leadId,
      reportRequestId: args.reportRequestId,
      snapshotId: args.snapshotId,
      reportSnapshotId: args.reportSnapshotId ?? null,
      isWelcome,
    });

    if (res.ok) {
      await recordProductEvent({
        eventType: "report_saved_email_sent" as any,
        leadId: args.leadId,
        snapshotId: args.snapshotId,
        handle: args.instagramHandle,
        metadata: {
          message_id: res.messageId,
          provider: res.provider,
          report_request_id: args.reportRequestId,
          variant: isWelcome ? "welcome" : "returning",
          transactional_delivery: true,
          marketing_consent: marketingConsent,
        },
      });

      // Brevo BETA_WELCOMED_AT stamp — preserved no primeiro unlock.
      if (isWelcome) {
        void (async () => {
          try {
            const { upsertBrevoContact } = await import(
              "@/lib/brevo/contacts.server"
            );
            const stamp = await upsertBrevoContact({
              email: args.toEmail,
              attributes: { BETA_WELCOMED_AT: new Date().toISOString() },
            });
            if (!stamp.ok) {
              console.error(
                "[lead-magnet] brevo BETA_WELCOMED_AT stamp failed:",
                stamp.reason,
              );
            }
          } catch (err) {
            console.error("[lead-magnet] brevo welcomed-at stamp error:", err);
          }
        })();
      }

      return { welcome: "sent", summary: "sent" };
    }

    await recordProductEvent({
      eventType: "report_saved_email_failed" as any,
      leadId: args.leadId,
      snapshotId: args.snapshotId,
      handle: args.instagramHandle,
      metadata: {
        reason: res.reason,
        report_request_id: args.reportRequestId,
        variant: isWelcome ? "welcome" : "returning",
      },
    });
    return { welcome: "failed", summary: "failed" };
  } catch (err) {
    console.error("[lead-magnet] report-saved unexpected error:", err);
    await recordProductEvent({
      eventType: "report_saved_email_failed" as any,
      leadId: args.leadId,
      snapshotId: args.snapshotId,
      handle: args.instagramHandle,
      metadata: {
        reason: `UNEXPECTED:${err instanceof Error ? err.message : "unknown"}`,
        report_request_id: args.reportRequestId,
      },
    });
    return { welcome: "failed", summary: "failed" };
  }
}