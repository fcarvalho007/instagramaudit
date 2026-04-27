/**
 * DataForSEO smoke-test allowlist (server-only).
 *
 * Cost-protection layer mirrored on the Apify allowlist. While
 * `DATAFORSEO_TESTING_MODE !== "false"`, only handles listed in
 * `DATAFORSEO_ALLOWLIST` (CSV, lowercase) may trigger a provider call.
 *
 * Hard kill-switch: `DATAFORSEO_ENABLED` (must equal the literal "true").
 * Defaults to OFF so a misconfigured environment never burns credits.
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
  return process.env.DATAFORSEO_TESTING_MODE !== "false";
}

/** Returns the active allowlist (always lowercase, may be empty). */
export function getAllowlist(): string[] {
  return parseAllowlist(process.env.DATAFORSEO_ALLOWLIST);
}

/**
 * True when the given handle/keyword is permitted under the active
 * allowlist. Empty list under testing mode means: nothing allowed.
 */
export function isAllowed(value: string): boolean {
  if (!isTestingModeActive()) return true;
  const list = getAllowlist();
  return list.includes(value.toLowerCase());
}

/**
 * Hard kill-switch for DataForSEO provider calls.
 * Returns true ONLY when `DATAFORSEO_ENABLED` is the literal string "true".
 */
export function isDataForSeoEnabled(): boolean {
  return process.env.DATAFORSEO_ENABLED === "true";
}