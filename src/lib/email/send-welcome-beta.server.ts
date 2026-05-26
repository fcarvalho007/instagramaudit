/**
 * Server-only sender for the "welcome-beta" transactional email.
 *
 * Fired once per FIRST unlock from a brand-new lead (returningLead === false
 * AND createdReportRequest === true). Returning leads keep receiving the
 * `personal-area-saved` email.
 *
 * Never throws — failures are returned as `{ ok: false, reason }`. The
 * transactional abstraction itself emits provider-level + flow-failure
 * events; this module is only responsible for rendering and dispatching.
 */

import { renderWelcomeBeta } from "./templates/welcome-beta";
import { sendTransactionalEmail } from "./transactional-email.server";
import { resolveReportUrl, buildUnsubscribeUrl } from "./url";
import { renderWithOverride } from "./template-overrides.server";

export interface SendWelcomeBetaArgs {
  toEmail: string;
  firstName: string | null;
  instagramHandle: string;
  leadId?: string | null;
  reportRequestId?: string | null;
  snapshotId?: string | null;
  reportSnapshotId?: string | null;
  /** Optional secondary CTA URL. Defaults to FEEDBACK_URL env var if unset. */
  feedbackUrl?: string | null;
}

export type SendWelcomeBetaResult =
  | { ok: true; messageId: string | null; provider: "brevo" | "resend" }
  | { ok: false; reason: string };

export async function sendWelcomeBetaEmail(
  args: SendWelcomeBetaArgs,
): Promise<SendWelcomeBetaResult> {
  let rendered;
  try {
    const reportUrl = resolveReportUrl(
      args.instagramHandle,
      args.reportSnapshotId ?? null,
    );
    const feedbackUrl =
      args.feedbackUrl ?? (process.env.FEEDBACK_URL?.trim() || null);
    const unsubscribeUrl = args.leadId ? buildUnsubscribeUrl(args.leadId) : null;
    rendered = await renderWithOverride(
      "welcome_beta",
      {
        firstName: args.firstName ?? "",
        instagramHandle: args.instagramHandle,
        reportUrl,
      },
      () =>
        renderWelcomeBeta({
          firstName: args.firstName,
          instagramHandle: args.instagramHandle,
          reportUrl,
          feedbackUrl,
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
    flowType: "welcome-beta",
    leadId: args.leadId ?? null,
    reportRequestId: args.reportRequestId ?? null,
    snapshotId: args.snapshotId ?? null,
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