/**
 * Lovable AI Gateway allowlist (server-only).
 *
 * Mirrors the structure of `openai-allowlist.ts` for the Lovable AI Gateway
 * path (currently used by `comparison_readings`). Three gates:
 *
 *   1. `LOVABLE_AI_ENABLED` — emergency kill-switch.
 *      Default ON. Set to the literal string "false" to disable. This
 *      INVERTS the OpenAI default (which is opt-in) because Lovable AI
 *      already powers a live paid feature; a default-OFF switch would
 *      silently disable that feature on first deploy.
 *
 *   2. `LOVABLE_AI_TESTING_MODE` — when set to the literal "true",
 *      restricts the gateway to handles in `LOVABLE_AI_ALLOWLIST`.
 *      Default OFF (production-open).
 *
 *   3. `LOVABLE_AI_ALLOWLIST` — CSV of Instagram handles (lowercased,
 *      leading `@` stripped). Only consulted when testing mode is on.
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
 * Emergency kill-switch for Lovable AI Gateway calls.
 * Returns false ONLY when `LOVABLE_AI_ENABLED` is the literal string "false".
 */
export function isLovableAiEnabled(): boolean {
  return process.env.LOVABLE_AI_ENABLED !== "false";
}

/** True when the testing-mode allowlist is currently being enforced. */
export function isLovableAiTestingModeActive(): boolean {
  return process.env.LOVABLE_AI_TESTING_MODE === "true";
}

/** Returns the active allowlist (always lowercase, `@` stripped). */
export function getLovableAiAllowlist(): string[] {
  return parseAllowlist(process.env.LOVABLE_AI_ALLOWLIST);
}

/**
 * True when the given handle is permitted under the active Lovable AI gates.
 * Returns false when the kill-switch is off, regardless of testing mode.
 * When testing mode is active, also requires the handle to be on the allowlist.
 */
export function isLovableAiAllowed(handle: string | null | undefined): boolean {
  if (!isLovableAiEnabled()) return false;
  if (!isLovableAiTestingModeActive()) return true;
  const normalized = (handle ?? "").trim().replace(/^@/, "").toLowerCase();
  if (!normalized) return false;
  return getLovableAiAllowlist().includes(normalized);
}