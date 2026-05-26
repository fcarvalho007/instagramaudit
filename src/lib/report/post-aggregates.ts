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

/**
 * Compute likes/comments averages over the full `posts` array.
 * Returns `null` when there are no posts (caller may fall back to
 * `content_summary` for legacy snapshots that didn't persist post-level
 * detail).
 */
export function computePostAverages(
  posts: SnapshotPost[] | null | undefined,
): PostAverages | null {
  if (!Array.isArray(posts) || posts.length === 0) return null;

  let totalLikes = 0;
  let totalComments = 0;
  for (const p of posts) {
    totalLikes += num(p.likes);
    totalComments += num(p.comments);
  }

  return {
    averageLikes: totalLikes / posts.length,
    averageComments: totalComments / posts.length,
    postsAnalyzed: posts.length,
  };
}