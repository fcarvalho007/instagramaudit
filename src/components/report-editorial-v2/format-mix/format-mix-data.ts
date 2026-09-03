import type { AdapterResult, SnapshotPayload } from "@/lib/report/snapshot-to-report-data";
import { buildFormatEntries } from "@/lib/report/format-entries";
import type { CanonicalFormatKey } from "@/lib/report/format-keys";
import { getFormatVariationStatus } from "@/components/report-redesign/v2/overview/format-card";

import type { StatusTone } from "../primitives/status-pill";
import { describeWindow } from "../frequency/frequency-data";

/**
 * Adaptador de APRESENTAÇÃO do mix de formatos (Editorial V2, Fase D).
 *
 * Lê apenas dados já carregados:
 *   - `result.data.formatBreakdown` (quotas do snapshot);
 *   - `payload.format_stats` (contagens autoritativas);
 *   - `result.enriched.analysedPostFormats` (formato, data, thumbnail real);
 *   - `result.data.keyMetrics` (total analisado, dominante).
 *
 * As contagens usam o helper partilhado `buildFormatEntries` — a mesma
 * derivação do cartão de produção. Nenhuma regra nova, nenhum I/O,
 * nenhum valor da referência HTML.
 */

export const FORMAT_LABEL_PT: Record<CanonicalFormatKey, string> = {
  Reels: "Reels",
  Carousels: "Carrosséis",
  Imagens: "Imagens",
};

export type PostFormatType =
  | "carousel"
  | "reel"
  | "image"
  | "video"
  | "unknown";

export interface FormatSegment {
  key: CanonicalFormatKey;
  label: string;
  count: number;
  sharePct: number;
  /** Fracção 0–1 do anel, derivada das contagens reais. */
  fraction: number;
  isDominant: boolean;
}

export interface FormatMixPost {
  date: string;
  type: PostFormatType;
  thumbnailUrl: string | null;
}

export interface EditorialFormatMixData {
  postsAnalyzed: number;
  /** Total efectivamente contabilizado nos segmentos. */
  countedPosts: number;
  segments: FormatSegment[];
  /** Formatos com pelo menos uma publicação. */
  presentSegments: FormatSegment[];
  dominant: FormatSegment | null;
  formatsUsed: number;
  windowLabel: string;
  calculationNote: string;
  status: { tone: StatusTone; label: string };
  posts: FormatMixPost[];
  /** Subconjunto apresentado na tira (sem alterar a amostra analisada). */
  visiblePosts: FormatMixPost[];
  hiddenPostCount: number;
  postsWithThumbnail: number;
  hasFormatData: boolean;
}

const STRIP_LIMIT = 12;

function finite(n: unknown): number {
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}

function toStatusTone(label: string): StatusTone {
  if (label === "Muito variado") return "success";
  if (label === "Variado") return "neutral";
  return "warning"; // "Pouco variado"
}

export function buildEditorialFormatMixData(
  result: AdapterResult,
  payload?: SnapshotPayload,
): EditorialFormatMixData {
  const postsAnalyzed = finite(result.data.keyMetrics.postsAnalyzed);
  const analysedPostFormats = result.enriched.analysedPostFormats ?? [];

  const entries = buildFormatEntries({
    formatBreakdown: result.data.formatBreakdown,
    postsAnalyzed,
    formatStats: payload?.format_stats ?? null,
    analysedPostFormats,
  });

  const countedPosts = entries.reduce((sum, e) => sum + Math.max(0, e.count), 0);
  const dominantKey = entries
    .filter((e) => e.count > 0)
    .sort((a, b) => b.count - a.count || b.sharePct - a.sharePct)[0]?.format;

  const segments: FormatSegment[] = entries.map((e) => ({
    key: e.format,
    label: FORMAT_LABEL_PT[e.format] ?? e.format,
    count: Math.max(0, e.count),
    sharePct: finite(e.sharePct),
    fraction: countedPosts > 0 ? Math.max(0, e.count) / countedPosts : 0,
    isDominant: e.format === dominantKey,
  }));

  const presentSegments = segments.filter((s) => s.count > 0);

  const cadence = result.enriched.cadence;
  const windowLabel = describeWindow(
    String(cadence?.method ?? "insufficient"),
    finite(cadence?.windowDays),
  );

  const posts: FormatMixPost[] = analysedPostFormats.map((p) => ({
    date: p.date,
    type: (p.type ?? "unknown") as PostFormatType,
    thumbnailUrl: p.thumbnailUrl ?? null,
  }));

  const visiblePosts = posts.slice(0, STRIP_LIMIT);

  const statusLabel = getFormatVariationStatus(
    presentSegments.map((s) => ({
      format: s.key,
      sharePct: s.sharePct,
      count: s.count,
    })),
  );

  return {
    postsAnalyzed,
    countedPosts,
    segments,
    presentSegments,
    dominant: presentSegments.find((s) => s.isDominant) ?? null,
    formatsUsed: presentSegments.length,
    windowLabel,
    calculationNote:
      countedPosts > 0
        ? `Distribuição das ${countedPosts} publicações classificadas por formato (${windowLabel}).`
        : `Não há publicações com formato classificado no ${windowLabel}.`,
    status: { tone: toStatusTone(statusLabel), label: statusLabel },
    posts,
    visiblePosts,
    hiddenPostCount: Math.max(0, posts.length - visiblePosts.length),
    postsWithThumbnail: posts.filter((p) => p.thumbnailUrl !== null).length,
    hasFormatData: presentSegments.length > 0,
  };
}
