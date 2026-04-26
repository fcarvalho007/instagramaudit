/**
 * snapshotToReportData — pure adapter from a real Apify snapshot to the
 * ReportData contract consumed by the editorial report layout.
 *
 * Pure: no DB, no Apify, no AI, no Date.now (only reads timestamps from the
 * snapshot row). The only side-effect-free dependency is `extractTopHashtags`
 * / `extractTopKeywords` from `text-extract.ts`.
 *
 * The adapter intentionally returns the SAME shape as `reportData` so the
 * existing report layout can render real data with zero changes to the
 * locked report components. Fields that we cannot derive from the current
 * snapshot (per-format benchmark, AI insights, competitor avatars) are
 * filled with safe placeholders and reported via the `coverage` block.
 */

import type { ReportData } from "@/components/report/report-mock-data";
import type { BenchmarkPositioning } from "@/lib/benchmark/types";

import { resolveReportTier } from "./tiers";
import {
  extractTopHashtags,
  extractTopKeywords,
  type PostForText,
} from "./text-extract";

// ============================================================================
// Snapshot input typing — kept loose because `normalized_payload` is `Json`.
// We accept partial shapes and defend every access; the adapter must never
// throw on missing fields.
// ============================================================================

export interface SnapshotProfile {
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  is_verified?: boolean | null;
  followers_count?: number | null;
  following_count?: number | null;
  posts_count?: number | null;
}

export interface SnapshotContentSummary {
  posts_analyzed?: number | null;
  dominant_format?: string | null;
  average_likes?: number | null;
  average_comments?: number | null;
  average_engagement_rate?: number | null;
  estimated_posts_per_week?: number | null;
}

export interface SnapshotFormatStat {
  count?: number | null;
  share_pct?: number | null;
  avg_engagement_pct?: number | null;
}

export interface SnapshotPost {
  id?: string | null;
  shortcode?: string | null;
  permalink?: string | null;
  format?: string | null;
  caption?: string | null;
  hashtags?: string[] | null;
  mentions?: string[] | null;
  taken_at?: number | null;
  taken_at_iso?: string | null;
  weekday?: number | null; // 0=Sunday … 6=Saturday (UTC)
  hour_local?: number | null; // 0..23 (UTC)
  likes?: number | null;
  comments?: number | null;
  video_views?: number | null;
  thumbnail_url?: string | null;
  is_video?: boolean | null;
  engagement_pct?: number | null;
}

export interface SnapshotPayload {
  profile?: SnapshotProfile | null;
  content_summary?: SnapshotContentSummary | null;
  format_stats?: Record<string, SnapshotFormatStat> | null;
  posts?: SnapshotPost[] | null;
  competitors?: unknown[] | null;
}

export interface SnapshotMetadata {
  /** ISO timestamp from `analysis_snapshots.created_at` (or updated_at). */
  generated_at?: string | null;
  /** Used when the payload is missing username (rare). */
  instagram_username?: string | null;
}

export interface SnapshotInput {
  payload: SnapshotPayload;
  meta?: SnapshotMetadata;
  /**
   * Optional benchmark input resolved server-side from
   * `benchmark_references` (with in-code fallback). When provided the adapter
   * fills `keyMetrics.engagementBenchmark/Delta` and per-format benchmarks
   * with real numbers; when omitted the adapter keeps placeholder zeroes and
   * marks coverage accordingly.
   */
  benchmark?: ReportBenchmarkInput;
}

/**
 * Pure DTO consumed by the adapter. The shape is intentionally JSON-friendly
 * so it can travel over the network from server endpoints to client previews.
 */
export interface ReportBenchmarkInput {
  positioning: BenchmarkPositioning;
  perFormatReference: {
    Reels: number | null;
    Carousels: number | null;
    Imagens: number | null;
  };
  tierLabel: string;
  datasetVersion: string;
}

// ============================================================================
// Coverage block — communicates exactly which sections are real vs derived
// vs placeholder. Surfaces in the admin preview UI ("known limitations").
// ============================================================================

export type CoverageState = "real" | "partial" | "placeholder" | "empty";

