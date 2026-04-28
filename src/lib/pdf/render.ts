/**
 * Server-side PDF rendering pipeline.
 *
 * `renderReportPdf` accepts a normalized analysis snapshot payload and
 * resolves it into a PDF byte buffer. Avatars are best-effort: a 3s fetch
 * with a graceful fallback to the initials placeholder rendered in the
 * document component.
 *
 * SERVER-ONLY — uses @react-pdf/renderer's Node entry which depends on
 * the nodejs_compat Worker shim. Never import from client code.
 */

import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";

import { computeBenchmarkPositioning } from "@/lib/benchmark/engine";
import { loadBenchmarkReferences } from "@/lib/benchmark/reference-data.server";
import type {
  CompetitorAnalysis,
  PublicAnalysisContentSummary,
  PublicAnalysisProfile,
} from "@/lib/analysis/types";

import {
  ReportDocument,
  type AiInsightForPdf,
  type TopPostForPdf,
} from "./report-document";
import {
  buildRecommendations,
  type RecommendationInput,
} from "./recommendations";

/**
 * Loose typing for raw posts coming from `analysis_snapshots.normalized_payload.posts[]`.
 * The snapshot writer guarantees richer fields, but the PDF only needs the
 * subset below and defends every access — never throws on missing data.
 */
interface SnapshotPostLoose {
  id?: string | null;
  shortcode?: string | null;
  permalink?: string | null;
  format?: string | null;
  caption?: string | null;
  taken_at_iso?: string | null;
  likes?: number | null;
  comments?: number | null;
  engagement_pct?: number | null;
  hashtags?: string[] | null;
}

interface NormalizedSnapshotPayload {
  profile: PublicAnalysisProfile;
  content_summary: PublicAnalysisContentSummary;
  competitors: CompetitorAnalysis[];
  /** Optional — present in real Apify snapshots, absent in legacy ones. */
  posts?: SnapshotPostLoose[] | null;
  /**
   * Optional per-format aggregates keyed by raw snapshot label
   * (e.g. "Reels", "Carrosséis", "Imagens"). Used by the recommendations
   * engine; absent in legacy snapshots.
   */
  format_stats?: Record<
    string,
    {
      count?: number | null;
      share_pct?: number | null;
      avg_engagement_pct?: number | null;
    }
  > | null;
  /**
   * Optional persisted OpenAI insights. Loose typing — every field is
   * defended at the mapping site. The PDF NEVER calls OpenAI; this block
   * is purely the result of an earlier `analyze-public-v1` fresh run.
   */
  ai_insights_v1?: {
    schema_version?: number | null;
    generated_at?: string | null;
    model?: string | null;
    insights?: Array<{
      id?: string | null;
      title?: string | null;
      body?: string | null;
      confidence?: string | null;
      priority?: number | null;
    }> | null;
  } | null;
}

interface RenderArgs {
  payload: NormalizedSnapshotPayload;
  /** ISO timestamp of the snapshot — when the analysis was originally produced. */
  analyzedAt: string;
}

const AVATAR_FETCH_TIMEOUT_MS = 3000;
const AVATAR_MAX_BYTES = 1_500_000; // 1.5MB cap, defensive

