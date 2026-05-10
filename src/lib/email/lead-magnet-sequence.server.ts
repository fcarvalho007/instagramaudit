/**
 * Lead-magnet email sequence orchestrator.
 *
 * Sends, in order:
 *   1. welcome-beta  (only when `sendWelcome === true`, i.e. brand-new lead)
 *   2. report-summary (always; skipped when snapshot lacks the 4 KPIs)
 *
 * Both steps dedup against `product_events` by
 * `(lead_id, event_type, metadata.report_request_id)`. A failure on one step
 * never blocks the other. Never throws — caller can fire-and-forget.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { recordProductEvent } from "@/lib/tracking.server";

export interface LeadMagnetSequenceArgs {
  leadId: string;
  reportRequestId: string;
  snapshotId: string;
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

async function eventAlreadyEmitted(
  leadId: string,
  reportRequestId: string,
  eventType: string,
): Promise<boolean> {
  try {
    const { data } = await (supabaseAdmin as any)
      .from("product_events")
      .select("id")
      .eq("lead_id", leadId)
      .eq("event_type", eventType)
      .contains("metadata", { report_request_id: reportRequestId })
      .limit(1)
      .maybeSingle();
    return Boolean(data);
  } catch (err) {
    console.error("[lead-magnet] dedup lookup failed:", eventType, err);
    // Fail-open: if the lookup itself errors, allow the send. The sender's own
    // idempotency key (flow + report_request_id) is the last line of defence.
    return false;
  }
}

export async function sendLeadMagnetSequence(
  args: LeadMagnetSequenceArgs,
): Promise<LeadMagnetSequenceResult> {
  let welcome: WelcomeOutcome = "skipped_disabled";
  let summary: SummaryOutcome = "skipped_no_data";

  // ---------- 1. welcome-beta ----------
  if (args.sendWelcome) {
    const dup = await eventAlreadyEmitted(
      args.leadId,
      args.reportRequestId,
      "beta_welcome_email_sent",
    );
    if (dup) {
      welcome = "skipped_duplicate";
    } else {
      try {
        const { sendWelcomeBetaEmail } = await import(
          "./send-welcome-beta.server"
        );
        const res = await sendWelcomeBetaEmail({
          toEmail: args.toEmail,
          firstName: args.firstName,
          instagramHandle: args.instagramHandle,
          leadId: args.leadId,
          reportRequestId: args.reportRequestId,
          snapshotId: args.snapshotId,
        });
        if (res.ok) {
          welcome = "sent";
          await recordProductEvent({
            eventType: "beta_welcome_email_sent",
            leadId: args.leadId,
            snapshotId: args.snapshotId,
            handle: args.instagramHandle,
            metadata: {
              message_id: res.messageId,
              provider: res.provider,
              report_request_id: args.reportRequestId,
            },
          });

          // Brevo BETA_WELCOMED_AT stamp — fire-and-forget.
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
        } else {
          welcome = "failed";
          await recordProductEvent({
            eventType: "beta_welcome_email_failed",
            leadId: args.leadId,
            snapshotId: args.snapshotId,
            handle: args.instagramHandle,
            metadata: {
              reason: res.reason,
              report_request_id: args.reportRequestId,
            },
          });
        }
      } catch (err) {
        welcome = "failed";
        console.error("[lead-magnet] welcome-beta unexpected error:", err);
        await recordProductEvent({
          eventType: "beta_welcome_email_failed",
          leadId: args.leadId,
          snapshotId: args.snapshotId,
          handle: args.instagramHandle,
          metadata: {
            reason: `UNEXPECTED:${err instanceof Error ? err.message : "unknown"}`,
            report_request_id: args.reportRequestId,
          },
        });
      }
    }
  }

  // ---------- 2. report-summary ----------
  const dupSummary = await eventAlreadyEmitted(
    args.leadId,
    args.reportRequestId,
    "report_summary_email_sent",
  );
  if (dupSummary) {
    summary = "skipped_duplicate";
  } else {
    try {
      const { sendReportSummaryEmail } = await import(
        "./send-report-summary.server"
      );
      const res = await sendReportSummaryEmail({
        toEmail: args.toEmail,
        firstName: args.firstName,
        leadId: args.leadId,
        reportRequestId: args.reportRequestId,
        snapshotId: args.snapshotId,
      });
      if (res.ok) {
        summary = "sent";
        await recordProductEvent({
          eventType: "report_summary_email_sent",
          leadId: args.leadId,
          snapshotId: args.snapshotId,
          handle: args.instagramHandle,
          metadata: {
            message_id: res.messageId,
            provider: res.provider,
            report_request_id: args.reportRequestId,
          },
        });
      } else if (res.reason === "NO_DATA" || res.reason === "NO_SNAPSHOT_ID") {
        summary = "skipped_no_data";
        await recordProductEvent({
          eventType: "report_summary_skipped_no_data",
          leadId: args.leadId,
          snapshotId: args.snapshotId,
          handle: args.instagramHandle,
          metadata: { report_request_id: args.reportRequestId },
        });
      } else {
        summary = "failed";
        await recordProductEvent({
          eventType: "report_summary_email_failed",
          leadId: args.leadId,
          snapshotId: args.snapshotId,
          handle: args.instagramHandle,
          metadata: {
            reason: res.reason,
            report_request_id: args.reportRequestId,
          },
        });
      }
    } catch (err) {
      summary = "failed";
      console.error("[lead-magnet] report-summary unexpected error:", err);
      await recordProductEvent({
        eventType: "report_summary_email_failed",
        leadId: args.leadId,
        snapshotId: args.snapshotId,
        handle: args.instagramHandle,
        metadata: {
          reason: `UNEXPECTED:${err instanceof Error ? err.message : "unknown"}`,
          report_request_id: args.reportRequestId,
        },
      });
    }
  }

  return { welcome, summary };
}