/**
 * OpenAI insights allowlist (server-only).
 *
 * Cost-protection layer mirroring the Apify/DataForSEO allowlists. Three
 * gates control whether an OpenAI call is permitted for a given Instagram
 * handle:
 *
 *   1. `OPENAI_ENABLED` — hard kill-switch. Must equal the literal string
 *      "true" for any OpenAI work to happen. Defaults to OFF so a
 *      misconfigured environment never burns OpenAI credits.
 *
 *   2. `OPENAI_TESTING_MODE` — when not literally "false", restricts the
 *      OpenAI flow to handles in `OPENAI_ALLOWLIST`. Defaults to ON.
 *
 *   3. `OPENAI_ALLOWLIST` — CSV of Instagram handles (lowercased, leading
 *      `@` stripped). When testing mode is active and the list is empty,
 *      no handle is allowed.
 *
 * No I/O. No fetch. Pure env-var inspection.
 */

function parseAllowlist(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim().replace(/^@/, "").toLowerCase())
    .filter((s) => s.length > 0);
}

/**
 * Hard kill-switch for OpenAI insights generation.
 *
 * Returns true ONLY when `OPENAI_ENABLED` is the literal string "true".
 * Any other value (missing, "false", "1", "yes", etc.) keeps OpenAI
 * disabled. Cached snapshots and deterministic fallbacks are unaffected —
 * only fresh insight generation is gated.
 */
export function isOpenAiEnabled(): boolean {
  return process.env.OPENAI_ENABLED === "true";
}

/** True when the testing-mode allowlist is currently being enforced. */
export function isOpenAiTestingModeActive(): boolean {
  // Default ON. Operator must explicitly set "false" to disable.
  return process.env.OPENAI_TESTING_MODE !== "false";
}

/** Returns the active allowlist (always lowercase, `@` stripped). */
export function getOpenAiAllowlist(): string[] {
  return parseAllowlist(process.env.OPENAI_ALLOWLIST);
}

/**
 * True when the given handle is permitted under the active OpenAI gates.
 *
 * Returns false when the kill-switch is off, regardless of testing mode.
 * When testing mode is active, also requires the handle to be on the
 * allowlist.
 */
export function isOpenAiAllowed(handle: string): boolean {
  if (!isOpenAiEnabled()) return false;
  if (!isOpenAiTestingModeActive()) return true;
  const normalized = handle.trim().replace(/^@/, "").toLowerCase();
  if (!normalized) return false;
  return getOpenAiAllowlist().includes(normalized);
}