async function fetchAvatarDataUrl(url: string | null): Promise<string | undefined> {
  if (!url) return undefined;
  if (!/^https:\/\//i.test(url)) return undefined;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AVATAR_FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return undefined;

    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    if (!contentType.startsWith("image/")) return undefined;

    const buf = await res.arrayBuffer();
    if (buf.byteLength === 0 || buf.byteLength > AVATAR_MAX_BYTES) {
      return undefined;
    }

    // Manual base64 encoding to avoid Node-only Buffer reliance assumptions.
    const bytes = new Uint8Array(buf);
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode.apply(
        null,
        Array.from(bytes.subarray(i, i + chunkSize)),
      );
    }
    const base64 = btoa(binary);
    return `data:${contentType};base64,${base64}`;
  } catch (err) {
    console.warn("[pdf] avatar fetch failed", err);
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

function num(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function deriveTopPosts(
  posts: SnapshotPostLoose[] | null | undefined,
): TopPostForPdf[] {
  if (!Array.isArray(posts) || posts.length === 0) return [];
  const sorted = [...posts].sort(
    (a, b) => num(b?.engagement_pct, 0) - num(a?.engagement_pct, 0),
  );
  return sorted.slice(0, 3).map((p, idx) => {
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
    const captionRaw = typeof p.caption === "string" ? p.caption : "";
    return {
      id: typeof p.id === "string" && p.id.length > 0 ? p.id : `post-${idx}`,
      format: typeof p.format === "string" && p.format.length > 0 ? p.format : "—",
      takenAtIso: typeof p.taken_at_iso === "string" ? p.taken_at_iso : null,
      likes: num(p.likes, 0),
      comments: num(p.comments, 0),
      engagementPct: num(p.engagement_pct, 0),
      caption: captionRaw.trim().slice(0, 180),
      permalink,
    };
  });
}

/**
 * Map raw snapshot format label to canonical recommendation engine label.
 * Matches the convention used by `snapshot-to-report-data.ts` but with the
 * pt-PT label set the rest of the codebase uses ("Carrosséis").
 */
function canonicalFormat(
  raw: string | null | undefined,
): "Reels" | "Carrosséis" | "Imagens" {
  const s = (raw ?? "").toLowerCase();
  if (s.startsWith("reel")) return "Reels";
  if (s.startsWith("carro") || s.startsWith("carou")) return "Carrosséis";
  return "Imagens";
}

function deriveRecommendationInput(
  payload: NormalizedSnapshotPayload,
  benchmark: import("@/lib/benchmark/types").BenchmarkPositioning | undefined,
): RecommendationInput {
  const cs = payload.content_summary;
  const stats = payload.format_stats ?? {};

  // Collapse raw stat keys onto canonical labels (first occurrence wins).
  const formats: RecommendationInput["formats"] = {
    Reels: { sharePct: 0, avgEngagementPct: 0 },
    Carrosséis: { sharePct: 0, avgEngagementPct: 0 },
    Imagens: { sharePct: 0, avgEngagementPct: 0 },
  };
  const seen = new Set<string>();
  for (const [key, value] of Object.entries(stats)) {
    const canon = canonicalFormat(key);
    if (seen.has(canon)) continue;
    seen.add(canon);
    formats[canon] = {
      sharePct: num(value?.share_pct, 0),
      avgEngagementPct: num(value?.avg_engagement_pct, 0),
    };
  }

  // Top posts (already used for the Top Posts page) — narrow to the engine shape.
  const posts = Array.isArray(payload.posts) ? payload.posts : [];
  const sortedPosts = [...posts].sort(
    (a, b) => num(b?.engagement_pct, 0) - num(a?.engagement_pct, 0),
  );
  const topPosts = sortedPosts.slice(0, 3).map((p) => ({
    format: canonicalFormat(p.format),
    captionLength: typeof p.caption === "string" ? p.caption.trim().length : 0,
  }));

  // Hashtag aggregates across all analysed posts.
  let total = 0;
  const uniqueSet = new Set<string>();
  let postCount = 0;
  for (const p of posts) {
    if (!p) continue;
    postCount += 1;
    const tags = Array.isArray(p.hashtags) ? p.hashtags : [];
    for (const t of tags) {
      if (typeof t !== "string") continue;
      const norm = t.trim().toLowerCase();
      if (norm.length === 0) continue;
      total += 1;
      uniqueSet.add(norm);
    }
  }

  // Competitor median engagement (successful only).
  const successfulEng: number[] = [];
  for (const c of payload.competitors) {
    if (c && (c as { success?: boolean }).success === true) {
      const e = num(
        (c as { content_summary?: { average_engagement_rate?: number } })
          .content_summary?.average_engagement_rate,
        NaN,
      );
      if (Number.isFinite(e)) successfulEng.push(e);
    }
  }
  successfulEng.sort((a, b) => a - b);
  let median: number | null = null;
  if (successfulEng.length > 0) {
    const mid = Math.floor(successfulEng.length / 2);
    median =
      successfulEng.length % 2 === 0
        ? (successfulEng[mid - 1] + successfulEng[mid]) / 2
        : successfulEng[mid];
  }

  return {
    engagementPct: num(cs.average_engagement_rate, 0),
    postsPerWeek: num(cs.estimated_posts_per_week, 0),
    dominantFormat: canonicalFormat(cs.dominant_format),
    formats,
    topPosts,
    hashtags: { total, unique: uniqueSet.size, postCount },
    competitorMedianEngagementPct: median,
    benchmark,
    bio: typeof payload.profile.bio === "string" ? payload.profile.bio : "",
  };
}


/**
 * Map persisted `ai_insights_v1.insights[]` into the PDF-ready shape.
 * Defends every field, drops invalid items, and sorts by `priority` desc
 * so the PDF mirrors the web report ordering. Pure — no I/O.
 */
function deriveAiInsights(
  raw: NormalizedSnapshotPayload["ai_insights_v1"],
): AiInsightForPdf[] {
  if (!raw || !Array.isArray(raw.insights)) return [];
  const validConfidences = new Set([
    "baseado em dados observados",
    "sinal parcial",
  ]);
  const items: Array<AiInsightForPdf & { _priority: number }> = [];
  for (const i of raw.insights) {
    if (!i) continue;
    const id = typeof i.id === "string" && i.id.trim().length > 0 ? i.id.trim() : null;
    const title = typeof i.title === "string" ? i.title.trim() : "";
    const body = typeof i.body === "string" ? i.body.trim() : "";
    if (!id || !title || !body) continue;
    const confidence =
      typeof i.confidence === "string" && validConfidences.has(i.confidence)
        ? (i.confidence as AiInsightForPdf["confidence"])
        : "sinal parcial";
    items.push({
      id,
      title,
      body,
      confidence,
      _priority: num(i.priority, 0),
    });
  }
  items.sort((a, b) => b._priority - a._priority);
  return items.map(({ _priority: _ignored, ...rest }) => rest);
}

export async function renderReportPdf({
  payload,
  analyzedAt,
}: RenderArgs): Promise<Uint8Array> {
  const { profile, content_summary, competitors } = payload;

  // Recompute benchmark positioning server-side from the cloud dataset so the
  // PDF reflects the current reference data even if the snapshot itself was
  // produced before the benchmark engine landed.
  const benchmarkData = await loadBenchmarkReferences();
  const benchmark = computeBenchmarkPositioning(
    {
      followers: profile.followers_count,
      engagement: content_summary.average_engagement_rate,
      dominantFormat: content_summary.dominant_format,
    },
    benchmarkData,
  );

  const avatarDataUrl = await fetchAvatarDataUrl(profile.avatar_url);

  // Top posts: pure derivation from the snapshot's raw posts array.
  // No provider call, no thumbnail fetch — Instagram CDN URLs expire.
  const topPosts = deriveTopPosts(payload.posts);

  // Recommendations: pure heuristic engine over snapshot data only.
  // No OpenAI / Apify / DataForSEO call.
  const recommendations = buildRecommendations(
    deriveRecommendationInput(payload, benchmark),
  );

  const generatedAt = new Date().toISOString();

  // Persisted OpenAI insights (when present in this snapshot). Pure
  // mapping — the PDF NEVER calls OpenAI. Missing/invalid block produces
  // an empty array and the AI page is omitted.
  const aiInsights = deriveAiInsights(payload.ai_insights_v1);
  const aiInsightsModel =
    typeof payload.ai_insights_v1?.model === "string"
      ? payload.ai_insights_v1.model
      : null;
  const aiInsightsGeneratedAt =
    typeof payload.ai_insights_v1?.generated_at === "string"
      ? payload.ai_insights_v1.generated_at
      : null;

  const doc = createElement(ReportDocument, {
    profile,
    contentSummary: content_summary,
    competitors,
    benchmark,
    avatarDataUrl,
    topPosts,
    recommendations,
    aiInsights,
    aiInsightsModel,
    aiInsightsGeneratedAt,
    analyzedAt,
    generatedAt,
  });

  // ReportDocument returns a <Document>; the cast satisfies the strict
  // ReactElement<DocumentProps> signature of renderToBuffer.
  const buffer = await renderToBuffer(doc as Parameters<typeof renderToBuffer>[0]);
  return new Uint8Array(buffer);
}
