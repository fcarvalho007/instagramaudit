/**
 * Editorial crossovers (R4-B).
 *
 * Derives explanatory patterns from the snapshot's posts + competitors +
 * market signals — turning raw Instagram metrics into knowledge that
 * answers WHY a profile performs the way it does, not just WHAT happened.
 *
 * Pure: no I/O, no provider calls. Defensive against missing R4-A fields
 * (snapshots written before R4-A → fields are absent → patterns either
 * fall back to runtime derivation, or report `available:false` with a
 * clear reason). Never throws on empty inputs.
 *
 * Minimum sample sizes:
 *   - engagement trend:        ≥ 4 posts
 *   - caption-length buckets:  ≥ 6 posts (so each bucket has a chance)
 *   - hashtag sweet spot:      ≥ 6 posts
 *   - mentions/collabs lift:   ≥ 2 posts with mentions AND ≥ 2 without
 *   - video duration pattern:  ≥ 3 reels with `video_duration`
 *   - market demand fit:       ≥ 1 keyword in market_signals_free
 */

import type { SnapshotPayload, SnapshotPost } from "./snapshot-to-report-data";

// ─────────────────────────────────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────────────────────────────────

export interface Availability {
  available: boolean;
  reason: string;
}

export interface EngagementTrend extends Availability {
  direction: "up" | "flat" | "down" | null;
  /** Slope of best-fit line over engagement_pct vs index (oldest=0). */
  slope: number | null;
  confidence: "alta" | "média" | "baixa" | null;
  sampleSize: number;
}

export interface CaptionLengthBuckets extends Availability {
  /** ER médio (%) por balde de comprimento de legenda. */
  buckets: Array<{
    label: "Curta (<80)" | "Média (80–250)" | "Longa (>250)";
    count: number;
    avgEngagementPct: number;
  }>;
  bestBucket: string | null;
}

export interface HashtagSweetSpot extends Availability {
  buckets: Array<{
    label: "0–4" | "5–10" | "11–20" | "21+";
    count: number;
    avgEngagementPct: number;
  }>;
  bestBucket: string | null;
}

export interface MentionsCollabsLift extends Availability {
  /** ER médio em posts COM menções/colabs. */
  withAvgEngagementPct: number | null;
  /** ER médio em posts SEM menções/colabs. */
  withoutAvgEngagementPct: number | null;
  /** lift = with / without (e.g. 1.42 = +42%). null se without ≤ 0. */
  lift: number | null;
  withCount: number;
  withoutCount: number;
}

export interface VideoDurationPattern extends Availability {
  /** Buckets em segundos. ER médio por intervalo de duração. */
  buckets: Array<{
    label: "0–15s" | "15–30s" | "30–60s" | "60s+";
    count: number;
    avgEngagementPct: number;
  }>;
  bestBucket: string | null;
}

export interface MarketDemandContentFit extends Availability {
  /** Total de keywords retornadas pelos market signals. */
  marketKeywordsTotal: number;
  /** Quantas dessas keywords aparecem em legendas/hashtags. */
  matchedKeywords: number;
  /** matched/total (0..1). null se total = 0. */
  coverage: number | null;
  /** Top keywords de mercado AUSENTES no conteúdo (≤ 5). */
  missingTop: string[];
}

export interface EditorialPatterns {
  engagementTrend: EngagementTrend;
  captionLengthBuckets: CaptionLengthBuckets;
  hashtagSweetSpot: HashtagSweetSpot;
  mentionsCollabsLift: MentionsCollabsLift;
  videoDurationPattern: VideoDurationPattern;
  marketDemandContentFit: MarketDemandContentFit;
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers (pure)
// ─────────────────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Number(n.toFixed(2));
}

/** Caption length resilient to legacy snapshots (no caption_length field). */
function captionLen(p: SnapshotPost): number {
  if (typeof p.caption_length === "number" && Number.isFinite(p.caption_length)) {
    return p.caption_length;
  }
  return (p.caption ?? "").length;
}

/** Average of finite engagement_pct values; 0 when empty. */
function avgEngagement(items: SnapshotPost[]): number {
  const xs = items
    .map((p) => (typeof p.engagement_pct === "number" ? p.engagement_pct : 0))
    .filter((n) => Number.isFinite(n));
  if (xs.length === 0) return 0;
  const sum = xs.reduce((a, b) => a + b, 0);
  return round2(sum / xs.length);
}

/** Best-fit slope of y over x=index. Null when n<2 or all-flat. */
function linearSlope(ys: number[]): number | null {
  const n = ys.length;
  if (n < 2) return null;
  const xs = ys.map((_, i) => i);
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (ys[i] - meanY);
    den += (xs[i] - meanX) ** 2;
  }
  if (den === 0) return 0;
  return num / den;
}

