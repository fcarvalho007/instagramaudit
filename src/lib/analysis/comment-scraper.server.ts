/**
 * Server-only wrapper for the Apify Instagram Comment Scraper actor.
 *
 * Calls `apify/instagram-comment-scraper` (actor id SbK00X0JYCPblD2wp)
 * via `runActorWithMetadata` for post URLs, returning raw comment objects
 * grouped by post.
 *
 * IMPORTANT: The raw comment data is processed in-memory only. It must
 * never be persisted — only the aggregated CommentIntelligence object
 * is stored (GDPR-safe).
 *
 * TODO: Verify actor input/output schema against a real Apify run before
 * enabling in production. The `directUrls`, `resultsLimit`,
 * `includeNestedComments`, and `isNewestComments` fields match the
 * documented schema as of 2025-05. The output shape (flat comments
 * without per-comment post-URL back-reference) is the documented
 * behaviour — grouping falls back to a single aggregated bucket when
 * no post-URL field is found on individual items.
 */

import {
  runActorWithMetadata,
  ApifyConfigError,
  ApifyUpstreamError,
} from "./apify-client";
import type { RawApifyComment, PostCommentBatch } from "./comment-intelligence";

// ─────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────

const COMMENT_ACTOR = "apify/instagram-comment-scraper";

/**
 * Max posts to send to the comment scraper per analysis.
 * Override via COMMENT_SCRAPER_MAX_POSTS env var. Default: 3 (conservative for free reports).
 */
export const COMMENT_SCRAPER_MAX_POSTS = clampInt(
  process.env.COMMENT_SCRAPER_MAX_POSTS, 3, 1, 12,
);

/**
 * Max comments to retrieve per post.
 * Override via COMMENT_SCRAPER_RESULTS_LIMIT env var. Default: 20 (conservative for free reports).
 */
export const COMMENT_SCRAPER_RESULTS_LIMIT = clampInt(
  process.env.COMMENT_SCRAPER_RESULTS_LIMIT, 20, 5, 200,
);

/** Whether to include nested replies in comment results. */
export const COMMENT_SCRAPER_INCLUDE_REPLIES = true;

/**
 * Hard cap on total comments (top-level + replies) kept per report.
 * Override via COMMENT_SCRAPER_MAX_TOTAL_COMMENTS env var. Default: 60.
 */
export const COMMENT_SCRAPER_MAX_TOTAL_COMMENTS = clampInt(
  process.env.COMMENT_SCRAPER_MAX_TOTAL_COMMENTS, 60, 10, 500,
);

/**
 * Hard USD cap per comment scraper run.
 * Override via COMMENT_SCRAPER_MAX_CHARGE_USD env var. Default: 1.50 (conservative).
 */
export const COMMENT_SCRAPER_MAX_CHARGE_USD = clampFloat(
  process.env.COMMENT_SCRAPER_MAX_CHARGE_USD, 1.5, 0.10, 5.0,
);

