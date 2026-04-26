/**
 * Apify cost estimation + privacy-safe request fingerprinting (server-only).
 *
 * Heuristic v1: cost is derived from result volume, configurable via env so
 * we can tune without code changes. This is intentionally a heuristic — the
 * `provider_call_logs.actual_cost_usd` column is reserved for a later pass
 * that fetches Apify's real `usageTotalUsd` per run.
 *
 *   estimated_cost_usd =
 *     profiles_returned × APIFY_COST_PER_PROFILE_USD
 *     + posts_returned   × APIFY_COST_PER_POST_USD
 *
 * Cache hits cost 0. Failures cost 0 unless the provider returned a partial
 * dataset (then count what was returned).
 *
 * Also exposes helpers for IP hashing (SHA-256 + daily rotating salt) and
 * user-agent family extraction so we never persist raw IPs or full UAs.
 */

const DEFAULT_COST_PER_PROFILE_USD = 0.005;
const DEFAULT_COST_PER_POST_USD = 0.0005;

function readEnvNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export function getCostRates(): {
  perProfile: number;
  perPost: number;
} {
  return {
    perProfile: readEnvNumber(
      "APIFY_COST_PER_PROFILE_USD",
      DEFAULT_COST_PER_PROFILE_USD,
    ),
    perPost: readEnvNumber("APIFY_COST_PER_POST_USD", DEFAULT_COST_PER_POST_USD),
  };
}

/**
 * Estimate the USD cost of a single provider call given how many profiles
 * and posts came back. Rounded to 5 decimals to match the DB column scale.
 */
export function estimateApifyCost(input: {
  profilesReturned: number;
  postsReturned: number;
}): number {
  const { perProfile, perPost } = getCostRates();
  const raw =
    Math.max(0, input.profilesReturned) * perProfile +
    Math.max(0, input.postsReturned) * perPost;
  return Math.round(raw * 1e5) / 1e5;
}

/**
 * Daily rotating salt: deterministic per UTC day so analytics within a day
 * can correlate IPs (burst detection) but cross-day correlation is broken.
 * If `IP_HASH_SALT` is missing we fall back to a fixed string — hashes are
 * still one-way, just less rotation guarantees. Do NOT use the Apify token
 * or any real secret as the fallback.
 */
function getDailySalt(): string {
  const base = process.env.IP_HASH_SALT ?? "instabench-default-salt";
  const day = new Date().toISOString().slice(0, 10); // YYYY-MM-DD UTC
  return `${base}:${day}`;
}

/**
 * Extract a best-effort client IP from request headers. Returns null when
 * nothing usable is present. We never persist this raw — only its hash.
 */
export function extractClientIp(request: Request): string | null {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    null
  );
}

/**
 * SHA-256(ip + daily salt) → lowercase hex. Returns null when no IP is
 * available so callers can store NULL rather than a meaningless hash.
 */
export async function hashRequestIp(
  request: Request,
): Promise<string | null> {
  const ip = extractClientIp(request);
  if (!ip) return null;
  const data = new TextEncoder().encode(`${ip}|${getDailySalt()}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Tiny UA family parser. Returns one of a small set of stable labels so the
 * admin can group requests without storing the full user-agent string.
 */
export function parseUserAgentFamily(request: Request): string | null {
  const ua = request.headers.get("user-agent");
  if (!ua) return null;
  const lower = ua.toLowerCase();
  if (/(bot|crawler|spider|crawling)/.test(lower)) return "bot";
  if (lower.includes("edg/")) return "Edge";
  if (lower.includes("chrome/") && !lower.includes("chromium"))
    return "Chrome";
  if (lower.includes("firefox/")) return "Firefox";
  if (lower.includes("safari/") && !lower.includes("chrome"))
    return "Safari";
  if (lower.includes("curl/")) return "curl";
  if (lower.includes("node-fetch") || lower.includes("undici"))
    return "node";
  return "other";
}

/**
 * Sanitise an upstream error message before persistence. Drops the Apify
 * token if present and caps length so we never bloat `error_excerpt`.
 */
export function sanitizeErrorExcerpt(message: string): string {
  const token = process.env.APIFY_TOKEN;
  let cleaned = message;
  if (token && token.length > 4) {
    cleaned = cleaned.split(token).join("[redacted]");
  }
  // Strip obvious "token=..." or "apiKey=..." query fragments.
  cleaned = cleaned.replace(/(token|api[_-]?key)=[^&\s]+/gi, "$1=[redacted]");
  return cleaned.slice(0, 200);
}