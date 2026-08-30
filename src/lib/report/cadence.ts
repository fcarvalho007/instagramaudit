/**
 * Posting cadence — pure, dependency-free.
 *
 * Cascading strategy (first match wins):
 *   1. window_30d   — ≥3 posts in last 30 days → weekly = n / 4.345
 *   2. window_90d   — ≥3 posts in last 90 days → weekly = n / 12.857
 *   3. sample_span  — ≥2 posts, span ≤ 180 days → weekly = n / (span/7)
 *   4. insufficient — neutral copy, weekly = 0
 *
 * Always:
 *   - keeps pinned posts; filtering is strictly by timestamp
 *   - excludes posts with invalid/missing/future timestamps
 *   - sorts desc by timestamp before counting
 *   - accepts taken_at_iso OR taken_at (seconds OR milliseconds, auto-detected)
 *
 * Defensive outlier guard:
 *   When `is_pinned` is missing/false but a post sits > 180 days older than
 *   the median of the top-10 most recent posts, it is treated as an outlier
 *   (likely a stale pinned post from an actor that did not surface the flag)
 *   and excluded from the cascade. The exclusion is reported as
 *   `excludedOutliers` and surfaces the `date_outlier_detected` warning.
 *
 * Reliability flag:
 *   high   — window_30d with ≥5 posts and no warnings.
 *   medium — window_90d, or window_30d with 3–4 posts, or 1 warning.
 *   low    — sample_span, ≥2 warnings, or insufficient.
 */

export type CadenceMethod =
  | "window_30d"
  | "window_90d"
  | "sample_span"
  | "insufficient";

export type CadenceReliability = "high" | "medium" | "low";

export type CadenceWarning =
  | "pinned_excluded"
  | "low_sample"
  | "date_outlier_detected"
  | "stale_data";

export interface CadenceInputPost {
  taken_at_iso?: string | null;
  taken_at?: number | null;
  is_pinned?: boolean | null;
}

export interface CadenceResult {
  method: CadenceMethod;
  weekly: number;
  sampleSize: number;
  windowDays: number;
  sufficient: boolean;
  notePt: string | null;
  noteEn: string | null;
  reliability: CadenceReliability;
  warnings: CadenceWarning[];
  excludedPinned: number;
  excludedOutliers: number;
}

const DAY_MS = 86_400_000;
const WEEKS_PER_30D = 30 / 7; // 4.2857…
const WEEKS_PER_90D = 90 / 7; // 12.857…
const MAX_SAMPLE_SPAN_DAYS = 180;
const OUTLIER_OFFSET_DAYS = 180; // > 180d older than cluster median → outlier
const STALE_LAST_POST_DAYS = 60;

const INSUFFICIENT_PT =
  "A amostra recente é insuficiente para medir a cadência com segurança.";
const INSUFFICIENT_EN =
  "The recent sample is not enough to measure posting cadence reliably.";

/**
 * Normalize an Instagram-style timestamp to UTC milliseconds.
 * - prefers ISO string
 * - falls back to numeric taken_at, auto-detecting seconds vs milliseconds
 *   (anything < 1e12 is treated as seconds; ~31 years past epoch threshold)
 * Returns NaN if no valid timestamp can be derived.
 */
