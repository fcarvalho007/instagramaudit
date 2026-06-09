/**
 * Runtime auth mode flag.
 *
 *   password                       → default beta UX. Users define their
 *                                    own password on signup; existing
 *                                    users sign in with email+password.
 *                                    Cookie/credits only after Supabase
 *                                    `auth.admin.createUser` succeeds.
 *   password_with_email_verification → same as `password` but
 *                                    `email_confirm: false` and cookie
 *                                    is deferred until the user verifies
 *                                    via the Supabase confirmation email.
 *   magic_link                     → legacy fallback. Kept to allow
 *                                    reverting via env var without a deploy.
 *
 * Default: `password`.
 */

export type AuthMode =
  | "password"
  | "password_with_email_verification"
  | "magic_link";

const VALID: ReadonlySet<AuthMode> = new Set([
  "password",
  "password_with_email_verification",
  "magic_link",
]);

export function getAuthMode(): AuthMode {
  const raw = process.env.AUTH_MODE?.trim().toLowerCase();
  if (raw && (VALID as Set<string>).has(raw)) {
    return raw as AuthMode;
  }
  return "password";
}