export interface ReportCoverage {
  profile: CoverageState;
  keyMetrics: CoverageState;
  temporalSeries: CoverageState;
  benchmark: CoverageState;
  formatBreakdown: CoverageState;
  competitors: CoverageState;
  topPosts: CoverageState;
  postingHeatmap: CoverageState;
  bestDays: CoverageState;
  topHashtags: CoverageState;
  topKeywords: CoverageState;
  aiInsights: CoverageState;
  /** Convenience flag — true only when AI insights are real. */
  hasAiInsights: boolean;
  /** Number of posts the adapter actually had to work with. */
  postsAvailable: number;
  /** Span (days) covered by `posts[]`, ceil(newest-oldest in days). */
  windowDays: number;
}

export interface AdapterResult {
  data: ReportData;
  coverage: ReportCoverage;
}

// ============================================================================
// Helpers (pure)
// ============================================================================

const PT_MONTHS_SHORT = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

function num(v: unknown, fallback = 0): number {
  if (typeof v !== "number" || !Number.isFinite(v)) return fallback;
  return v;
}

function round2(v: number): number {
  return Number(v.toFixed(2));
}

function round1(v: number): number {
  return Number(v.toFixed(1));
}

/** Format an ISO date as "DD MmmYYYY" in pt-PT, or "—" when invalid. */
function formatPtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = PT_MONTHS_SHORT[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  return `${day} ${month} ${year}`;
}

/** Format an ISO date as "DD Mmm" (used inside top-posts cards). */
function formatPtDateShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = PT_MONTHS_SHORT[d.getUTCMonth()];
  return `${day} ${month}`;
}

/** Map the snapshot's pt-PT format label to the editorial label set. */
function normaliseFormatLabel(
  raw: string | null | undefined,
): "Reels" | "Carousels" | "Imagens" {
  const s = (raw ?? "").toLowerCase();
  if (s.startsWith("reel")) return "Reels";
  if (s.startsWith("carro") || s.startsWith("carou")) return "Carousels";
  return "Imagens";
}

/** Editorial single-post format label used in top-posts cards. */
function formatLabelForCard(
  raw: string | null | undefined,
): "Reel" | "Carousel" | "Imagem" {
  const s = (raw ?? "").toLowerCase();
  if (s.startsWith("reel")) return "Reel";
  if (s.startsWith("carro") || s.startsWith("carou")) return "Carousel";
  return "Imagem";
}

/** Convert UTC weekday (0=Sun..6=Sat) to ISO weekday (1=Mon..7=Sun). */
function utcWeekdayToIso(day: number): number {
  // 0=Sun → 7, 1=Mon → 1, ..., 6=Sat → 6
  return day === 0 ? 7 : day;
}

const PT_DAY_SHORT = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const PT_DAY_FULL = [
  "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo",
];

// Deterministic gradient palette used for top-posts thumbnails when we don't
// have a real image URL. Index by post position so the same post always maps
// to the same gradient.
const THUMB_GRADIENTS = [
  "from-cyan-300 via-blue-400 to-indigo-500",
  "from-violet-300 via-fuchsia-400 to-rose-500",
  "from-amber-300 via-orange-400 to-red-500",
  "from-emerald-300 via-teal-400 to-cyan-500",
  "from-slate-300 via-indigo-400 to-violet-500",
];

const AVATAR_GRADIENT = "from-indigo-400 via-blue-400 to-cyan-400";

// ============================================================================
// Section builders
// ============================================================================

function buildProfileSection(
  payload: SnapshotPayload,
  meta: SnapshotMetadata | undefined,
  postsAvailable: number,
): ReportData["profile"] {
  const p = payload.profile ?? {};
  const followers = num(p.followers_count, 0);
  const { tier, tierRange } = resolveReportTier(followers);
  const username =
    p.username ?? meta?.instagram_username ?? "unknown";
  const fullName = p.display_name ?? username;
  const verified = Boolean(p.is_verified);

  return {
    username,
    fullName,
    avatarGradient: AVATAR_GRADIENT,
    followers,
    following: num(p.following_count, 0),
    postsCount: num(p.posts_count, 0),
    tier,
    tierRange,
    verified,
    analyzedAt: formatPtDate(meta?.generated_at ?? null),
    windowDays: 30, // placeholder; overridden after window is computed
    postsAnalyzed: num(payload.content_summary?.posts_analyzed, postsAvailable),
  };
}

