/**
 * Block 1 — official sample definition (free report).
 *
 * Pure module. No I/O. The single source of truth for which posts feed
 * Block 1 (Visão Geral) metrics: performance averages, cadence, format
 * distribution and the "X publicações · Y dias" caption.
 *
 * Base: the latest `posts` returned by the snapshot, already capped by
 * `PUBLIC_INSTAGRAM_POSTS_LIMIT` upstream in `normalize.ts`.
 *
 * Rules:
 *   - Pinned posts are kept; only date outliers are pruned in Block 1
 *     statistic (performance, cadence, format). Pinned posts may be months
 *     or years older than the live feed and would distort current signals.
 *     Fallback: when 100% of the returned posts are pinned, we keep them
 *     so the report still has something to render.
 *   - Date outliers (> 180 days older than the median of the 10 most
 *     recent valid timestamps) are dropped from `performancePosts` and
 *     `cadencePosts` — defensive guard for stale-pinned posts that the
 *     actor failed to flag.
 *   - Format distribution uses `analyzedPosts` (non-pinned) so every
 *     metric on Block 1 sees the same denominator (Option A).
 *
 * The free report stays on a "latest N posts" sample (cost-predictable).
 * `observedPeriodDays` is derived from the actual timestamps so the UI
 * never claims "30 days" unless cadence falls into `window_30d`.
 */

import { normalizePostTimestamp } from "./cadence";
import type { SnapshotPost } from "./snapshot-to-report-data";

const DAY_MS = 86_400_000;
const OUTLIER_OFFSET_DAYS = 180;

export interface Block01Sample {
  /** Posts returned by the snapshot (already capped by the loader). */
  totalReturnedPosts: number;
  /** Non-pinned posts. Fallback: full set when every post is pinned. */
  analyzedPosts: SnapshotPost[];
  /** `analyzedPosts` minus date outliers — used for likes/comments/engagement. */
  performancePosts: SnapshotPost[];
  /** Same as `performancePosts`, exposed under a distinct name for clarity. */
  cadencePosts: SnapshotPost[];
  /** Non-pinned posts used for format distribution (Option A). */
  formatPosts: SnapshotPost[];
  /** How many pinned posts the filter removed. */
  pinnedPostsExcluded: number;
  /** How many stale-date outliers the guard removed. */
  dateOutliersExcluded: number;
  /** Observed window in days, derived from `performancePosts` timestamps. */
  observedPeriodDays: number;
  newestPostDateIso: string | null;
  oldestPostDateIso: string | null;
  /** Short, human-friendly label (PT). i18n is handled by the caller. */
  sampleLabel: string;
}

function pruneDateOutliers(posts: SnapshotPost[]): {
  kept: SnapshotPost[];
  dropped: number;
} {
  const withTs = posts
    .map((p) => ({ post: p, ts: normalizePostTimestamp(p) }))
    .filter(({ ts }) => Number.isFinite(ts));
  if (withTs.length < 3) return { kept: posts, dropped: 0 };

  const sortedDesc = [...withTs].sort((a, b) => b.ts - a.ts);
  const cluster = sortedDesc.slice(0, Math.min(10, sortedDesc.length));
  const clusterTs = [...cluster].map((x) => x.ts).sort((a, b) => a - b);
  const mid = Math.floor(clusterTs.length / 2);
  const med =
    clusterTs.length % 2 === 0
      ? (clusterTs[mid - 1] + clusterTs[mid]) / 2
      : clusterTs[mid];
  const cutoff = med - OUTLIER_OFFSET_DAYS * DAY_MS;

  const keepRefs = new Set(
    sortedDesc.filter((x) => x.ts >= cutoff).map((x) => x.post),
  );

  const kept: SnapshotPost[] = [];
  let dropped = 0;
  for (const p of posts) {
    const ts = normalizePostTimestamp(p);
    if (!Number.isFinite(ts)) {
      kept.push(p); // keep invalid-date posts as-is
      continue;
    }
    if (keepRefs.has(p)) kept.push(p);
    else dropped += 1;
  }
  return { kept, dropped };
}

function computeObservedPeriod(posts: SnapshotPost[]): {
  days: number;
  newestIso: string | null;
  oldestIso: string | null;
} {
  let minMs = Infinity;
  let maxMs = -Infinity;
  for (const p of posts) {
    const ts = normalizePostTimestamp(p);
    if (!Number.isFinite(ts)) continue;
    if (ts < minMs) minMs = ts;
    if (ts > maxMs) maxMs = ts;
  }
  if (!Number.isFinite(minMs) || !Number.isFinite(maxMs)) {
    return { days: 0, newestIso: null, oldestIso: null };
  }
  const spanDays = Math.max(1, Math.ceil((maxMs - minMs) / DAY_MS) + 1);
  return {
    days: spanDays,
    newestIso: new Date(maxMs).toISOString(),
    oldestIso: new Date(minMs).toISOString(),
  };
}

/**
 * Build the official Block 1 sample. Pure; safe to call multiple times.
 */
export function buildBlock01Sample(
  posts: ReadonlyArray<SnapshotPost> | null | undefined,
): Block01Sample {
  const all: SnapshotPost[] = Array.isArray(posts) ? [...posts] : [];
  const totalReturned = all.length;

  // Pinned posts stay in the sample — `is_pinned` is an analytical
  // attribute. Stale pinned posts are removed by the date-outlier pruning
  // below, i.e. strictly by timestamp.
  const nonPinned = all;
  const pinnedExcluded = 0;

  // Fallback: if every post is pinned, keep them so the report still has
  // a sample to render — but no statistic should claim "current performance".
  const analyzed = nonPinned.length > 0 ? nonPinned : all;

  const { kept: performance, dropped: outliersDropped } =
    pruneDateOutliers(analyzed);

  const { days, newestIso, oldestIso } = computeObservedPeriod(performance);

  const sampleLabel =
    performance.length > 0
      ? `${performance.length} publicações · ${days} dias observados`
      : "amostra insuficiente";

  return {
    totalReturnedPosts: totalReturned,
    analyzedPosts: analyzed,
    performancePosts: performance,
    cadencePosts: performance,
    formatPosts: analyzed,
    pinnedPostsExcluded: pinnedExcluded,
    dateOutliersExcluded: outliersDropped,
    observedPeriodDays: days,
    newestPostDateIso: newestIso,
    oldestPostDateIso: oldestIso,
    sampleLabel,
  };
}

/**
 * Serializable subset for the `enriched.block01Sample` field that travels
 * to the client. Posts are intentionally NOT serialised — the client only
 * needs counts and the window.
 */
export interface Block01SampleSummary {
  totalReturnedPosts: number;
  analyzedPostsCount: number;
  performancePostsCount: number;
  pinnedPostsExcluded: number;
  dateOutliersExcluded: number;
  observedPeriodDays: number;
  newestPostDateIso: string | null;
  oldestPostDateIso: string | null;
}

export function toSampleSummary(sample: Block01Sample): Block01SampleSummary {
  return {
    totalReturnedPosts: sample.totalReturnedPosts,
    analyzedPostsCount: sample.analyzedPosts.length,
    performancePostsCount: sample.performancePosts.length,
    pinnedPostsExcluded: sample.pinnedPostsExcluded,
    dateOutliersExcluded: sample.dateOutliersExcluded,
    observedPeriodDays: sample.observedPeriodDays,
    newestPostDateIso: sample.newestPostDateIso,
    oldestPostDateIso: sample.oldestPostDateIso,
  };
}