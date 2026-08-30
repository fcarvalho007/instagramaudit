/**
 * Provider-agnostic contract for Instagram public data.
 *
 * Every adapter returns rows in the SAME shape the Apify
 * `apify/instagram-scraper` actor produces, because `normalizeProfile` /
 * `normalizePost` (src/lib/analysis/normalize.ts) are the single source of
 * truth for the report payload. Adapters translate INTO that shape; the
 * normalizer never learns about providers.
 *
 * Fields a provider cannot supply are simply omitted — never zero-filled.
 * Downstream blocks already treat absence as "não mensurável".
 */

export type ProviderId = "apify" | "scrapecreators";

export type ProviderOperation = "profile" | "posts" | "comments";

/** Apify-shaped profile row (`resultsType: "details"`). */
export type ProviderProfileRow = Record<string, unknown>;

/** Apify-shaped post row (`resultsType: "posts"` / `latestPosts[]` item). */
export type ProviderPostRow = Record<string, unknown>;

export interface ProviderFetchMeta {
  provider: ProviderId;
  /** Provider run/request identifier, when the provider exposes one. */
  runId: string | null;
  /**
   * Real monetary cost in USD when known. ScrapeCreators promotional credits
   * cost nothing, so this stays 0 while no per-credit price is configured.
   */
  actualCostUsd: number | null;
  /** Same value as `actualCostUsd`, named explicitly for cost telemetry. */
  monetaryCostUsd: number | null;
  /** Billable units consumed (dataset items / API calls). */
  billedResults: number;
  /** Provider credits consumed by this call (ScrapeCreators). */
  creditsConsumed: number | null;
  /** Provider credit balance after the call, when reported. */
  creditsRemaining: number | null;
  /** True when the provider served the response from its own cache. */
  cached: boolean;
  /** Provider endpoint / actor identifier for diagnostics. */
  endpoint: string | null;
}

export interface ProviderProfileResult extends ProviderFetchMeta {
  row: ProviderProfileRow | null;
}

export interface ProviderPostsResult extends ProviderFetchMeta {
  rows: ProviderPostRow[];
  /** True when the provider stopped before the requested window was covered. */
  truncated: boolean;
}

export interface FetchPostsOptions {
  /** Oldest timestamp to include (epoch ms). Omit for "latest N". */
  sinceMs?: number;
  /** Hard cap on returned posts. */
  maxPosts: number;
  /** Wall-clock budget for the whole (possibly paginated) fetch. */
  timeoutMs: number;
}

/** Provider-agnostic comment row (matches `RawApifyComment`). */
export interface ProviderCommentRow {
  id: string;
  text?: string;
  ownerUsername?: string;
  timestamp?: string;
  likesCount?: number;
  repliesCount?: number;
}

export interface ProviderCommentBatch {
  postUrl: string;
  comments: ProviderCommentRow[];
}

export interface FetchCommentsOptions {
  /** Max comments per post. */
  perPostLimit: number;
  /** Wall-clock budget for the whole fetch. */
  timeoutMs: number;
}

export interface ProviderCommentsResult extends ProviderFetchMeta {
  batches: ProviderCommentBatch[];
  /** Post URLs the provider could not serve (candidates for the fallback). */
  failedPostUrls: string[];
  /** True when comments carry a reliable per-post back-reference. */
  groupedByPost: boolean;
}

export interface SocialDataProvider {
  readonly id: ProviderId;
  /** True when the provider has the credentials/flags it needs. */
  isConfigured(): boolean;
  fetchProfile(handle: string): Promise<ProviderProfileResult>;
  fetchPosts(
    handle: string,
    options: FetchPostsOptions,
  ): Promise<ProviderPostsResult>;
  fetchComments(
    postUrls: string[],
    options: FetchCommentsOptions,
  ): Promise<ProviderCommentsResult>;
}

/** Neutral telemetry defaults so adapters only set what they know. */
export function emptyMeta(
  provider: ProviderId,
  endpoint: string | null,
): ProviderFetchMeta {
  return {
    provider,
    runId: null,
    actualCostUsd: null,
    monetaryCostUsd: null,
    billedResults: 0,
    creditsConsumed: null,
    creditsRemaining: null,
    cached: false,
    endpoint,
  };
}