function buildKeyMetrics(
  payload: SnapshotPayload,
  benchmark: ReportBenchmarkInput | undefined,
): ReportData["keyMetrics"] {
  const cs = payload.content_summary ?? {};
  const dominantRaw = cs.dominant_format ?? "Carrosséis";
  const fmt = normaliseFormatLabel(dominantRaw);
  // share_pct lives keyed by the raw snapshot label; try both.
  const stats = payload.format_stats ?? {};
  const sharePct = (() => {
    const direct = stats[String(dominantRaw)]?.share_pct;
    if (typeof direct === "number") return Math.round(direct);
    // Fallback by canonical key.
    for (const [k, v] of Object.entries(stats)) {
      if (normaliseFormatLabel(k) === fmt && typeof v?.share_pct === "number") {
        return Math.round(v.share_pct);
      }
    }
    return 0;
  })();

  const positioning = benchmark?.positioning;
  const engagementBenchmark =
    positioning && positioning.status === "available"
      ? round2(positioning.benchmarkValue)
      : 0;
  const engagementDeltaPct =
    positioning && positioning.status === "available"
      ? round1(positioning.differencePercent)
      : 0;

  return {
    engagementRate: round2(num(cs.average_engagement_rate, 0)),
    engagementBenchmark,
    engagementDeltaPct,
    postsAnalyzed: num(cs.posts_analyzed, 0),
    postingFrequencyWeekly: round1(num(cs.estimated_posts_per_week, 0)),
    dominantFormat: fmt,
    dominantFormatShare: sharePct,
  };
}

function buildFormatBreakdown(
  payload: SnapshotPayload,
  benchmark: ReportBenchmarkInput | undefined,
): ReportData["formatBreakdown"] {
  // The mock infers a discriminated union per element; we widen here.
  type Item = ReportData["formatBreakdown"][number];
  const stats = payload.format_stats ?? {};
  const TINTS = {
    Reels: "primary" as const,
    Carousels: "success" as const,
    Imagens: "warning" as const,
  };
  // Map raw keys to canonical, picking the first occurrence per canonical.
  const canonical = new Map<
    "Reels" | "Carousels" | "Imagens",
    SnapshotFormatStat
  >();
  for (const [k, v] of Object.entries(stats)) {
    const c = normaliseFormatLabel(k);
    if (!canonical.has(c)) canonical.set(c, v);
  }
  const formats: Array<"Reels" | "Carousels" | "Imagens"> = [
    "Reels",
    "Carousels",
    "Imagens",
  ];
  return formats.map((format) => {
    const s = canonical.get(format) ?? {};
    const engagement = round2(num(s.avg_engagement_pct, 0));
    const refRaw = benchmark?.perFormatReference?.[format] ?? null;
    const benchValue =
      typeof refRaw === "number" && refRaw > 0 ? round2(refRaw) : 0;
    // Status mirrors the engine's ±10% rule. When no benchmark is known, we
    // fall back to "abaixo" (placeholder), matching the prior behaviour.
    let status: "abaixo" | "acima" | "ligeiramente-acima" = "abaixo";
    if (benchValue > 0 && engagement > 0) {
      const deltaPct = ((engagement - benchValue) / benchValue) * 100;
      if (deltaPct > 10) status = "acima";
      else if (deltaPct > 0) status = "ligeiramente-acima";
      else status = "abaixo";
    }
    const item = {
      format,
      sharePct: Math.round(num(s.share_pct, 0)),
      engagement,
      benchmark: benchValue,
      tint: TINTS[format],
      status,
    };
    return item as unknown as Item;
  });
}

