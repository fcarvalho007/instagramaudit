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

/** Apify-shaped profile row (`resultsType: "details"`). */
export type ProviderProfileRow = Record<string, unknown>;

/** Apify-shaped post row (`resultsType: "posts"` / `latestPosts[]` item). */
export type ProviderPostRow = Record<string, unknown>;

export interface ProviderFetchMeta {
  provider: ProviderId;
  /** Provider run/request identifier, when the provider exposes one. */
  runId: string | null;
  /** Real cost when the provider reports it, else null. */
  actualCostUsd: number | null;
  /** Billable units consumed (dataset items / API calls). */
  billedResults: number;
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

export interface SocialDataProvider {
  readonly id: ProviderId;
  /** True when the provider has the credentials/flags it needs. */
  isConfigured(): boolean;
  fetchProfile(handle: string): Promise<ProviderProfileResult>;
  fetchPosts(
    handle: string,
    options: FetchPostsOptions,
  ): Promise<ProviderPostsResult>;
}
