/**
 * Server-only sender for the "report-summary" transactional email (Email 2
 * in the lead-magnet sequence).
 *
 * Fired once per (lead, report_request) — same gate as `welcome-beta`. Only
 * sends when the snapshot has the 4 KPIs + top post. Otherwise returns
 * `{ ok: false, reason: "NO_DATA" }` and the caller emits
 * `report_summary_skipped_no_data` instead of a failure event.
 *
 * Never throws — failures are returned as `{ ok: false, reason }`. The
 * transactional layer itself records provider-level events.
 */

import { buildReportSummaryEmailData } from "./build-report-summary-data.server";
import { renderReportSummary } from "./templates/report-summary";
import { sendTransactionalEmail } from "./transactional-email.server";

const DEFAULT_BASE_URL = "https://instagramaudit.lovable.app";

export interface SendReportSummaryArgs {
  toEmail: string;
  firstName: string | null;
  leadId?: string | null;
  reportRequestId?: string | null;
  snapshotId: string;
}

export type SendReportSummaryResult =
  | { ok: true; messageId: string | null; provider: "brevo" | "resend" }
  | { ok: false; reason: string };

function resolveReportUrl(handle: string): string {
  const base = (
    process.env.PUBLIC_APP_BASE_URL ??
    process.env.PDF_PUBLIC_BASE_URL ??
    DEFAULT_BASE_URL
  ).trim();
  const cleaned = base.replace(/\/+$/, "");
  const safeHandle = encodeURIComponent(handle.replace(/^@/, ""));
  return `${cleaned}/analyze/${safeHandle}`;
}

export async function sendReportSummaryEmail(
  args: SendReportSummaryArgs,
): Promise<SendReportSummaryResult> {
  if (!args.snapshotId) {
    return { ok: false, reason: "NO_SNAPSHOT_ID" };
  }

  let summary;
  try {
    summary = await buildReportSummaryEmailData(args.snapshotId);
  } catch (err) {
    return {
      ok: false,
      reason: `BUILD_FAILED:${err instanceof Error ? err.message : "unknown"}`,
    };
  }
  if (!summary) {
    return { ok: false, reason: "NO_DATA" };
  }

  let rendered;
  try {
    rendered = renderReportSummary({
      firstName: args.firstName,
      instagramHandle: summary.instagramHandle,
      reportUrl: resolveReportUrl(summary.instagramHandle),
      kpis: summary.kpis,
      topPost: summary.topPost,
    });
  } catch (err) {
    return {
      ok: false,
      reason: `RENDER_FAILED:${err instanceof Error ? err.message : "unknown"}`,
    };
  }

  const result = await sendTransactionalEmail({
    to: args.toEmail,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    flowType: "report-summary",
    leadId: args.leadId ?? null,
    reportRequestId: args.reportRequestId ?? null,
    snapshotId: args.snapshotId,
    handle: summary.instagramHandle,
  });

  if (result.ok) {
    return { ok: true, messageId: result.messageId, provider: result.provider };
  }
  const reason = result.resendReason
    ? `${result.brevoReason} | ${result.resendReason}`
    : result.brevoReason;
  return { ok: false, reason };
}