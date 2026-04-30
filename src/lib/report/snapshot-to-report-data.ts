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
import type {
  AiInsightV2Item,
  AiInsightV2Section,
} from "@/lib/insights/types";
import { AI_INSIGHT_V2_SECTIONS } from "@/lib/insights/types";

import { resolveReportTier } from "./tiers";
import {
  extractTopHashtags,
  extractTopKeywords,
  type PostForText,
} from "./text-extract";
import {
  buildEditorialPatterns,
  type EditorialPatterns,
} from "./editorial-patterns";

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
  /** Lista de URLs externas declaradas no perfil Instagram (campo `external_urls`). */
  external_urls?: string[] | null;
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
  // Optional richer signals (R4-A). Always defensive in the adapter.
  video_duration?: number | null;
  product_type?: string | null;
  is_pinned?: boolean | null;
  coauthors?: string[] | null;
  tagged_users?: string[] | null;
  caption_length?: number | null;
  location_name?: string | null;
  music_title?: string | null;
}

export interface SnapshotPayload {
  profile?: SnapshotProfile | null;
  content_summary?: SnapshotContentSummary | null;
  format_stats?: Record<string, SnapshotFormatStat> | null;
  posts?: SnapshotPost[] | null;
  competitors?: unknown[] | null;
  /**
   * Optional AI insights block written by the analyze route when the OpenAI
   * insights flow is allowed for this handle. Loose typing on purpose —
   * the adapter validates each item before mapping it into ReportData.
   */
  ai_insights_v1?: {
    schema_version?: number | null;
    generated_at?: string | null;
    model?: string | null;
    source_signals?: {
      inputs_hash?: string | null;
      has_market_signals?: boolean | null;
      has_dataforseo_paid?: boolean | null;
    } | null;
    insights?: Array<{
      id?: string | null;
      title?: string | null;
      body?: string | null;
      evidence?: string[] | null;
      confidence?: string | null;
      priority?: number | null;
    }> | null;
  } | null;
  /**
   * Persisted market-signals envelopes (cache layer). Loose-typed on
   * purpose so this module stays free of dataforseo/cache imports —
   * the consumer (`ReportMarketSignals`) validates the shape with a
   * narrow type-guard before reading.
   */
  market_signals_free?: unknown;
  market_signals_paid?: unknown;
  /**
   * Insights v2 inline por secção (R3). Loose-typed; o adapter valida
   * cada secção antes de expor em `ReportEnriched.aiInsightsV2`.
   */
  ai_insights_v2?: {
    schema_version?: number | null;
    generated_at?: string | null;
    model?: string | null;
    sections?: Partial<
      Record<
        string,
        { emphasis?: string | null; text?: string | null } | null
      >
    > | null;
  } | null;
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
  /**
   * Marks the resulting report as an admin preview. Drives slightly different
   * editorial copy in empty-state sections (e.g. "snapshot" vs "perfil").
   * Defaults to `true` to preserve historical behaviour for the admin route;
   * the public `/analyze` flow passes `false` so the layout stays neutral.
   */
  isAdminPreview?: boolean;
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
  enriched: ReportEnriched;
}

/**
 * Bloco enriquecido com dados já presentes no snapshot que não cabem no
 * contrato locked `ReportData`. Consumido por componentes companion em
 * `/analyze/$username` (nunca em `/report/example`).
 */
