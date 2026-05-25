/**
 * Centralised public contact info.
 *
 * Static fallback that mirrors the value seeded into `app_config.contact_email`.
 * Components that already use TanStack Query can read the live value via
 * `usePublicAppConfig().contactEmail`; for plain strings (SEO, server-side
 * email templates), use `DEFAULT_CONTACT_EMAIL`.
 */

export const DEFAULT_CONTACT_EMAIL = "hello@instabench.pt";

export function mailtoLink(email: string): string {
  return `mailto:${email}`;
}

/** Encoded mailto for the Pro plan inquiry CTA. */
export function mailtoPro(email: string): string {
  const subject = encodeURIComponent("Acesso Pro — InstaBench");
  const body = encodeURIComponent("Pretendo saber mais sobre o plano Pro.");
  return `mailto:${email}?subject=${subject}&body=${body}`;
}

/** Encoded mailto for the Agency plan inquiry CTA. */
export function mailtoAgency(email: string): string {
  const subject = encodeURIComponent("Acesso Agency — InstaBench");
  const body = encodeURIComponent("Pretendo saber mais sobre o plano Agency.");
  return `mailto:${email}?subject=${subject}&body=${body}`;
}