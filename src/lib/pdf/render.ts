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

import { ReportDocument } from "./report-document";

interface NormalizedSnapshotPayload {
  profile: PublicAnalysisProfile;
  content_summary: PublicAnalysisContentSummary;
  competitors: CompetitorAnalysis[];
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

  const generatedAt = new Date().toISOString();

  const doc = createElement(ReportDocument, {
    profile,
    contentSummary: content_summary,
    competitors,
    benchmark,
    avatarDataUrl,
    analyzedAt,
    generatedAt,
  });

  // ReportDocument returns a <Document>; the cast satisfies the strict
  // ReactElement<DocumentProps> signature of renderToBuffer.
  const buffer = await renderToBuffer(doc as Parameters<typeof renderToBuffer>[0]);
  return new Uint8Array(buffer);
}
