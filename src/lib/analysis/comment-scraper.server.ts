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

/** Max posts to send to the comment scraper per analysis. */
export const COMMENT_SCRAPER_MAX_POSTS = 12;

/** Max comments to retrieve per post. */
export const COMMENT_SCRAPER_RESULTS_LIMIT = 50;

/** Whether to include nested replies in comment results. */
export const COMMENT_SCRAPER_INCLUDE_REPLIES = true;

/** Hard USD cap per comment scraper run. */
const COMMENT_SCRAPER_MAX_CHARGE_USD = 3.0;

// ─────────────────────────────────────────────────────────────────────
// Main entry point
// ─────────────────────────────────────────────────────────────────────

export interface CommentScraperResult {
  batches: PostCommentBatch[];
  runId: string | null;
  actualCostUsd: number | null;
}

/**
 * Fetch comments for a list of post URLs via Apify.
 *
 * The actor returns a flat list of comment objects. Each comment has a
 * reference to its parent post (via the input URL). Since we send
 * multiple URLs in a single actor run, we need to group comments by
 * post URL after the fact.
 *
 * @param postUrls - Array of Instagram post permalinks (max COMMENT_SCRAPER_MAX_POSTS)
 * @returns Batches grouped by post URL, plus run metadata
 */
export async function fetchCommentsForPosts(
  postUrls: string[],
): Promise<CommentScraperResult> {
  const urls = postUrls.slice(0, COMMENT_SCRAPER_MAX_POSTS);

  if (urls.length === 0) {
    return { batches: [], runId: null, actualCostUsd: null };
  }

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

  // Group raw items by post URL. The comment scraper includes the post
  // URL in each item — common field names: `postUrl`, `inputUrl`, `url`.
  const byPost = new Map<string, RawApifyComment[]>();

  // Initialise buckets for all requested URLs so we return empty batches
  // for posts with zero comments.
  for (const u of urls) {
    byPost.set(u, []);
  }

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
        ? (raw.replies as RawApifyComment[])
        : undefined,
    };

    // Determine which post URL this comment belongs to
    const postUrl =
      typeof raw.postUrl === "string"
        ? raw.postUrl
        : typeof raw.inputUrl === "string"
          ? raw.inputUrl
          : typeof raw.url === "string"
            ? raw.url
            : null;

    // Try to match against known URLs
    if (postUrl) {
      const bucket = findBucket(byPost, postUrl);
      if (bucket) {
        bucket.push(comment);
      }
    }
  }

  const batches: PostCommentBatch[] = [];
  for (const [postUrl, comments] of byPost) {
    batches.push({ postUrl, comments });
  }

  return {
    batches,
    runId: result.runId,
    actualCostUsd: result.actualCostUsd,
  };
}

/**
 * Find the matching bucket for a post URL, handling trailing slash and
 * shortcode variations.
 */
function findBucket(
  byPost: Map<string, RawApifyComment[]>,
  postUrl: string,
): RawApifyComment[] | null {
  // Direct match
  const direct = byPost.get(postUrl);
  if (direct) return direct;

  // Normalise: strip trailing slash and try again
  const normalised = postUrl.replace(/\/+$/, "");
  for (const [key, bucket] of byPost) {
    if (key.replace(/\/+$/, "") === normalised) return bucket;
  }

  // Extract shortcode and match
  const shortcodeMatch = postUrl.match(/\/p\/([^/]+)/);
  if (shortcodeMatch) {
    const code = shortcodeMatch[1];
    for (const [key, bucket] of byPost) {
      if (key.includes(`/p/${code}`)) return bucket;
    }
  }

  return null;
}

export { ApifyConfigError, ApifyUpstreamError };