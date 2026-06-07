/**
 * Public analysis window configurations.
 *
 * PR 1 (backend) — Pro users with `report_full_9` entitlement can request
 * a wider analysis window for the PRIMARY profile. Competitors stay on
 * baseline (12 posts) in this phase to control cost and cache complexity.
 *
 * Public surface is intentionally restricted to: baseline / 30d / 90d.
 * 60d / 365d remain Lab/admin-only and MUST NOT be accepted by the public
 * endpoint.
 */

import { PUBLIC_INSTAGRAM_POSTS_LIMIT } from "@/lib/analysis/constants";

export type PublicWindowKind = "baseline" | "30d" | "90d";

export const PUBLIC_WINDOW_KINDS: readonly PublicWindowKind[] = [
  "baseline",
  "30d",
  "90d",
] as const;

export interface PublicWindowConfig {
  /** Apify `resultsLimit` — number of posts inside `latestPosts[]`. */
  resultsLimit: number;
  /** Apify `onlyPostsNewerThan` — omitted for baseline (no time filter). */
  onlyPostsNewerThan?: string;
  /** Local wall-clock timeout for the actor call. */
  timeoutMs: number;
  /** Apify-side run timeout. */
  apifyTimeoutSecs: number;
  /** Hard USD cap per call (final safety net). */
  maxTotalChargeUsd: number;
  /** Human-readable label (pt-PT). */
  label: string;
  /** Cost tier exposed for logs / future analytics. */
  costTier: "baseline" | "wide";
}

/**
 * Window configs allowed in the public endpoint. Mirrors the admin Lab
 * settings for 30d/90d, but capped to the 3 windows we expose to end users.
 */
export const PUBLIC_WINDOW_CONFIGS: Record<PublicWindowKind, PublicWindowConfig> = {
  baseline: {
    resultsLimit: PUBLIC_INSTAGRAM_POSTS_LIMIT,
    timeoutMs: 60_000,
    apifyTimeoutSecs: 55,
    maxTotalChargeUsd: 0.1,
    label: "Últimas publicações",
    costTier: "baseline",
  },
  "30d": {
    resultsLimit: 100,
    onlyPostsNewerThan: "30 days",
    timeoutMs: 100_000,
    apifyTimeoutSecs: 90,
    maxTotalChargeUsd: 0.1,
    label: "Últimos 30 dias",
    costTier: "wide",
  },
  "90d": {
    resultsLimit: 300,
    onlyPostsNewerThan: "90 days",
    timeoutMs: 160_000,
    apifyTimeoutSecs: 150,
    maxTotalChargeUsd: 0.3,
    label: "Últimos 90 dias",
    costTier: "wide",
  },
};

export function isPublicWindowKind(value: unknown): value is PublicWindowKind {
  return (
    typeof value === "string" &&
    (PUBLIC_WINDOW_KINDS as readonly string[]).includes(value)
  );
}

/** True for any window that requires the Pro entitlement + 1 credit. */
export function isWideWindow(window: PublicWindowKind): boolean {
  return window !== "baseline";
}

/** Cache key suffix for a window. Empty string for baseline (byte-compat). */
export function windowCacheSuffix(window: PublicWindowKind | undefined): string {
  if (!window || window === "baseline") return "";
  return `:w=${window}`;
}