function bestBucketLabel<T extends { count: number; avgEngagementPct: number; label: string }>(
  buckets: T[],
): string | null {
  const eligible = buckets.filter((b) => b.count > 0);
  if (eligible.length === 0) return null;
  return eligible.reduce((best, b) =>
    b.avgEngagementPct > best.avgEngagementPct ? b : best,
  ).label;
}

// ─────────────────────────────────────────────────────────────────────────
// Pattern derivations
// ─────────────────────────────────────────────────────────────────────────

function deriveEngagementTrend(posts: SnapshotPost[]): EngagementTrend {
  if (posts.length < 4) {
    return {
      available: false,
      reason: "Amostra insuficiente (mínimo 4 publicações).",
      direction: null,
      slope: null,
      confidence: null,
      sampleSize: posts.length,
    };
  }
  // Order chronologically (oldest → newest) by taken_at when available.
  const ordered = [...posts]
    .filter((p) => p.taken_at != null)
    .sort((a, b) => (a.taken_at ?? 0) - (b.taken_at ?? 0));
  if (ordered.length < 4) {
    return {
      available: false,
      reason: "Datas em falta para calcular tendência.",
      direction: null,
      slope: null,
      confidence: null,
      sampleSize: ordered.length,
    };
  }
  const ys = ordered.map((p) => (typeof p.engagement_pct === "number" ? p.engagement_pct : 0));
  const slope = linearSlope(ys);
  if (slope === null) {
    return {
      available: false,
      reason: "Variação nula entre publicações.",
      direction: null,
      slope: null,
      confidence: null,
      sampleSize: ordered.length,
    };
  }
  // Direction threshold tuned to ER (%) scale: |slope| > 0.05 considered movement.
  const direction: EngagementTrend["direction"] =
    slope > 0.05 ? "up" : slope < -0.05 ? "down" : "flat";
  const confidence: EngagementTrend["confidence"] =
    ordered.length >= 10 ? "alta" : ordered.length >= 6 ? "média" : "baixa";
  return {
    available: true,
    reason: "ok",
    direction,
    slope: round2(slope),
    confidence,
    sampleSize: ordered.length,
  };
}

function deriveCaptionLengthBuckets(posts: SnapshotPost[]): CaptionLengthBuckets {
  if (posts.length < 6) {
    return {
      available: false,
      reason: "Mínimo 6 publicações para cruzar legenda × engagement.",
      buckets: [],
      bestBucket: null,
    };
  }
  const short: SnapshotPost[] = [];
  const mid: SnapshotPost[] = [];
  const long: SnapshotPost[] = [];
  for (const p of posts) {
    const n = captionLen(p);
    if (n < 80) short.push(p);
    else if (n <= 250) mid.push(p);
    else long.push(p);
  }
  const buckets: CaptionLengthBuckets["buckets"] = [
    { label: "Curta (<80)", count: short.length, avgEngagementPct: avgEngagement(short) },
    { label: "Média (80–250)", count: mid.length, avgEngagementPct: avgEngagement(mid) },
    { label: "Longa (>250)", count: long.length, avgEngagementPct: avgEngagement(long) },
  ];
  return {
    available: true,
    reason: "ok",
    buckets,
    bestBucket: bestBucketLabel(buckets),
  };
}

function deriveHashtagSweetSpot(posts: SnapshotPost[]): HashtagSweetSpot {
  if (posts.length < 6) {
    return {
      available: false,
      reason: "Mínimo 6 publicações para cruzar hashtags × engagement.",
      buckets: [],
      bestBucket: null,
    };
  }
  const b0_4: SnapshotPost[] = [];
  const b5_10: SnapshotPost[] = [];
  const b11_20: SnapshotPost[] = [];
  const b21: SnapshotPost[] = [];
  for (const p of posts) {
    const n = (p.hashtags ?? []).length;
    if (n <= 4) b0_4.push(p);
    else if (n <= 10) b5_10.push(p);
    else if (n <= 20) b11_20.push(p);
    else b21.push(p);
  }
  const buckets: HashtagSweetSpot["buckets"] = [
    { label: "0–4", count: b0_4.length, avgEngagementPct: avgEngagement(b0_4) },
    { label: "5–10", count: b5_10.length, avgEngagementPct: avgEngagement(b5_10) },
    { label: "11–20", count: b11_20.length, avgEngagementPct: avgEngagement(b11_20) },
    { label: "21+", count: b21.length, avgEngagementPct: avgEngagement(b21) },
  ];
  return {
    available: true,
    reason: "ok",
    buckets,
    bestBucket: bestBucketLabel(buckets),
  };
}

