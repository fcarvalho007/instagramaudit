/**
 * Negative-cache rules for public analyses. Pure helpers so they can be
 * tested without importing the route.
 */

export type NegativeCacheCode =
  | "PROFILE_PERSONAL_NO_FEED"
  | "PROFILE_PRIVATE"
  | "PROFILE_NOT_FOUND"
  | "PROFILE_UNREADABLE";

/** Codes replayed for 24h — the profile itself is the cause. */
const LONG_TTL_CODES = new Set<NegativeCacheCode>([
  "PROFILE_PERSONAL_NO_FEED",
  "PROFILE_PRIVATE",
]);

export const NEGATIVE_CACHE_LONG_TTL_MS = 24 * 60 * 60 * 1000;
/** Empty results may be transient (provider side), so keep them briefly. */
export const NEGATIVE_CACHE_SHORT_TTL_MS = 15 * 60 * 1000;

export const NEGATIVE_CACHE_CODES: NegativeCacheCode[] = [
  "PROFILE_PERSONAL_NO_FEED",
  "PROFILE_PRIVATE",
  "PROFILE_NOT_FOUND",
  "PROFILE_UNREADABLE",
];

export function negativeCacheTtlMs(code: NegativeCacheCode): number {
  return LONG_TTL_CODES.has(code)
    ? NEGATIVE_CACHE_LONG_TTL_MS
    : NEGATIVE_CACHE_SHORT_TTL_MS;
}

/** True when a recorded negative result should still be replayed. */
export function isNegativeCacheHit(
  code: string | null | undefined,
  createdAtIso: string | null | undefined,
  nowMs: number = Date.now(),
): code is NegativeCacheCode {
  if (!code || !createdAtIso) return false;
  if (!(NEGATIVE_CACHE_CODES as string[]).includes(code)) return false;
  const created = Date.parse(createdAtIso);
  if (!Number.isFinite(created)) return false;
  return nowMs - created < negativeCacheTtlMs(code as NegativeCacheCode);
}

/**
 * An empty profile only means "not found" when the primary provider said
 * so. If we had to fall back, the backup simply could not read it.
 */
export function notFoundCode(
  fellBack: boolean,
): "PROFILE_NOT_FOUND" | "PROFILE_UNREADABLE" {
  return fellBack ? "PROFILE_UNREADABLE" : "PROFILE_NOT_FOUND";
}
