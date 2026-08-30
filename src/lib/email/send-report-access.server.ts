/**
 * Sender server-only do email `report-access`.
 *
 * Disparado pelo `/api/onboarding/start` no caminho do beta (modo `off`),
 * imediatamente após o cookie `lead_session` ser emitido. Não bloqueia o
 * fluxo — devolve `{ ok, reason }` sem nunca lançar. A camada
 * `sendTransactionalEmail` regista eventos a nível de provider.
 *
 * Combina dois links:
 *   - `reportUrl`: link público do relatório (já aberto no browser).
 *   - `accountAccessUrl`: magic link assinado (TTL longo) para reabrir
 *     mais tarde sem password.
 */

import { renderReportAccess } from "./templates/report-access";
import { sendTransactionalEmail } from "./transactional-email.server";
import { signVerificationToken } from "./verification-token.server";

const DEFAULT_BASE_URL = "https://auditprofiles.com";
/** 14 dias — equilibra conveniência (utilizador volta uma semana depois) e risco. */
const ACCOUNT_ACCESS_TTL_DAYS = 14;
const ACCOUNT_ACCESS_TTL_SECONDS = ACCOUNT_ACCESS_TTL_DAYS * 24 * 60 * 60;

function resolveBaseUrl(): string {
  const base = (
    process.env.PUBLIC_APP_BASE_URL ??
    process.env.PDF_PUBLIC_BASE_URL ??
    DEFAULT_BASE_URL
  ).trim();
  return base.replace(/\/+$/, "");
}

function buildReportUrl(handle: string | null | undefined): string {
  const base = resolveBaseUrl();
  if (!handle) return `${base}/`;
  return `${base}/analyze/${encodeURIComponent(handle.replace(/^@/, ""))}`;
}

function buildAccessUrl(token: string): string {
  return `${resolveBaseUrl()}/api/public/verify-email?token=${encodeURIComponent(token)}`;
}

export interface SendReportAccessArgs {
  leadId: string;
  toEmail: string;
  firstName?: string | null;
  instagramHandle?: string | null;
  /** `cache_key` do relatório que originou o email (destino canónico). */
  reportRef?: string | null;
}

export type SendReportAccessResult =
  | { ok: true; messageId: string | null; provider: "brevo" | "resend" }
  | { ok: false; reason: string };

export async function sendReportAccessEmail(
  args: SendReportAccessArgs,
): Promise<SendReportAccessResult> {
  let token: string;
  try {
    token = signVerificationToken(
      {
        leadId: args.leadId,
        email: args.toEmail,
        handle: args.instagramHandle ?? null,
        purpose: "report_access",
        reportRef: args.reportRef ?? null,
      },
      undefined,
      ACCOUNT_ACCESS_TTL_SECONDS,
    );
  } catch (err) {
    return {
      ok: false,
      reason: `TOKEN_SIGN_FAILED:${err instanceof Error ? err.message : "unknown"}`,
    };
  }

  const reportUrl = buildReportUrl(args.instagramHandle ?? null);
  const accountAccessUrl = buildAccessUrl(token);

  let rendered;
  try {
    rendered = renderReportAccess({
      firstName: args.firstName,
      instagramHandle: args.instagramHandle,
      reportUrl,
      accountAccessUrl,
      accessExpiresInDays: ACCOUNT_ACCESS_TTL_DAYS,
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
    flowType: "report-access",
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