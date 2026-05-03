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
 * Actor input fields (verified against docs as of 2025-05):
 *   - `directUrls`           : string[] — post/reel URLs to scrape
 *   - `resultsLimit`         : number   — GLOBAL total results (not per-URL)
 *   - `includeNestedComments`: boolean  — include reply threads (nested inside parent)
 *   - `isNewestComments`     : boolean  — sort newest first
 *
 * Replies are nested inside each comment object, NOT separate charged results.
 * `resultsLimit` controls the total flat result count across all URLs.
 *
 * Budget target: ~$0.15/analysis. Hard cap: $0.20/analysis.
 * Pricing assumption: ~$1.90 per 1,000 results → $0.0019/result.
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

// ─────────────────────────────────────────────────────────────────────
// Pricing assumption
// ─────────────────────────────────────────────────────────────────────

/** Estimated cost per result (comment) based on Apify pricing ~$1.90/1K */
const COST_PER_RESULT_USD = 0.0019;

/** Target cost per analysis — informational, used in budget planning. */
export const COMMENT_SCRAPER_TARGET_COST_USD = 0.15;

/** Absolute hard cap — env vars above this are clamped down with a warning. */
const HARD_MAX_CHARGE_CEILING = 0.20;

/**
 * Max posts to send to the comment scraper per analysis.
 * Override via COMMENT_SCRAPER_MAX_POSTS env var. Default: 12 (all base actor posts).
 */
export const COMMENT_SCRAPER_MAX_POSTS = clampInt(
  process.env.COMMENT_SCRAPER_MAX_POSTS, 12, 1, 12,
);

/**
 * Max total results (comments) across all posts — global limit for the actor.
 * Override via COMMENT_SCRAPER_MAX_TOTAL_RESULTS env var. Default: 80 (~$0.152).
 * Hard-capped at 105 (~$0.20).
 */
export const COMMENT_SCRAPER_MAX_TOTAL_RESULTS = clampInt(
  process.env.COMMENT_SCRAPER_MAX_TOTAL_RESULTS,
  80,
  5,
  Math.floor(HARD_MAX_CHARGE_CEILING / COST_PER_RESULT_USD), // ~105
);

/** Whether to include nested replies in comment results. */
export const COMMENT_SCRAPER_INCLUDE_REPLIES = true;

/**
 * Hard USD cap per comment scraper run.
 * Override via COMMENT_SCRAPER_MAX_CHARGE_USD env var. Default: $0.20.
 * CRITICAL: Clamped to $0.20 ceiling — env values above are silently reduced with a warning.
 */
export const COMMENT_SCRAPER_MAX_CHARGE_USD = (() => {
  const raw = process.env.COMMENT_SCRAPER_MAX_CHARGE_USD;
  const parsed = clampFloat(raw, HARD_MAX_CHARGE_CEILING, 0.05, HARD_MAX_CHARGE_CEILING);
  if (raw && parseFloat(raw) > HARD_MAX_CHARGE_CEILING) {
    console.warn(
      `[comment-scraper] COMMENT_SCRAPER_MAX_CHARGE_USD env (${raw}) exceeds hard ceiling $${HARD_MAX_CHARGE_CEILING}. Clamped to $${HARD_MAX_CHARGE_CEILING}.`,
    );
  }
  return parsed;
})();

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

export interface CommentBudgetPlan {
  selectedPostCount: number;
  validPostUrlsCount: number;
  maxTotalResults: number;
  estimatedMaxCostUsd: number;
  hardMaxCostUsd: number;
  budgetBlocked: boolean;
  adjustedResultsLimit: number;
}

export interface CommentScraperResult extends CommentBudgetPlan {
  batches: PostCommentBatch[];
  runId: string | null;
  actualCostUsd: number | null;
  durationMs: number;
  commentsReturned: number;
  repliesReturned: number;
  postsRequested: number;
  /** True if per-post grouping was available; false if all comments fell into a single aggregated bucket. */
  groupedByPost: boolean;
}

