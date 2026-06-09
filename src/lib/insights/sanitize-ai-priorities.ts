/**
 * Sanitize numeric tokens in AI-generated priority bodies.
 *
 * The AI is instructed to cite only numbers that appear in the input
 * payload. When the model invents a number (hallucinated reply rate,
 * fabricated comment count, etc.), the UI must not display it.
 *
 * Strategy: extract numeric tokens from the body, compare against the
 * pool of numbers reachable in the user payload (with ±1 tolerance for
 * percentages and rounding tolerance for integers). Unsupported tokens
 * are removed from the string. If the resulting body becomes too short
 * or grammatically empty, fall back to the original (better to show a
 * number that might be slightly off than to crash the card).
 *
 * Pure. No I/O. Defensive against malformed input.
 */

export interface SanitizeResult {
  /** Possibly-cleaned body. */
  body: string;
  /** True when at least one numeric token was stripped. */
  sanitized: boolean;
}

const NUM_TOKEN = /\d+(?:[.,]\d+)?%?/g;

/** Collect every numeric-looking token from any nested value of `payload`. */
export function collectPayloadNumbers(payload: unknown): Set<string> {
  const out = new Set<string>();
  const walk = (v: unknown): void => {
    if (v == null) return;
    if (typeof v === "number" && Number.isFinite(v)) {
      out.add(String(Math.round(v)));
      out.add(String(Math.round(v * 10) / 10));
      out.add(String(Math.round(v * 100) / 100));
      return;
    }
    if (typeof v === "string") {
      const m = v.match(NUM_TOKEN);
      if (m) for (const tok of m) out.add(normalizeNum(tok));
      return;
    }
    if (Array.isArray(v)) {
      for (const x of v) walk(x);
      return;
    }
    if (typeof v === "object") {
      for (const x of Object.values(v as Record<string, unknown>)) walk(x);
    }
  };
  walk(payload);
  return out;
}

function normalizeNum(tok: string): string {
  return tok.replace(",", ".").replace(/%$/, "");
}

function isSupported(token: string, pool: Set<string>): boolean {
  const n = Number.parseFloat(normalizeNum(token));
  if (!Number.isFinite(n)) return true; // not a real number → leave alone
  // Direct hits (integer + decimal forms).
  if (pool.has(String(n))) return true;
  if (pool.has(String(Math.round(n)))) return true;
  // Rounding tolerance: ±1 for integers/percentages.
  for (let delta = -1; delta <= 1; delta++) {
    if (pool.has(String(Math.round(n) + delta))) return true;
  }
  // One-decimal tolerance for floats.
  for (let delta = -1; delta <= 1; delta++) {
    const candidate = Math.round((n + delta * 0.1) * 10) / 10;
    if (pool.has(String(candidate))) return true;
  }
  return false;
}

/**
 * Strip unsupported numeric tokens from `body`. Trims duplicated spaces
 * and empty parentheses created by the removal. Returns the original
 * body when stripping would leave fewer than 20 chars (treats the card
 * as still useful and lets the caller decide whether to keep it).
 */
export function sanitizeAiPriorityBody(
  body: string,
  payload: unknown,
): SanitizeResult {
  if (!body || typeof body !== "string") return { body, sanitized: false };
  const pool = collectPayloadNumbers(payload);
  let sanitized = false;
  const next = body.replace(NUM_TOKEN, (tok) => {
    if (isSupported(tok, pool)) return tok;
    sanitized = true;
    return "";
  });
  if (!sanitized) return { body, sanitized: false };
  // Tidy up: collapse repeated spaces, strip empty parens, fix " ." → ".".
  const tidy = next
    .replace(/\(\s*\)/g, "")
    .replace(/\s+([.,;:%])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (tidy.length < 20) return { body, sanitized: false };
  return { body: tidy, sanitized: true };
}