export interface ReportEnriched {
  profile: {
    bio: string | null;
    avatarUrl: string | null;
    profileUrl: string;
    /**
     * URLs externas reais que o Instagram expõe no perfil — distintas do texto
     * da bio. Usadas pelo Bloco 02 (Q07 · Integração) para detetar "link na
     * bio" mesmo quando a bio não inclui o URL como texto.
     */
    externalUrls: string[];
  };
  topPosts: Array<{
    id: string;
    permalink: string | null;
    shortcode: string | null;
    caption: string;
    format: "Reel" | "Carousel" | "Imagem";
    likes: number;
    comments: number;
    engagementPct: number;
    date: string;
    mentions: string[];
  }>;
  mentionsSummary: Array<{ handle: string; count: number }>;
  benchmarkSource: {
    datasetVersion: string | null;
    note: string;
  };
  /**
   * Companion metadata for the AI insights section. Only populated when the
   * snapshot carries `ai_insights_v1`. Mirrors the items rendered by the
   * locked `ReportAiInsights` component, plus fields the locked component
   * cannot show today (`confidence`, `evidenceSummary`). Consumed by an
   * optional companion in `/analyze/$username`; never by `/report/example`.
   */
  aiInsights: {
    generatedAt: string | null;
    model: string | null;
    items: Array<{
      number: string;
      title: string;
      body: string;
      confidence: "baseado em dados observados" | "sinal parcial";
      evidenceSummary: string;
    }>;
  } | null;
  /**
   * Insights v2 inline por secção (R3.1). Quando presente, cada uma das
   * 9 chaves traz um item curto pronto a renderizar via `<AIInsightBox>`.
   * Null quando o snapshot não tem v2 persistida — nesse caso a UI faz
   * fallback para v1 (bloco "Leitura estratégica") ou esconde a caixa.
   */
  aiInsightsV2: {
    generatedAt: string | null;
    model: string | null;
    sections: Partial<Record<AiInsightV2Section, AiInsightV2Item>>;
  } | null;
  /**
   * Editorial crossovers (R4-B). Derived from posts + market signals to
   * explain WHY the profile performs the way it does. All fields are
   * defensive — each pattern carries its own `available` flag and reason
   * so the UI can render empty states gracefully on legacy snapshots.
   */
  editorialPatterns: EditorialPatterns;
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
  return sorted.slice(0, 5).map((p, idx) => {
    // Real Instagram CDN URL when present in the snapshot. The card layout
    // (locked) keeps the gradient as a guaranteed fallback; the image, when
    // wired in, sits above it and falls back via `onError` on failure.
    // O Instagram CDN bloqueia pedidos cross-origin do browser, por isso
    // encaminhamos via proxy server-side (`/api/public/ig-thumb`). O proxy
    // faz o fetch com cabeçalhos credíveis e cache no edge.
    const rawThumb =
      typeof p.thumbnail_url === "string" && p.thumbnail_url.length > 0
        ? p.thumbnail_url
        : undefined;
    const thumbnailUrl = rawThumb
      ? `/api/public/ig-thumb?url=${encodeURIComponent(rawThumb)}`
      : undefined;
    // Permalink real para tornar o card clicável. Quando o snapshot só
    // traz o shortcode, derivamos o URL canónico do Instagram.
    const permalinkRaw =
      typeof p.permalink === "string" && p.permalink.trim().length > 0
        ? p.permalink.trim()
        : null;
    const shortcode =
      typeof p.shortcode === "string" && p.shortcode.trim().length > 0
        ? p.shortcode.trim()
        : null;
    const permalink =
      permalinkRaw ??
      (shortcode ? `https://www.instagram.com/p/${shortcode}/` : null);
    const base = {
      id: p.id ?? `post-${idx}`,
      date: formatPtDateShort(p.taken_at_iso ?? null),
      format: formatLabelForCard(p.format),
      thumbnail: THUMB_GRADIENTS[idx % THUMB_GRADIENTS.length],
      likes: num(p.likes, 0),
      comments: num(p.comments, 0),
      engagementPct: round2(num(p.engagement_pct, 0)),
      caption: (p.caption ?? "").slice(0, 200),
      permalink,
    };
    // Cast: `thumbnailUrl` will be added to the locked `ReportData` topPosts
    // type once the unlock for `report-mock-data.ts` is granted. Emitting it
    // already keeps the adapter ready and is ignored by the current layout.
    return (thumbnailUrl
      ? { ...base, thumbnailUrl }
      : base) as ReportData["topPosts"][number];
  });
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
 * Valida e mapeia o bloco `ai_insights_v2` persistido para a forma
 * tipada consumida por `ReportEnriched.aiInsightsV2`. Defensivo contra
 * snapshots antigos ou parciais — devolve `null` se não houver pelo
 * menos uma secção válida.
 */
const VALID_V2_EMPHASIS = new Set([
  "positive",
  "negative",
  "default",
  "neutral",
]);

function buildAiInsightsV2(
  raw: SnapshotPayload["ai_insights_v2"] | undefined | null,
): ReportEnriched["aiInsightsV2"] {
  if (!raw || typeof raw !== "object") return null;
  const sectionsRaw = raw.sections ?? null;
  if (!sectionsRaw || typeof sectionsRaw !== "object") return null;

  const out: Partial<Record<AiInsightV2Section, AiInsightV2Item>> = {};
  let count = 0;
  for (const key of AI_INSIGHT_V2_SECTIONS) {
    const item = sectionsRaw[key];
    if (!item || typeof item !== "object") continue;
    const text =
      typeof item.text === "string" ? item.text.trim() : "";
    if (!text) continue;
    const emphasis =
      typeof item.emphasis === "string" &&
      VALID_V2_EMPHASIS.has(item.emphasis)
        ? (item.emphasis as AiInsightV2Item["emphasis"])
        : "default";
    out[key] = { emphasis, text };
    count += 1;
  }
  if (count === 0) return null;
  return {
    generatedAt:
      typeof raw.generated_at === "string" ? raw.generated_at : null,
    model:
      typeof raw.model === "string" && raw.model.length > 0 ? raw.model : null,
    sections: out,
  };
}

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