function buildTopPosts(posts: SnapshotPost[]): ReportData["topPosts"] {
  const sorted = [...posts].sort(
    (a, b) => num(b.engagement_pct, 0) - num(a.engagement_pct, 0),
  );
  return sorted.slice(0, 5).map((p, idx) => ({
    id: p.id ?? `post-${idx}`,
    date: formatPtDateShort(p.taken_at_iso ?? null),
    format: formatLabelForCard(p.format),
    thumbnail: THUMB_GRADIENTS[idx % THUMB_GRADIENTS.length],
    likes: num(p.likes, 0),
    comments: num(p.comments, 0),
    engagementPct: round2(num(p.engagement_pct, 0)),
    caption: (p.caption ?? "").slice(0, 200),
  }));
}

function buildTemporalSeries(
  posts: SnapshotPost[],
): ReportData["temporalSeries"] {
  // Aggregate by ISO date (YYYY-MM-DD) over the actual covered window.
  const byDate = new Map<
    string,
    { likes: number; comments: number; views: number }
  >();
  let minTs = Infinity;
  let maxTs = -Infinity;

  for (const p of posts) {
    if (!p.taken_at_iso) continue;
    const d = new Date(p.taken_at_iso);
    if (Number.isNaN(d.getTime())) continue;
    minTs = Math.min(minTs, d.getTime());
    maxTs = Math.max(maxTs, d.getTime());
    const key = p.taken_at_iso.slice(0, 10);
    const cur = byDate.get(key) ?? { likes: 0, comments: 0, views: 0 };
    cur.likes += num(p.likes, 0);
    cur.comments += num(p.comments, 0);
    cur.views += num(p.video_views, 0);
    byDate.set(key, cur);
  }

  if (!Number.isFinite(minTs) || !Number.isFinite(maxTs)) return [];

  const startDay = new Date(minTs);
  startDay.setUTCHours(0, 0, 0, 0);
  const endDay = new Date(maxTs);
  endDay.setUTCHours(0, 0, 0, 0);

  const out: ReportData["temporalSeries"] = [];
  for (
    let t = startDay.getTime();
    t <= endDay.getTime();
    t += 86_400_000
  ) {
    const d = new Date(t);
    const iso = d.toISOString().slice(0, 10);
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const v = byDate.get(iso) ?? { likes: 0, comments: 0, views: 0 };
    out.push({
      date: `${dd}/${mm}`,
      isoDate: iso,
      likes: v.likes,
      comments: v.comments,
      views: v.views,
    });
  }
  return out;
}

function buildPostingHeatmap(
  posts: SnapshotPost[],
): ReportData["postingHeatmap"] {
  // 7 rows (Mon..Sun, ISO order to match `PT_DAY_SHORT`), 24 cols.
  const matrix: number[][] = Array.from({ length: 7 }, () =>
    Array.from({ length: 24 }, () => 0),
  );
  // Sum of engagement per cell, count for averaging.
  const engSum: number[][] = Array.from({ length: 7 }, () =>
    Array.from({ length: 24 }, () => 0),
  );
  const engCnt: number[][] = Array.from({ length: 7 }, () =>
    Array.from({ length: 24 }, () => 0),
  );

  for (const p of posts) {
    if (typeof p.weekday !== "number" || typeof p.hour_local !== "number") {
      continue;
    }
    const isoDay = utcWeekdayToIso(p.weekday); // 1..7
    const row = isoDay - 1; // 0..6 (Mon..Sun)
    const col = Math.max(0, Math.min(23, Math.floor(p.hour_local)));
    const eng = num(p.engagement_pct, 0);
    engSum[row][col] += eng;
    engCnt[row][col] += 1;
  }

  // Compute per-cell average engagement, normalised to [0,1].
  let maxAvg = 0;
  const avgMatrix: number[][] = engSum.map((row, r) =>
    row.map((sum, c) => {
      const avg = engCnt[r][c] > 0 ? sum / engCnt[r][c] : 0;
      if (avg > maxAvg) maxAvg = avg;
      return avg;
    }),
  );
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 24; c++) {
      matrix[r][c] = maxAvg > 0 ? Number((avgMatrix[r][c] / maxAvg).toFixed(2)) : 0;
    }
  }

  // bestSlots: top 3 cells by avg engagement, ties broken by earlier weekday.
  const cells: Array<{ r: number; c: number; eng: number }> = [];
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 24; c++) {
      if (engCnt[r][c] > 0) cells.push({ r, c, eng: avgMatrix[r][c] });
    }
  }
  cells.sort((a, b) => (b.eng - a.eng) || (a.r - b.r) || (a.c - b.c));
  const bestSlots = cells.slice(0, 3).map((cell) => ({
    day: PT_DAY_SHORT[cell.r],
    hour: `${String(cell.c).padStart(2, "0")}h`,
    engagement: round2(cell.eng),
  }));

  return {
    days: [...PT_DAY_SHORT],
    matrix,
    bestSlots,
  };
}

