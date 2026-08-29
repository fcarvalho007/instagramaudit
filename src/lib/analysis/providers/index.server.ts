/**
 * Provider selection and fallback (server-only).
 *
 * Selection is per OPERATION, not per app, because the two providers have
 * different strengths on the Apify Free plan:
 *   - profile  → Apify by default (already logged, cached and budgeted);
 *   - posts    → ScrapeCreators when configured (real cursor pagination, so
 *                30/90-day windows are actually covered).
 *
 * Env overrides:
 *   SOCIAL_PROVIDER_PROFILE = apify | scrapecreators
 *   SOCIAL_PROVIDER_POSTS   = apify | scrapecreators
 *   SOCIAL_PROVIDER_FALLBACK = "true" (default) | "false"
 *
 * Fallback runs ONCE per operation and only for provider-side failures
 * (billing blocked, quota, upstream error). Never on validation errors.
 */

import { scrapeCreatorsProvider } from "./scrapecreators.server";
import type { ProviderId } from "./types";

export type ProviderOperation = "profile" | "posts";

function readProvider(name: string, fallback: ProviderId): ProviderId {
  const raw = (process.env[name] ?? "").trim().toLowerCase();
  return raw === "apify" || raw === "scrapecreators" ? raw : fallback;
}

export function isScrapeCreatorsConfigured(): boolean {
  return scrapeCreatorsProvider.isConfigured();
}

/**
 * Which provider should handle this operation right now. Falls back to
 * Apify whenever ScrapeCreators is selected but not configured, so a missing
 * key can never break the analysis flow.
 */
export function selectProvider(operation: ProviderOperation): ProviderId {
  const configured =
    operation === "profile"
      ? readProvider("SOCIAL_PROVIDER_PROFILE", "apify")
      : readProvider("SOCIAL_PROVIDER_POSTS", "apify");
  if (configured === "scrapecreators" && !isScrapeCreatorsConfigured()) {
    return "apify";
  }
  return configured;
}

export function isFallbackEnabled(): boolean {
  return (process.env.SOCIAL_PROVIDER_FALLBACK ?? "true").toLowerCase() !== "false";
}

/**
 * The alternative provider to try when `primary` fails, or null when there
 * is no usable alternative.
 */
export function fallbackProviderFor(primary: ProviderId): ProviderId | null {
  if (!isFallbackEnabled()) return null;
  if (primary === "apify") {
    return isScrapeCreatorsConfigured() ? "scrapecreators" : null;
  }
  return "apify";
}

/**
 * Provider-side failures worth retrying on the other provider. Validation
 * errors (bad handle, private profile) must NOT trigger a second paid call.
 */
export function isProviderSideFailure(error: unknown): boolean {
  if (!error) return false;
  const status = (error as { status?: unknown }).status;
  if (typeof status === "number") {
    if (status === 402 || status === 403 || status === 429) return true;
    if (status >= 500) return true;
  }
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return (
    message.includes("platform-feature-disabled") ||
    message.includes("billing") ||
    message.includes("quota") ||
    message.includes("insufficient") ||
    message.includes("timeout") ||
    message.includes("aborted")
  );
}

export { scrapeCreatorsProvider };