/**
 * Pre-flight budget check. Calculates whether the planned scrape fits
 * within the $0.20 hard cap. If not, reduces the results limit.
 * If even 1 result would exceed the cap, returns budgetBlocked = true.
 */
export function planCommentBudget(
  validPostUrlCount: number,
  totalPostsProvided: number,
): CommentBudgetPlan {
  let maxResults = COMMENT_SCRAPER_MAX_TOTAL_RESULTS;
  let estimated = maxResults * COST_PER_RESULT_USD;

  // Reduce results until we fit within the hard cap
  if (estimated > HARD_MAX_CHARGE_CEILING) {
    maxResults = Math.floor(HARD_MAX_CHARGE_CEILING / COST_PER_RESULT_USD);
    estimated = maxResults * COST_PER_RESULT_USD;
  }

  const blocked = maxResults < 1 || validPostUrlCount === 0;

  return {
    selectedPostCount: totalPostsProvided,
    validPostUrlsCount: validPostUrlCount,
    maxTotalResults: COMMENT_SCRAPER_MAX_TOTAL_RESULTS,
    estimatedMaxCostUsd: Number(estimated.toFixed(4)),
    hardMaxCostUsd: HARD_MAX_CHARGE_CEILING,
    budgetBlocked: blocked,
    adjustedResultsLimit: maxResults,
  };
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
      repliesReturned: 0,
      postsRequested: 0,
      groupedByPost: false,
      selectedPostCount: 0,
      validPostUrlsCount: 0,
      maxTotalResults: COMMENT_SCRAPER_MAX_TOTAL_RESULTS,
      estimatedMaxCostUsd: 0,
      hardMaxCostUsd: HARD_MAX_CHARGE_CEILING,
      budgetBlocked: false,
      adjustedResultsLimit: COMMENT_SCRAPER_MAX_TOTAL_RESULTS,
    };
  }

  // Pre-flight budget check
  const budget = planCommentBudget(urls.length, postUrls.length);

  console.info("[comment-scraper] budget plan", budget);

  if (budget.budgetBlocked) {
    console.warn("[comment-scraper] budget blocked — skipping actor call");
    return {
      batches: [],
      runId: null,
      actualCostUsd: null,
      durationMs: 0,
      commentsReturned: 0,
      repliesReturned: 0,
      postsRequested: urls.length,
      groupedByPost: false,
      ...budget,
    };
  }

  const startTime = Date.now();

  const result = await runActorWithMetadata<Record<string, unknown>>(
    COMMENT_ACTOR,
    {
      directUrls: urls,                                    // Post/reel URLs from base actor
      resultsLimit: budget.adjustedResultsLimit,            // Global total (not per-URL)
      includeNestedComments: COMMENT_SCRAPER_INCLUDE_REPLIES, // Replies nested inside parent
      isNewestComments: true,                               // Newest comments first
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
  let totalRepliesReturned = 0;

  for (const raw of result.items) {
    const parsedReplies = Array.isArray(raw.replies)
      ? parseReplies(raw.replies as Record<string, unknown>[])
      : undefined;
    if (parsedReplies) {
      totalRepliesReturned += countRepliesDeep(parsedReplies);
    }

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
      replies: parsedReplies,
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
    repliesReturned: totalRepliesReturned,
    postsRequested: urls.length,
    groupedByPost,
      ...budget,
  };
}

/**
 * Count replies recursively.
 */
function countRepliesDeep(replies: RawApifyComment[]): number {
  let count = replies.length;
  for (const r of replies) {
    if (r.replies) count += countRepliesDeep(r.replies);
  }
  return count;
}

/**
 * Validate that a URL looks like an Instagram post/reel permalink.
 */
export function isValidInstagramPostUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return (
      (u.hostname === "www.instagram.com" || u.hostname === "instagram.com") &&
      /^\/(p|reel)\/[A-Za-z0-9_-]+/.test(u.pathname)
    );
  } catch {
    return false;
  }
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