function buildBestDays(posts: SnapshotPost[]): ReportData["bestDays"] {
  // Average engagement per ISO weekday (Mon..Sun).
  const sums = Array.from({ length: 7 }, () => 0);
  const counts = Array.from({ length: 7 }, () => 0);
  for (const p of posts) {
    if (typeof p.weekday !== "number") continue;
    const isoDay = utcWeekdayToIso(p.weekday);
    const idx = isoDay - 1;
    sums[idx] += num(p.engagement_pct, 0);
    counts[idx] += 1;
  }
  const avgs = sums.map((s, i) => (counts[i] > 0 ? s / counts[i] : 0));
  const leaderIdx = avgs.reduce(
    (acc, v, i) => (v > avgs[acc] ? i : acc),
    0,
  );
  const anyData = counts.some((c) => c > 0);
  return PT_DAY_SHORT.map((short, i) => ({
    day: short,
    fullDay: PT_DAY_FULL[i],
    avgEngagement: round2(avgs[i]),
    isLeader: anyData && i === leaderIdx,
  }));
}

// ============================================================================
// Adapter entry point
// ============================================================================

/**
 * Build a `{ data, coverage }` object from a snapshot payload.
 *
 * - `payload`: `analysis_snapshots.normalized_payload` parsed.
 * - `meta`: optional snapshot metadata (created_at, instagram_username).
 *
 * Pure: no I/O of any kind.
 */
