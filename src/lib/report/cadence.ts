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
 *   - excludes posts with is_pinned=true
 *   - excludes posts with invalid/missing/future timestamps
 *   - sorts desc by timestamp before counting
 *   - accepts taken_at_iso OR taken_at (seconds OR milliseconds, auto-detected)
 */

export type CadenceMethod =
  | "window_30d"
  | "window_90d"
  | "sample_span"
  | "insufficient";

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
}

const DAY_MS = 86_400_000;
const WEEKS_PER_30D = 30 / 7; // 4.2857…
const WEEKS_PER_90D = 90 / 7; // 12.857…
const MAX_SAMPLE_SPAN_DAYS = 180;

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

export function computeCadence(
  posts: readonly CadenceInputPost[] | null | undefined,
  opts: { now?: number } = {},
): CadenceResult {
  const now = opts.now ?? Date.now();

  const valid = (posts ?? [])
    .filter((p) => p && p.is_pinned !== true)
    .map((p) => ({ ts: normalizePostTimestamp(p) }))
    .filter(({ ts }) => Number.isFinite(ts) && ts <= now)
    .sort((a, b) => b.ts - a.ts);

  if (valid.length === 0) {
    return {
      method: "insufficient",
      weekly: 0,
      sampleSize: 0,
      windowDays: 0,
      sufficient: false,
      notePt: INSUFFICIENT_PT,
      noteEn: INSUFFICIENT_EN,
    };
  }

  const cutoff30 = now - 30 * DAY_MS;
  const cutoff90 = now - 90 * DAY_MS;
  const count30 = valid.filter((p) => p.ts >= cutoff30).length;
  const count90 = valid.filter((p) => p.ts >= cutoff90).length;

  if (count30 >= 3) {
    return {
      method: "window_30d",
      weekly: round1(count30 / WEEKS_PER_30D),
      sampleSize: count30,
      windowDays: 30,
      sufficient: true,
      notePt: null,
      noteEn: null,
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
    };
  }

  if (valid.length >= 2) {
    const newest = valid[0].ts;
    const oldest = valid[valid.length - 1].ts;
    const spanDays = Math.max(1, Math.round((newest - oldest) / DAY_MS) + 1);
    if (spanDays <= MAX_SAMPLE_SPAN_DAYS) {
      const weeks = Math.max(1 / 7, spanDays / 7);
      return {
        method: "sample_span",
        weekly: round1(valid.length / weeks),
        sampleSize: valid.length,
        windowDays: spanDays,
        sufficient: true,
        notePt: null,
        noteEn: null,
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
  };
}

export const CADENCE_NOTE_PT = INSUFFICIENT_PT;
export const CADENCE_NOTE_EN = INSUFFICIENT_EN;