/**
 * Centralised public contact info.
 *
 * Static fallback that mirrors the value seeded into `app_config.contact_email`.
 * Components that already use TanStack Query can read the live value via
 * `usePublicAppConfig().contactEmail`; for plain strings (SEO, server-side
 * email templates), use `DEFAULT_CONTACT_EMAIL`.
 */

export const DEFAULT_CONTACT_EMAIL = "hello@auditprofiles.com";

export function mailtoLink(email: string): string {
  return `mailto:${email}`;
}

/** Encoded mailto for the generic professional access inquiry CTA. */
export function mailtoProfessionalAccess(email: string): string {
  const subject = encodeURIComponent("Acesso profissional — AuditProfiles");
  const body = encodeURIComponent(
    "Gostaria de saber mais sobre acesso profissional ao AuditProfiles.",
  );
  return `mailto:${email}?subject=${subject}&body=${body}`;
}