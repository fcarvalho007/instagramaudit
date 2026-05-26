/**
 * Server-only sender for the "personal area saved" transactional email.
 *
 * Fired once per first-time unlock of a (lead, snapshot) pair. Never throws —
 * any failure is returned as `{ ok: false, reason }` so the caller can record
 * a flow event without blocking the unlock response.
 *
 * Delegates the actual transport to `sendTransactionalEmail`, which tries
 * Brevo first and falls back to Resend on failure.
 */

import { renderPersonalAreaSaved } from "./templates/personal-area-saved";
import { sendTransactionalEmail } from "./transactional-email.server";
import { renderWithOverride } from "./template-overrides.server";

const DEFAULT_BASE_URL = "https://instagramaudit.lovable.app";

export interface SendPersonalAreaSavedArgs {
  toEmail: string;
  firstName: string | null;
  instagramHandle: string | null;
  leadId?: string | null;
  reportRequestId?: string | null;
  snapshotId?: string | null;
}

export type SendPersonalAreaSavedResult =
  | { ok: true; messageId: string | null; provider: "brevo" | "resend" }
  | { ok: false; reason: string };

function resolveAppUrl(): string {
  const base = (
    process.env.PUBLIC_APP_BASE_URL ??
    process.env.PDF_PUBLIC_BASE_URL ??
    DEFAULT_BASE_URL
  ).trim();
  const cleaned = base.replace(/\/+$/, "");
  return `${cleaned}/app/reports`;
}

export async function sendPersonalAreaSavedEmail(
  args: SendPersonalAreaSavedArgs,
): Promise<SendPersonalAreaSavedResult> {
  let rendered;
  try {
    const appUrl = resolveAppUrl();
    rendered = await renderWithOverride(
      "personal_area_saved",
      {
        firstName: args.firstName ?? "",
        instagramHandle: args.instagramHandle ?? "",
        appUrl,
      },
      () =>
        renderPersonalAreaSaved({
          firstName: args.firstName,
          instagramHandle: args.instagramHandle,
          appUrl,
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
    flowType: "personal-area-saved",
    leadId: args.leadId ?? null,
    reportRequestId: args.reportRequestId ?? null,
    snapshotId: args.snapshotId ?? null,
    handle: args.instagramHandle ?? null,
  });

  if (result.ok) {
    return { ok: true, messageId: result.messageId, provider: result.provider };
  }
  const reason = result.resendReason
    ? `${result.brevoReason} | ${result.resendReason}`
    : result.brevoReason;
  return { ok: false, reason };
}