/**
 * Apify smoke-test allowlist (server-only).
 *
 * Temporary cost-protection layer used while the Apify integration is being
 * validated. When `APIFY_TESTING_MODE !== "false"`, only handles listed in
 * `APIFY_ALLOWLIST` (CSV, lowercase) may trigger a provider call.
 *
 * Defaults are intentionally restrictive: when `APIFY_ALLOWLIST` is missing
 * or empty, no handle is allowed. Operators must explicitly populate the
 * variable with the handles to test (e.g. `frederico.m.carvalho`).
 *
 * Disabling the allowlist later: set `APIFY_TESTING_MODE=false` in the project
 * environment. No code change required.
 *
 * Hard kill-switch: `APIFY_ENABLED` (must equal the literal "true"). Defaults
 * to OFF so a misconfigured environment never burns Apify credits.
 */
function parseAllowlist(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim().replace(/^@/, "").toLowerCase())
    .filter((s) => s.length > 0);
}

/** True when the testing-mode allowlist is currently being enforced. */
export function isTestingModeActive(): boolean {
  // Default ON. Operator must explicitly set "false" to disable.
  return process.env.APIFY_TESTING_MODE !== "false";
}

/** Returns the active allowlist (always lowercase). */
export function getAllowlist(): string[] {
  return parseAllowlist(process.env.APIFY_ALLOWLIST);
}

/** True when the given handle is permitted under the active allowlist. */
export function isAllowed(username: string): boolean {
  if (!isTestingModeActive()) return true;
  const list = getAllowlist();
  return list.includes(username.toLowerCase());
}

/**
 * Hard kill-switch for Apify provider calls.
 *
 * Returns true ONLY when `APIFY_ENABLED` is the literal string "true".
 * Any other value (missing, "false", "1", "yes", etc.) keeps the provider
 * disabled. Cache reads are unaffected — only fresh provider calls are gated.
 */
export function isApifyEnabled(): boolean {
  return process.env.APIFY_ENABLED === "true";
}
