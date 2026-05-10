/**
 * Resolve the Resend `From` header for transactional emails.
 *
 * Reads `RESEND_FROM` (e.g., `"InstaBench <relatorios@instagramaudit.pt>"`).
 * Falls back to Resend's sandbox identity, which only delivers to the Resend
 * account owner — production use requires a verified domain + `RESEND_FROM`.
 */

const DEFAULT_SENDER_FROM = "InstaBench <onboarding@resend.dev>";

export function resolveSender(): string {
  const v = process.env.RESEND_FROM?.trim();
  return v && v.length > 0 ? v : DEFAULT_SENDER_FROM;
}