function deriveMentionsCollabsLift(posts: SnapshotPost[]): MentionsCollabsLift {
  const withMention: SnapshotPost[] = [];
  const withoutMention: SnapshotPost[] = [];
  for (const p of posts) {
    const hasMention = (p.mentions ?? []).length > 0;
    const hasCoauthor = (p.coauthors ?? []).length > 0;
    if (hasMention || hasCoauthor) withMention.push(p);
    else withoutMention.push(p);
  }
  if (withMention.length < 2 || withoutMention.length < 2) {
    return {
      available: false,
      reason: "Necessárias ≥ 2 publicações com e sem menções/colaborações.",
      withAvgEngagementPct: null,
      withoutAvgEngagementPct: null,
      lift: null,
      withCount: withMention.length,
      withoutCount: withoutMention.length,
    };
  }
  const withAvg = avgEngagement(withMention);
  const withoutAvg = avgEngagement(withoutMention);
  const lift = withoutAvg > 0 ? round2(withAvg / withoutAvg) : null;
  return {
    available: true,
    reason: "ok",
    withAvgEngagementPct: withAvg,
    withoutAvgEngagementPct: withoutAvg,
    lift,
    withCount: withMention.length,
    withoutCount: withoutMention.length,
  };
}

function deriveVideoDurationPattern(posts: SnapshotPost[]): VideoDurationPattern {
  const reels = posts.filter(
    (p) =>
      (p.format ?? "").toLowerCase().startsWith("reel") &&
      typeof p.video_duration === "number" &&
      Number.isFinite(p.video_duration),
  );
  if (reels.length < 3) {
    return {
      available: false,
      reason:
        reels.length === 0
          ? "Sem dados de duração de vídeo (snapshot anterior ao R4-A)."
          : "Mínimo 3 Reels com duração para identificar padrão.",
      buckets: [],
      bestBucket: null,
    };
  }
  const b15: SnapshotPost[] = [];
  const b30: SnapshotPost[] = [];
  const b60: SnapshotPost[] = [];
  const bLong: SnapshotPost[] = [];
  for (const p of reels) {
    const d = p.video_duration as number;
    if (d <= 15) b15.push(p);
    else if (d <= 30) b30.push(p);
    else if (d <= 60) b60.push(p);
    else bLong.push(p);
  }
  const buckets: VideoDurationPattern["buckets"] = [
    { label: "0–15s", count: b15.length, avgEngagementPct: avgEngagement(b15) },
    { label: "15–30s", count: b30.length, avgEngagementPct: avgEngagement(b30) },
    { label: "30–60s", count: b60.length, avgEngagementPct: avgEngagement(b60) },
    { label: "60s+", count: bLong.length, avgEngagementPct: avgEngagement(bLong) },
  ];
  return {
    available: true,
    reason: "ok",
    buckets,
    bestBucket: bestBucketLabel(buckets),
  };
}

/** Extract market keywords from the cached `market_signals_free` envelope. */
function extractMarketKeywords(payload: SnapshotPayload): string[] {
  const ms = payload.market_signals_free as
    | { summary?: { top_keywords?: Array<{ keyword?: string }> | null } | null }
    | null
    | undefined;
  const list = ms?.summary?.top_keywords;
  if (!Array.isArray(list)) return [];
  return list
    .map((k) => (typeof k?.keyword === "string" ? k.keyword.toLowerCase().trim() : ""))
    .filter((s) => s.length > 0);
}

function deriveMarketDemandContentFit(
  posts: SnapshotPost[],
  payload: SnapshotPayload,
): MarketDemandContentFit {
  const marketKeywords = extractMarketKeywords(payload);
  if (marketKeywords.length === 0) {
    return {
      available: false,
      reason: "Sem sinais de procura de mercado para cruzar.",
      marketKeywordsTotal: 0,
      matchedKeywords: 0,
      coverage: null,
      missingTop: [],
    };
  }
  // Build a single lowercase haystack from all captions + hashtags.
  const haystack = posts
    .flatMap((p) => [
      (p.caption ?? "").toLowerCase(),
      ...((p.hashtags ?? []).map((h) => h.toLowerCase())),
    ])
    .join(" \n ");
  const matched: string[] = [];
  const missing: string[] = [];
  for (const kw of marketKeywords) {
    if (haystack.includes(kw)) matched.push(kw);
    else missing.push(kw);
  }
  return {
    available: true,
    reason: "ok",
    marketKeywordsTotal: marketKeywords.length,
    matchedKeywords: matched.length,
    coverage:
      marketKeywords.length > 0
        ? round2(matched.length / marketKeywords.length)
        : null,
    missingTop: missing.slice(0, 5),
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Public entrypoint
// ─────────────────────────────────────────────────────────────────────────

export function buildEditorialPatterns(
  payload: SnapshotPayload,
): EditorialPatterns {
  const posts = Array.isArray(payload.posts) ? payload.posts : [];
  return {
    engagementTrend: deriveEngagementTrend(posts),
    captionLengthBuckets: deriveCaptionLengthBuckets(posts),
    hashtagSweetSpot: deriveHashtagSweetSpot(posts),
    mentionsCollabsLift: deriveMentionsCollabsLift(posts),
    videoDurationPattern: deriveVideoDurationPattern(posts),
    marketDemandContentFit: deriveMarketDemandContentFit(posts, payload),
  };
}