export function snapshotToReportData(input: SnapshotInput): AdapterResult {
  const payload = input.payload ?? ({} as SnapshotPayload);
  const meta = input.meta;
  const posts: SnapshotPost[] = Array.isArray(payload.posts) ? payload.posts : [];

  const profile = buildProfileSection(payload, meta, posts.length);
  const keyMetrics = buildKeyMetrics(payload, input.benchmark);
  const formatBreakdown = buildFormatBreakdown(payload, input.benchmark);
  const topPosts = buildTopPosts(posts);
  const temporalSeries = buildTemporalSeries(posts);
  const postingHeatmap = buildPostingHeatmap(posts);
  const bestDays = buildBestDays(posts);

  const postsForText: PostForText[] = posts.map((p) => ({
    caption: p.caption,
    hashtags: p.hashtags,
    engagement_pct: p.engagement_pct,
  }));
  const topHashtags = extractTopHashtags(postsForText, 5);
  const topKeywords = extractTopKeywords(postsForText, 5);

  // Window in days = (newest - oldest) ceil to days, +1 to be inclusive.
  let windowDays = 0;
  let minTs = Infinity;
  let maxTs = -Infinity;
  for (const p of posts) {
    if (!p.taken_at_iso) continue;
    const t = new Date(p.taken_at_iso).getTime();
    if (!Number.isFinite(t)) continue;
    minTs = Math.min(minTs, t);
    maxTs = Math.max(maxTs, t);
  }
  if (Number.isFinite(minTs) && Number.isFinite(maxTs)) {
    windowDays = Math.max(
      1,
      Math.ceil((maxTs - minTs) / 86_400_000) + 1,
    );
  }
  const profileWithWindow = { ...profile, windowDays };

  // Competitors: only emit a row when the snapshot carries real competitor
  // data. Otherwise return an empty array so the section can show its empty
  // state (or be hidden in admin preview). We deliberately do NOT echo the
  // analysed profile alone — that would look like a degenerate competitor
  // chart.
  const rawCompetitors = Array.isArray(payload.competitors)
    ? payload.competitors
    : [];
  const competitors: ReportData["competitors"] =
    rawCompetitors.length > 0
      ? [
          {
            username: profile.username,
            label: "Perfil analisado",
            engagement: keyMetrics.engagementRate,
            followers: profile.followers,
            isOwn: true,
            avatarGradient: AVATAR_GRADIENT,
          },
        ]
      : [];

  // AI insights: not generated in this step. Keep an empty array; the
  // `hasAiInsights` flag drives any UI that needs to hide the section.
  const aiInsights: ReportData["aiInsights"] = [];

  // Editorial meta — overrides the mock defaults when the real sample is
  // smaller than 30 days, so the report stops promising "30 dias" when only
  // a 12-post sample is available. Strings are crafted to read naturally
  // wherever the layout interpolates them ("nos últimos N dias", etc.).
  const sampleSize = posts.length;
  const windowLabel =
    windowDays > 0 ? `últimos ${windowDays} dias` : "amostra recolhida";
  const windowShortLabel =
    windowDays > 0 ? `${windowDays} dias` : "amostra";
  const kpiSubtitle =
    windowDays > 0
      ? `amostra de ${sampleSize} publicações · ${windowDays} dias`
      : `amostra de ${sampleSize} publicações`;
  const sampleCaption = `Análise baseada nas últimas ${sampleSize} publicações recolhidas.`;
  const temporalLabel =
    windowDays > 0
      ? `Evolução temporal · janela de ${windowDays} dias`
      : `Evolução temporal · amostra de ${sampleSize} publicações`;
  const topPostsSubtitle =
    windowDays > 0
      ? `Ordenadas por envolvimento. Janela observada: ${windowDays} dias.`
      : `Ordenadas por envolvimento na amostra recolhida.`;

  // Views are only populated for Reels; if every post has 0 views, hide the
  // series in the temporal chart.
  const viewsAvailable = posts.some(
    (p) => typeof p.video_views === "number" && p.video_views > 0,
  );
    profile: profileWithWindow,
    keyMetrics,
    temporalSeries,
    formatBreakdown,
    competitors,
    topPosts,
    postingHeatmap,
    topHashtags,
    topKeywords,
    bestDays,
    aiInsights,
  };

  // Benchmark coverage: real when both the engagement positioning and at
  // least one per-format reference are available; partial when only one of
  // the two sides exists; placeholder otherwise.
  const positioningAvailable =
    input.benchmark?.positioning?.status === "available";
  const formatBenchmarksFilled = formatBreakdown.filter(
    (f) => f.benchmark > 0,
  ).length;
  let benchmarkCoverage: CoverageState = "placeholder";
  if (positioningAvailable && formatBenchmarksFilled === formatBreakdown.length) {
    benchmarkCoverage = "real";
  } else if (positioningAvailable || formatBenchmarksFilled > 0) {
    benchmarkCoverage = "partial";
  }

  const coverage: ReportCoverage = {
    profile: payload.profile ? "real" : "empty",
    keyMetrics: payload.content_summary ? "real" : "empty",
    temporalSeries: temporalSeries.length > 0 ? "partial" : "empty",
    benchmark: benchmarkCoverage,
    formatBreakdown: payload.format_stats ? "partial" : "empty",
    competitors: competitors.length > 0 ? "partial" : "empty",
    topPosts: topPosts.length > 0 ? "real" : "empty",
    postingHeatmap: posts.length > 0 ? "partial" : "empty",
    bestDays: posts.length > 0 ? "partial" : "empty",
    topHashtags: topHashtags.length > 0 ? "real" : "empty",
    topKeywords: topKeywords.length > 0 ? "real" : "empty",
    aiInsights: "empty",
    hasAiInsights: false,
    postsAvailable: posts.length,
    windowDays,
  };

  return { data, coverage };
}
