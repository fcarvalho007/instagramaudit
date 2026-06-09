/**
 * Pure builder for the `/api/onboarding/start` POST body.
 *
 * Kept outside the modal so it can be unit-tested without React.
 * Invariants validated by `__tests__/build-start-payload.test.ts`:
 *  - `user_type` is NEVER sent (column is nullable; UI does not collect it).
 *  - `_t` is the timestamp passed by the caller (timing-guard mirror).
 *  - `website` is always present (honeypot drain on the server).
 *  - `phone` is `undefined` when blank, trimmed string otherwise.
 */
import type { UnlockFormValues } from "@/lib/unlock-flow";

export interface OnboardingStartPayload {
  name: string;
  email: string;
  phone?: string;
  marketing_consent: boolean;
  beta_consent: false;
  purpose?: UnlockFormValues["goal"];
  profile_ownership?: UnlockFormValues["profile_ownership"];
  gdpr_consent: true;
  website: string;
  _t: number;
  /** Tracking-only — usado server-side para correlacionar erros. */
  handle?: string;
}

export function buildStartPayload(
  values: UnlockFormValues,
  parsedFullName: string,
  honeypot: string,
  formStartedAt: number,
  handle?: string,
): OnboardingStartPayload {
  const phone = values.phone?.trim();
  const base: OnboardingStartPayload = {
    name: parsedFullName || values.full_name,
    email: values.email,
    phone: phone ? phone : undefined,
    marketing_consent: values.marketing_consent === true,
    beta_consent: false,
    // GDPR consent é validado client-side antes do submit; envia sempre `true`
    // para o servidor exigir prova explícita (Zod `literal(true)`).
    gdpr_consent: true,
    website: honeypot,
    _t: formStartedAt,
    ...(handle ? { handle } : {}),
  };
  // Optional context fields — kept as nullable columns on `leads`; we only
  // send them when the (legacy) UI happens to collect them. The new
  // entry-modal flow drops the dedicated step that used to ask for them.
  if (values.goal) base.purpose = values.goal;
  if (values.profile_ownership)
    base.profile_ownership = values.profile_ownership;
  return base;
}