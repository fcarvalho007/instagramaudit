/**
 * Single source of truth for averages derived from `payload.posts`.
 *
 * Background: `payload.content_summary.average_*` was historically rounded
 * during persistence (e.g. 0.42 → 0), so snapshots created before the
 * `toFixed(2)` fix in `src/lib/analysis/normalize.ts` are out of sync with
 * their own `posts` array. Card 1 (Visão geral) and Card P05 (Resposta do
 * público) must agree, so both read from this helper whenever possible and
 * only fall back to `content_summary` if the posts array is missing.
 */

import type { SnapshotPost } from "@/lib/report/snapshot-to-report-data";

export interface PostAverages {
  averageLikes: number;
  averageComments: number;
  postsAnalyzed: number;
}

function num(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export interface PostAveragesOptions {
  /**
   * Exclude pinned posts (`is_pinned === true`) from the calculation.
   * Defaults to `false`: a post is not an outlier merely for being pinned.
   * Temporal filtering is done by timestamp elsewhere. Callers that
   * explicitly need the legacy behaviour can pass `true`.
   *
   * When every post is pinned the function falls back to using all of
   * them, so the report never returns null just because the only posts
   * available are pinned.
   */
  excludePinned?: boolean;
}

/**
 * Compute likes/comments averages over the full `posts` array.
 * Returns `null` when there are no usable posts (caller may fall back to
 * `content_summary` for legacy snapshots that didn't persist post-level
 * detail).
 *
 * By default pinned posts are excluded — see `PostAveragesOptions`.
 */
export function computePostAverages(
  posts: SnapshotPost[] | null | undefined,
  options: PostAveragesOptions = {},
): PostAverages | null {
  if (!Array.isArray(posts) || posts.length === 0) return null;

  const excludePinned = options.excludePinned ?? false;
  const nonPinned = excludePinned
    ? posts.filter((p) => p?.is_pinned !== true)
    : posts;
  // Fallback when every post is pinned: keep them so we don't lose the
  // entire sample.
  const sample = nonPinned.length > 0 ? nonPinned : posts;

  let totalLikes = 0;
  let totalComments = 0;
  for (const p of sample) {
    totalLikes += num(p.likes);
    totalComments += num(p.comments);
  }

  return {
    averageLikes: totalLikes / sample.length,
    averageComments: totalComments / sample.length,
    postsAnalyzed: sample.length,
  };
}