  // ----------------------------------------------------------------------
  // AI insights — map persisted `ai_insights_v1` (when present) into the
  // locked `ReportData.aiInsights` shape `{ number, label, text }`. The
  // locked `ReportAiInsights` component already hides itself when the
  // array is empty, so a missing/invalid block keeps the section hidden
  // (no placeholder is ever shown).
  //
  // The locked shape cannot carry `confidence` or `evidence`, so those
  // fields are forwarded via the companion `ReportEnriched.aiInsights`
  // block for an optional non-locked render in `/analyze/$username`.
  // ----------------------------------------------------------------------
  const rawAi = payload.ai_insights_v1;
  const validConfidences = new Set([
    "baseado em dados observados",
    "sinal parcial",
  ]);
  const aiItems = Array.isArray(rawAi?.insights)
    ? rawAi!.insights!.filter(
        (i) =>
          i &&
          typeof i.title === "string" &&
          i.title.trim().length > 0 &&
          typeof i.body === "string" &&
          i.body.trim().length > 0,
      )
    : [];
  // Items already arrive sorted by priority desc from the validator; we
  // re-sort defensively in case an older snapshot was written before the
  // ordering guarantee landed.
  const aiItemsSorted = [...aiItems].sort(
    (a, b) => num(b?.priority, 0) - num(a?.priority, 0),
  );
  const aiInsights: ReportData["aiInsights"] = aiItemsSorted.map((i, idx) => ({
    number: String(idx + 1).padStart(2, "0"),
    label: i!.title!.trim(),
    text: i!.body!.trim(),
  }));
  const enrichedAiInsights: ReportEnriched["aiInsights"] =
    aiItemsSorted.length > 0
      ? {
          generatedAt:
            typeof rawAi?.generated_at === "string"
              ? rawAi!.generated_at
              : null,
          model:
            typeof rawAi?.model === "string" && rawAi!.model!.length > 0
              ? rawAi!.model
              : null,
          items: aiItemsSorted.map((i, idx) => {
            const confidence =
              typeof i?.confidence === "string" &&
              validConfidences.has(i.confidence)
                ? (i.confidence as "baseado em dados observados" | "sinal parcial")
                : "sinal parcial";
            const ev = Array.isArray(i?.evidence) ? i!.evidence! : [];
            return {
              number: String(idx + 1).padStart(2, "0"),
              title: i!.title!.trim(),
              body: i!.body!.trim(),
              confidence,
              evidenceSummary:
                ev.length > 0 ? ev.slice(0, 3).join(" · ") : "—",
            };
          }),
        }
      : null;

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

  // Benchmark coverage: real when both the engagement positioning and at
  // least one per-format reference are available; partial when only one of
  // the two sides exists; placeholder otherwise. Computed up front so we can
  // surface it through `meta.benchmarkStatus` for the report components.
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
  const benchmarkStatus: "real" | "partial" | "placeholder" =
    benchmarkCoverage === "real"
      ? "real"
      : benchmarkCoverage === "partial"
        ? "partial"
        : "placeholder";

  // ----------------------------------------------------------------------
  // Bloco enriquecido (companion sections — não toca em locked components)
  // ----------------------------------------------------------------------
  const enrichedProfileBio = (() => {
    const raw = payload.profile?.bio;
    if (typeof raw !== "string") return null;
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : null;
  })();
  const enrichedAvatarUrl = (() => {
    const raw = payload.profile?.avatar_url;
    if (typeof raw !== "string") return null;
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : null;
  })();
  const enrichedProfileUrl = `https://www.instagram.com/${profile.username}/`;

