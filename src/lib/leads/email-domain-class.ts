/**
 * Lightweight email-domain classifier used by `/api/onboarding/start` to:
 *   - reject obviously disposable / throwaway addresses
 *   - label the rest as `professional_domain` or `consumer_domain`
 *
 * The list is intentionally short and hard-coded; it is not meant to be an
 * exhaustive disposable-domain database. The goal is to catch the obvious
 * abuse cases without false-positives on real users using Gmail or Outlook.
 */

export type EmailDomainClass =
  | "professional_domain"
  | "consumer_domain"
  | "disposable_or_suspicious";

const CONSUMER_DOMAINS = new Set<string>([
  "gmail.com",
  "googlemail.com",
  "hotmail.com",
  "hotmail.co.uk",
  "hotmail.fr",
  "outlook.com",
  "outlook.pt",
  "live.com",
  "live.pt",
  "msn.com",
  "yahoo.com",
  "yahoo.co.uk",
  "yahoo.fr",
  "yahoo.es",
  "yahoo.pt",
  "ymail.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "pm.me",
  "gmx.com",
  "gmx.de",
  "mail.com",
  "zoho.com",
  "sapo.pt",
  "clix.pt",
  "iol.pt",
  "netcabo.pt",
  "meo.pt",
  "nos.pt",
]);

const DISPOSABLE_DOMAINS = new Set<string>([
  "mailinator.com",
  "tempmail.com",
  "tempmail.net",
  "temp-mail.org",
  "10minutemail.com",
  "10minutemail.net",
  "guerrillamail.com",
  "guerrillamail.net",
  "guerrillamail.org",
  "yopmail.com",
  "yopmail.net",
  "trashmail.com",
  "trashmail.net",
  "sharklasers.com",
  "dispostable.com",
  "getnada.com",
  "maildrop.cc",
  "fakeinbox.com",
  "throwawaymail.com",
  "mintemail.com",
  "spamgourmet.com",
  "moakt.com",
  "mohmal.com",
  "tutanota.de",
]);

const DISPOSABLE_PREFIXES = [
  "tempmail",
  "temp-mail",
  "throwaway",
  "throwawayemail",
  "10minute",
  "10min",
];

export function extractEmailDomain(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at < 0 || at === email.length - 1) return null;
  return email.slice(at + 1).trim().toLowerCase();
}

export function classifyEmailDomain(email: string): EmailDomainClass {
  const domain = extractEmailDomain(email);
  if (!domain) return "disposable_or_suspicious";
  if (DISPOSABLE_DOMAINS.has(domain)) return "disposable_or_suspicious";
  for (const prefix of DISPOSABLE_PREFIXES) {
    if (domain.startsWith(prefix + ".") || domain === prefix + ".com") {
      return "disposable_or_suspicious";
    }
  }
  if (CONSUMER_DOMAINS.has(domain)) return "consumer_domain";
  return "professional_domain";
}