/** Parse an int env var with clamped min/max bounds. */
function clampInt(raw: string | undefined, fallback: number, min: number, max: number): number {
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

/** Parse a float env var with clamped min/max bounds. */
function clampFloat(raw: string | undefined, fallback: number, min: number, max: number): number {
  if (!raw) return fallback;
  const n = parseFloat(raw);
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

// ─────────────────────────────────────────────────────────────────────
// Feature gate
// ─────────────────────────────────────────────────────────────────────

export interface CommentScraperGateInput {
  /** Is `COMMENT_SCRAPER_ENABLED` === "true"? */
  featureEnabled: boolean;
  /** Override for internal testing (admin/test profiles). */
  isInternalTest?: boolean;
}

/**
 * Determine whether the comment scraper should run for a given analysis.
 *
 * Requires `featureEnabled` (env-level kill switch).
 * `isInternalTest` allows running even when the feature flag is off (dev convenience).
 */
export function shouldRunCommentScraper(input: CommentScraperGateInput): boolean {
  return input.featureEnabled || input.isInternalTest === true;
}

// ─────────────────────────────────────────────────────────────────────
// Main entry point
// ─────────────────────────────────────────────────────────────────────

export interface CommentScraperResult {
  batches: PostCommentBatch[];
  runId: string | null;
  actualCostUsd: number | null;
  durationMs: number;
  commentsReturned: number;
  postsRequested: number;
  /** True if per-post grouping was available; false if all comments fell into a single aggregated bucket. */
  groupedByPost: boolean;
}

/**
 * Fetch comments for a list of post URLs via Apify.
 *
 * The actor returns a flat list of comment objects. The official
 * `apify/instagram-comment-scraper` documentation does NOT guarantee
 * a per-comment post-URL back-reference. When no back-reference is
 * found (or fewer than 50% of items match), all comments are placed
 * into a single aggregated batch and `groupedByPost` is set to false.
 *
 * @param postUrls - Array of Instagram post permalinks (max COMMENT_SCRAPER_MAX_POSTS)
 * @returns Batches grouped by post URL (or single aggregated batch), plus run metadata
 */
export async function fetchCommentsForPosts(
  postUrls: string[],
): Promise<CommentScraperResult> {
  const urls = postUrls.slice(0, COMMENT_SCRAPER_MAX_POSTS);

  if (urls.length === 0) {
    return {
      batches: [],
      runId: null,
      actualCostUsd: null,
      durationMs: 0,
      commentsReturned: 0,
      postsRequested: 0,
      groupedByPost: false,
    };
  }

  const startTime = Date.now();

  const result = await runActorWithMetadata<Record<string, unknown>>(
    COMMENT_ACTOR,
    {
      directUrls: urls,
      resultsLimit: COMMENT_SCRAPER_RESULTS_LIMIT,
      includeNestedComments: COMMENT_SCRAPER_INCLUDE_REPLIES,
      isNewestComments: true,
    },
    {
      timeoutMs: 120_000,
      apifyTimeoutSecs: 110,
      maxTotalChargeUsd: COMMENT_SCRAPER_MAX_CHARGE_USD,
    },
  );

  const durationMs = Date.now() - startTime;

  // Parse all raw items into typed comments
  const parsedComments: Array<{ comment: RawApifyComment; postRef: string | null }> = [];

  for (const raw of result.items) {
    const comment: RawApifyComment = {
      id: String(raw.id ?? ""),
      text: typeof raw.text === "string" ? raw.text : undefined,
      ownerUsername:
        typeof raw.ownerUsername === "string" ? raw.ownerUsername : undefined,
      timestamp:
        typeof raw.timestamp === "string" ? raw.timestamp : undefined,
      likesCount:
        typeof raw.likesCount === "number" ? raw.likesCount : undefined,
      repliesCount:
        typeof raw.repliesCount === "number" ? raw.repliesCount : undefined,
      replies: Array.isArray(raw.replies)
        ? parseReplies(raw.replies as Record<string, unknown>[])
        : undefined,
    };

    // Try to extract a post-URL back-reference (not guaranteed by this actor)
    const postRef =
      typeof raw.postUrl === "string"
        ? raw.postUrl
        : typeof raw.inputUrl === "string"
          ? raw.inputUrl
          : typeof raw.url === "string"
            ? raw.url
            : null;

    parsedComments.push({ comment, postRef });
  }

  // Determine if we have post-level grouping
  const hasPostRefs = parsedComments.some((c) => c.postRef !== null);
  let groupedByPost = false;
  let batches: PostCommentBatch[];

  if (hasPostRefs) {
    // Attempt per-post grouping using back-references
    const byPost = new Map<string, RawApifyComment[]>();
    for (const u of urls) {
      byPost.set(u, []);
    }

    let matchedCount = 0;
    const orphans: RawApifyComment[] = [];

    for (const { comment, postRef } of parsedComments) {
      if (postRef) {
        const bucket = findBucket(byPost, postRef);
        if (bucket) {
          bucket.push(comment);
          matchedCount++;
          continue;
        }
      }
      orphans.push(comment);
    }

    // If at least half matched, consider grouping valid
    if (matchedCount > parsedComments.length * 0.5) {
      groupedByPost = true;
      if (orphans.length > 0) {
        const firstBucket = byPost.get(urls[0]);
        if (firstBucket) {
          firstBucket.push(...orphans);
        }
      }
      batches = [];
      for (const [postUrl, comments] of byPost) {
        batches.push({ postUrl, comments });
      }
    } else {
      batches = buildAggregatedBatch(urls, parsedComments.map((c) => c.comment));
    }
  } else {
    batches = buildAggregatedBatch(urls, parsedComments.map((c) => c.comment));
  }

  return {
    batches,
    runId: result.runId,
    actualCostUsd: result.actualCostUsd,
    durationMs,
    commentsReturned: parsedComments.length,
    postsRequested: urls.length,
    groupedByPost,
  };
}

/**
 * Build a single aggregated batch when per-post grouping is unavailable.
 */
function buildAggregatedBatch(
  urls: string[],
  comments: RawApifyComment[],
): PostCommentBatch[] {
  if (comments.length === 0) {
    return urls.map((postUrl) => ({ postUrl, comments: [] }));
  }
  return [{ postUrl: urls[0], comments }];
}

/**
 * Safely parse nested replies from raw Apify data.
 */
function parseReplies(rawReplies: Record<string, unknown>[]): RawApifyComment[] {
  return rawReplies.map((r) => ({
    id: String(r.id ?? ""),
    text: typeof r.text === "string" ? r.text : undefined,
    ownerUsername:
      typeof r.ownerUsername === "string" ? r.ownerUsername : undefined,
    timestamp: typeof r.timestamp === "string" ? r.timestamp : undefined,
    likesCount: typeof r.likesCount === "number" ? r.likesCount : undefined,
    repliesCount:
      typeof r.repliesCount === "number" ? r.repliesCount : undefined,
    replies: Array.isArray(r.replies)
      ? parseReplies(r.replies as Record<string, unknown>[])
      : undefined,
  }));
}

/**
 * Find the matching bucket for a post URL, handling trailing slash and
 * shortcode variations (both /p/ and /reel/).
 */
function findBucket(
  byPost: Map<string, RawApifyComment[]>,
  postUrl: string,
): RawApifyComment[] | null {
  const direct = byPost.get(postUrl);
  if (direct) return direct;

  const normalised = postUrl.replace(/\/+$/, "");
  for (const [key, bucket] of byPost) {
    if (key.replace(/\/+$/, "") === normalised) return bucket;
  }

  const shortcodeMatch = postUrl.match(/\/(?:p|reel)\/([^/]+)/);
  if (shortcodeMatch) {
    const code = shortcodeMatch[1];
    for (const [key, bucket] of byPost) {
      if (key.includes(`/p/${code}`) || key.includes(`/reel/${code}`)) return bucket;
    }
  }

  return null;
}

export { ApifyConfigError, ApifyUpstreamError };