/**
 * Apify adapter (server-only).
 *
 * Wraps the existing `runActorWithMetadata` / `fetchCommentsForPosts` flows
 * behind the provider-agnostic contract so the router can treat Apify and
 * ScrapeCreators interchangeably.
 *
 * Apify rows already ARE the canonical shape consumed by the normalizer, so
 * this adapter is mostly telemetry plumbing. The single semantic fix is the
 * video signal: only `videoPlayCount` feeds the canonical `videoPlays`;
 * `videoViewCount` is kept separately and never conflated with plays.
 */

import { runActorWithMetadata } from "../apify-client";
import { PUBLIC_INSTAGRAM_POSTS_LIMIT } from "../constants";
import {
  emptyMeta,
  type FetchCommentsOptions,
  type FetchPostsOptions,
  type ProviderCommentsResult,
  type ProviderPostRow,
  type ProviderPostsResult,
  type ProviderProfileResult,
  type SocialDataProvider,
} from "./types";

const UNIFIED_ACTOR = "apify/instagram-scraper";

function profileUrlFor(handle: string): string {
  return `https://www.instagram.com/${handle}/`;
}

export const apifyProvider: SocialDataProvider = {
  id: "apify",

  isConfigured() {
    const token = process.env.APIFY_TOKEN;
    return Boolean(token && token.trim().length > 0);
  },

  async fetchProfile(handle: string): Promise<ProviderProfileResult> {
    const result = await runActorWithMetadata<Record<string, unknown>>(
      UNIFIED_ACTOR,
      {
        directUrls: [profileUrlFor(handle)],
        resultsType: "details",
        resultsLimit: PUBLIC_INSTAGRAM_POSTS_LIMIT,
        addParentData: false,
      },
      { timeoutMs: 60_000, apifyTimeoutSecs: 55, maxItems: 1 },
    );
    return {
      ...emptyMeta("apify", `${UNIFIED_ACTOR}:details`),
      runId: result.runId,
      billedResults: result.items.length,
      actualCostUsd: result.actualCostUsd,
      monetaryCostUsd: result.actualCostUsd,
      row: result.items[0] ?? null,
    };
  },

  async fetchPosts(
    handle: string,
    options: FetchPostsOptions,
  ): Promise<ProviderPostsResult> {
    const input: Record<string, unknown> = {
      directUrls: [profileUrlFor(handle)],
      resultsType: "posts",
      resultsLimit: options.maxPosts,
      addParentData: false,
    };
    if (options.sinceMs !== undefined) {
      input.onlyPostsNewerThan = new Date(options.sinceMs)
        .toISOString()
        .slice(0, 10);
    }
    const result = await runActorWithMetadata<Record<string, unknown>>(
      UNIFIED_ACTOR,
      input,
      {
        timeoutMs: options.timeoutMs,
        apifyTimeoutSecs: Math.max(30, Math.floor(options.timeoutMs / 1000) - 5),
        maxItems: options.maxPosts,
      },
    );
    const rows = result.items as ProviderPostRow[];
    return {
      ...emptyMeta("apify", `${UNIFIED_ACTOR}:posts`),
      runId: result.runId,
      billedResults: rows.length,
      actualCostUsd: result.actualCostUsd,
      monetaryCostUsd: result.actualCostUsd,
      rows,
      truncated: rows.length >= options.maxPosts,
    };
  },

  async fetchComments(
    postUrls: string[],
    _options: FetchCommentsOptions,
  ): Promise<ProviderCommentsResult> {
    const { fetchCommentsForPosts } = await import("../comment-scraper.server");
    const result = await fetchCommentsForPosts(postUrls);
    const served = new Set(result.batches.map((b) => b.postUrl));
    return {
      ...emptyMeta("apify", "apify/instagram-comment-scraper"),
      runId: result.runId,
      billedResults: result.commentsReturned,
      actualCostUsd: result.actualCostUsd,
      monetaryCostUsd: result.actualCostUsd,
      batches: result.batches.map((b) => ({
        postUrl: b.postUrl,
        comments: b.comments.map((c) => ({
          id: c.id ?? "",
          text: c.text,
          ownerUsername: c.ownerUsername,
          timestamp: c.timestamp,
          likesCount: c.likesCount,
          repliesCount: c.repliesCount,
        })),
      })),
      failedPostUrls: postUrls.filter((u) => !served.has(u)),
      groupedByPost: result.groupedByPost,
    };
  },
};