export function normalizePostTimestamp(post: CadenceInputPost): number {
  if (typeof post.taken_at_iso === "string" && post.taken_at_iso.length > 0) {
    const t = new Date(post.taken_at_iso).getTime();
    if (Number.isFinite(t)) return t;
  }
  if (typeof post.taken_at === "number" && Number.isFinite(post.taken_at)) {
    const raw = post.taken_at;
    if (raw <= 0) return NaN;
    // Seconds vs milliseconds heuristic: anything below 1e12 (~2001 in ms)
    // is interpreted as seconds. Real Instagram epochs are in 2010+ → in
    // seconds they're ~1.3e9; in ms they're ~1.3e12.
    return raw < 1e12 ? raw * 1000 : raw;
  }
  return NaN;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function median(sorted: number[]): number {
  const n = sorted.length;
  if (n === 0) return NaN;
  const mid = Math.floor(n / 2);
  return n % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Defensive outlier filter for posts whose `is_pinned` flag is absent but
 * whose date sits far in the past relative to the recent cluster. Operates
 * on the post timestamp list AFTER pinned/invalid removal.
 *
 * Strategy: take the median of the top-10 most recent timestamps and drop
 * any post older than `median - OUTLIER_OFFSET_DAYS`. Returns the kept
 * timestamps (still desc-sorted) plus the count excluded.
 */
function dropDateOutliers(
  sortedDesc: number[],
): { kept: number[]; excluded: number } {
  if (sortedDesc.length < 3) return { kept: sortedDesc, excluded: 0 };
  const recentCluster = sortedDesc.slice(0, Math.min(10, sortedDesc.length));
  const med = median([...recentCluster].sort((a, b) => a - b));
  if (!Number.isFinite(med)) return { kept: sortedDesc, excluded: 0 };
  const cutoff = med - OUTLIER_OFFSET_DAYS * DAY_MS;
  const kept = sortedDesc.filter((ts) => ts >= cutoff);
  return { kept, excluded: sortedDesc.length - kept.length };
}

function deriveReliability(
  method: CadenceMethod,
  sampleSize: number,
  warnings: CadenceWarning[],
): CadenceReliability {
  if (method === "insufficient") return "low";
  if (method === "sample_span") return "low";
  if (warnings.length >= 2) return "low";
  if (method === "window_30d" && sampleSize >= 5 && warnings.length === 0) {
    return "high";
  }
  return "medium";
}

export function computeCadence(
  posts: readonly CadenceInputPost[] | null | undefined,
  opts: { now?: number } = {},
): CadenceResult {
  const now = opts.now ?? Date.now();

  const all = posts ?? [];
  // Pinned posts are NOT excluded: `is_pinned` is an analytical attribute,
  // not a temporal one. Temporal analysis filters strictly by timestamp
  // (see `dropDateOutliers`), which already removes stale pinned posts.
  const pinnedCount = all.filter((p) => p && p.is_pinned === true).length;
  const validRaw = all
    .map((p) => normalizePostTimestamp(p))
    .filter((ts) => Number.isFinite(ts) && ts <= now)
    .sort((a, b) => b - a);

  const { kept: validTs, excluded: excludedOutliers } =
    dropDateOutliers(validRaw);
  const valid = validTs.map((ts) => ({ ts }));

  const warnings: CadenceWarning[] = [];
  if (excludedOutliers > 0) warnings.push("date_outlier_detected");

  if (valid.length === 0) {
    return {
      method: "insufficient",
      weekly: 0,
      sampleSize: 0,
      windowDays: 0,
      sufficient: false,
      notePt: INSUFFICIENT_PT,
      noteEn: INSUFFICIENT_EN,
      reliability: "low",
      warnings,
      excludedPinned: 0,
      excludedOutliers,
    };
  }

  // Stale data warning: most recent post older than STALE_LAST_POST_DAYS.
  const daysSinceLast = (now - valid[0].ts) / DAY_MS;
  if (daysSinceLast > STALE_LAST_POST_DAYS) warnings.push("stale_data");

  const cutoff30 = now - 30 * DAY_MS;
  const cutoff90 = now - 90 * DAY_MS;
  const count30 = valid.filter((p) => p.ts >= cutoff30).length;
  const count90 = valid.filter((p) => p.ts >= cutoff90).length;

  if (count30 >= 3) {
    const w: CadenceWarning[] = [...warnings];
    if (count30 < 5) w.push("low_sample");
    return {
      method: "window_30d",
      weekly: round1(count30 / WEEKS_PER_30D),
      sampleSize: count30,
      windowDays: 30,
      sufficient: true,
      notePt: null,
      noteEn: null,
      reliability: deriveReliability("window_30d", count30, w),
      warnings: w,
      excludedPinned: 0,
      excludedOutliers,
    };
  }

  if (count90 >= 3) {
    return {
      method: "window_90d",
      weekly: round1(count90 / WEEKS_PER_90D),
      sampleSize: count90,
      windowDays: 90,
      sufficient: true,
      notePt: null,
      noteEn: null,
      reliability: deriveReliability("window_90d", count90, warnings),
      warnings,
      excludedPinned: 0,
      excludedOutliers,
    };
  }

  if (valid.length >= 2) {
    const newest = valid[0].ts;
    const oldest = valid[valid.length - 1].ts;
    const spanDays = Math.max(1, Math.round((newest - oldest) / DAY_MS) + 1);
    if (spanDays <= MAX_SAMPLE_SPAN_DAYS) {
      const weeks = Math.max(1 / 7, spanDays / 7);
      const w: CadenceWarning[] = [...warnings, "low_sample"];
      return {
        method: "sample_span",
        weekly: round1(valid.length / weeks),
        sampleSize: valid.length,
        windowDays: spanDays,
        sufficient: true,
        notePt: null,
        noteEn: null,
        reliability: deriveReliability("sample_span", valid.length, w),
        warnings: w,
        excludedPinned: 0,
        excludedOutliers,
      };
    }
  }

  return {
    method: "insufficient",
    weekly: 0,
    sampleSize: valid.length,
    windowDays: 0,
    sufficient: false,
    notePt: INSUFFICIENT_PT,
    noteEn: INSUFFICIENT_EN,
    reliability: "low",
    warnings,
    excludedPinned: pinnedCount,
    excludedOutliers,
  };
}

export const CADENCE_NOTE_PT = INSUFFICIENT_PT;
export const CADENCE_NOTE_EN = INSUFFICIENT_EN;