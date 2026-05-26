/**
 * Resolve the Resend `From` header for transactional emails.
 *
 * Reads `RESEND_FROM` (e.g., `"AuditProfiles <relatorios@auditprofiles.com>"`).
 * No silent fallback: if `RESEND_FROM` is missing the caller must surface
 * a `RESEND_FROM_MISSING` error. We never fall back to Resend's sandbox
 * sender (`onboarding@resend.dev`) because that only delivers to the
 * Resend account owner and would silently break external beta sends.
 */

export type SenderResolution =
  | { ok: true; from: string }
  | { ok: false; reason: "RESEND_FROM_MISSING" };

export function resolveSender(): SenderResolution {
  const v = process.env.RESEND_FROM?.trim();
  if (!v) return { ok: false, reason: "RESEND_FROM_MISSING" };
  return { ok: true, from: v };
}