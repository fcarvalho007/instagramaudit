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

import { ReportDocument, type TopPostForPdf } from "./report-document";
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

  const generatedAt = new Date().toISOString();

  const doc = createElement(ReportDocument, {
    profile,
    contentSummary: content_summary,
    competitors,
    benchmark,
    avatarDataUrl,
    topPosts,
    analyzedAt,
    generatedAt,
  });

  // ReportDocument returns a <Document>; the cast satisfies the strict
  // ReactElement<DocumentProps> signature of renderToBuffer.
  const buffer = await renderToBuffer(doc as Parameters<typeof renderToBuffer>[0]);
  return new Uint8Array(buffer);
}
