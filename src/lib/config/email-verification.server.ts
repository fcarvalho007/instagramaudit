/**
 * Runtime config: como validamos propriedade do email.
 *
 *   off         → beta: sem verificação. Cookie + créditos emitidos
 *                 imediatamente. Usado por defeito enquanto não temos
 *                 utilizadores reais e queremos zero atrito.
 *   magic_link  → enviamos email com link assinado (Brevo→Resend).
 *                 Cookie + créditos só após clique no link.
 *   otp         → comportamento legacy via Supabase Auth (one-time code).
 *
 * Mantemos os três caminhos vivos para podermos voltar atrás trocando
 * apenas a env var, sem novo deploy de código.
 */

export type EmailVerificationMode = "off" | "magic_link" | "otp";

const VALID: ReadonlySet<EmailVerificationMode> = new Set([
  "off",
  "magic_link",
  "otp",
]);

export function getEmailVerificationMode(): EmailVerificationMode {
  const raw = process.env.EMAIL_VERIFICATION_MODE?.trim().toLowerCase();
  if (raw && (VALID as Set<string>).has(raw)) {
    return raw as EmailVerificationMode;
  }
  return "off";
}