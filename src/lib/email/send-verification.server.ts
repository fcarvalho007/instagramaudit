/**
 * Server-only sender para o email de verificação ("magic link").
 *
 * Usa o `sendTransactionalEmail` standard (Brevo → Resend) — não passa
 * pela infra Lovable Emails. Nunca lança; devolve `{ ok, reason }`.
 */

import { renderVerifyEmail } from "./templates/verify-email";
import { sendTransactionalEmail } from "./transactional-email.server";
import {
  VERIFICATION_TOKEN_TTL_SECONDS,
  signVerificationToken,
} from "./verification-token.server";

const DEFAULT_BASE_URL = "https://auditprofiles.com";

function resolveBaseUrl(): string {
  const base = (
    process.env.PUBLIC_APP_BASE_URL ??
    process.env.PDF_PUBLIC_BASE_URL ??
    DEFAULT_BASE_URL
  ).trim();
  return base.replace(/\/+$/, "");
}

export function buildVerificationUrl(token: string): string {
  return `${resolveBaseUrl()}/api/public/verify-email?token=${encodeURIComponent(token)}`;
}

export interface SendVerificationEmailArgs {
  leadId: string;
  toEmail: string;
  firstName?: string | null;
  instagramHandle?: string | null;
}

export type SendVerificationEmailResult =
  | { ok: true; messageId: string | null; provider: "brevo" | "resend" }
  | { ok: false; reason: string };

export async function sendVerificationEmail(
  args: SendVerificationEmailArgs,
): Promise<SendVerificationEmailResult> {
  let token: string;
  try {
    token = signVerificationToken({
      leadId: args.leadId,
      email: args.toEmail,
      handle: args.instagramHandle ?? null,
    });
  } catch (err) {
    return {
      ok: false,
      reason: `TOKEN_SIGN_FAILED:${err instanceof Error ? err.message : "unknown"}`,
    };
  }

  const magicLinkUrl = buildVerificationUrl(token);
  const expiresInMinutes = Math.round(VERIFICATION_TOKEN_TTL_SECONDS / 60);

  let rendered;
  try {
    rendered = renderVerifyEmail({
      firstName: args.firstName,
      instagramHandle: args.instagramHandle,
      magicLinkUrl,
      expiresInMinutes,
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
    flowType: "email-verification",
    leadId: args.leadId,
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