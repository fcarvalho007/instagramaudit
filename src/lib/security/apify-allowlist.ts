/**
 * Apify smoke-test allowlist (server-only).
 *
 * Temporary cost-protection layer used while the Apify integration is being
 * validated. When `APIFY_TESTING_MODE !== "false"`, only handles listed in
 * `APIFY_ALLOWLIST` (CSV, lowercase) may trigger a provider call.
 *
 * Defaults are intentionally restrictive — if the env var is missing, we fall
 * back to the single test profile defined by the project (frederico.m.carvalho).
 *
 * Disabling the allowlist later: set `APIFY_TESTING_MODE=false` in the project
 * environment. No code change required.
 */
const DEFAULT_ALLOWLIST = ["frederico.m.carvalho"];

function parseAllowlist(raw: string | undefined): string[] {
  if (!raw) return DEFAULT_ALLOWLIST;
  const items = raw
    .split(",")
    .map((s) => s.trim().replace(/^@/, "").toLowerCase())
    .filter((s) => s.length > 0);
  return items.length > 0 ? items : DEFAULT_ALLOWLIST;
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
