/**
 * Sender server-only do email `report_saved`.
 *
 * Chamado pelo `lead-magnet-sequence.server.ts` no fluxo de unlock.
 * Substitui o par `welcome_beta` + `report_summary`.
 *
 * Nunca lança — devolve `{ ok: false, reason }`. A camada
 * `sendTransactionalEmail` regista eventos a nível de provider.
 */

import { buildReportSavedData } from "./build-report-saved-data.server";
import { renderReportSaved } from "./templates/report-saved";
import { sendTransactionalEmail } from "./transactional-email.server";
import { buildUnsubscribeUrl } from "./url";
import { renderWithOverride } from "./template-overrides.server";

export interface SendReportSavedArgs {
  toEmail: string;
  firstName: string | null;
  instagramHandle: string;
  leadId: string;
  reportRequestId: string;
  snapshotId: string;
  reportSnapshotId?: string | null;
  /** false = returning lead. true = primeiro unlock. */
  isWelcome: boolean;
}

export type SendReportSavedResult =
  | { ok: true; messageId: string | null; provider: "brevo" | "resend" }
  | { ok: false; reason: string };

export async function sendReportSavedEmail(
  args: SendReportSavedArgs,
): Promise<SendReportSavedResult> {
  let data;
  try {
    data = await buildReportSavedData({
      snapshotId: args.snapshotId,
      instagramHandle: args.instagramHandle,
      leadId: args.leadId,
      reportSnapshotId: args.reportSnapshotId ?? null,
      firstName: args.firstName,
      returningLead: !args.isWelcome,
    });
  } catch (err) {
    return {
      ok: false,
      reason: `BUILD_FAILED:${err instanceof Error ? err.message : "unknown"}`,
    };
  }

  let rendered;
  try {
    const unsubscribeUrl = buildUnsubscribeUrl(args.leadId);
    rendered = await renderWithOverride(
      "report_saved",
      {
        firstName: args.firstName ?? "",
        instagramHandle: data.instagramHandle,
        reportUrl: data.reportUrl,
        analyzeAnotherUrl: data.analyzeAnotherUrl,
      },
      () =>
        renderReportSaved({
          firstName: data.firstName,
          instagramHandle: data.instagramHandle,
          reportUrl: data.reportUrl,
          analyzeAnotherUrl: data.analyzeAnotherUrl,
          variant: data.variant,
          credits: data.credits,
          insights: data.insights,
          unsubscribeUrl,
        }),
    );
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
    flowType: "report-saved",
    leadId: args.leadId,
    reportRequestId: args.reportRequestId,
    snapshotId: args.snapshotId,
    handle: args.instagramHandle,
  });

  if (result.ok) {
    return { ok: true, messageId: result.messageId, provider: result.provider };
  }
  const reason = result.resendReason
    ? `${result.brevoReason} | ${result.resendReason}`
    : result.brevoReason;
  return { ok: false, reason };
}