  // Top posts enriquecidos: preserva permalink/shortcode/mentions e mantém a
  // mesma ordenação por engagement do `topPosts` editorial.
  const enrichedTopPosts: ReportEnriched["topPosts"] = [...posts]
    .sort((a, b) => num(b.engagement_pct, 0) - num(a.engagement_pct, 0))
    .slice(0, 5)
    .map((p, idx) => {
      const shortcode =
        typeof p.shortcode === "string" && p.shortcode.trim().length > 0
          ? p.shortcode.trim()
          : null;
      const permalinkRaw =
        typeof p.permalink === "string" && p.permalink.trim().length > 0
          ? p.permalink.trim()
          : null;
      const permalink =
        permalinkRaw ??
        (shortcode ? `https://www.instagram.com/p/${shortcode}/` : null);
      const mentionsRaw = Array.isArray(p.mentions) ? p.mentions : [];
      const mentions = Array.from(
        new Set(
          mentionsRaw
            .map((m) =>
              typeof m === "string"
                ? m.trim().replace(/^@/, "").toLowerCase()
                : "",
            )
            .filter((m) => m.length > 0),
        ),
      ).slice(0, 5);
      return {
        id: p.id ?? `post-${idx}`,
        permalink,
        shortcode,
        caption: (p.caption ?? "").slice(0, 200),
        format: formatLabelForCard(p.format),
        likes: num(p.likes, 0),
        comments: num(p.comments, 0),
        engagementPct: round2(num(p.engagement_pct, 0)),
        date: formatPtDateShort(p.taken_at_iso ?? null),
        mentions,
      };
    });

  // Resumo global de mentions (todos os posts, top 8).
  const mentionsCounter = new Map<string, number>();
  for (const p of posts) {
    const list = Array.isArray(p.mentions) ? p.mentions : [];
    for (const raw of list) {
      if (typeof raw !== "string") continue;
      const handle = raw.trim().replace(/^@/, "").toLowerCase();
      if (!handle) continue;
      mentionsCounter.set(handle, (mentionsCounter.get(handle) ?? 0) + 1);
    }
  }
  const mentionsSummary: ReportEnriched["mentionsSummary"] = Array.from(
    mentionsCounter.entries(),
  )
    .map(([handle, count]) => ({ handle, count }))
    .sort((a, b) => b.count - a.count || a.handle.localeCompare(b.handle))
    .slice(0, 8);

  const enriched: ReportEnriched = {
    profile: {
      bio: enrichedProfileBio,
      avatarUrl: enrichedAvatarUrl,
      profileUrl: enrichedProfileUrl,
    },
    topPosts: enrichedTopPosts,
    mentionsSummary,
    benchmarkSource: {
      datasetVersion: input.benchmark?.datasetVersion ?? null,
      note: "Benchmark editorial baseado em referências públicas de mercado e dataset interno versionado. A leitura deve ser interpretada como referência comparativa, não como média estatística absoluta.",
    },
    aiInsights: enrichedAiInsights,
    aiInsightsV2: buildAiInsightsV2(payload.ai_insights_v2),
    editorialPatterns: buildEditorialPatterns(payload),
  };

  const data: ReportData = {
    meta: {
      windowLabel,
      windowShortLabel,
      kpiSubtitle,
      isAdminPreview: input.isAdminPreview ?? true,
      sampleCaption,
      temporalLabel,
      topPostsSubtitle,
      benchmarkStatus,
      benchmarkDatasetVersion: input.benchmark?.datasetVersion,
      viewsAvailable,
    },
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
    // Real-data reports do not synthesise a fake 15-day trend per KPI.
    // Empty arrays make <Sparkline> render nothing — the value + sub still
    // shows. The mock /report/example provides real arrays for the demo.
    heroSparklines: {
      engagementRate: [],
      postsAnalyzed: [],
      postingFrequencyWeekly: [],
      dominantFormatShare: [],
    },
  };

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
    aiInsights: aiInsights.length > 0 ? "real" : "empty",
    hasAiInsights: aiInsights.length > 0,
    postsAvailable: posts.length,
    windowDays,
  };

  return { data, coverage, enriched };
}
