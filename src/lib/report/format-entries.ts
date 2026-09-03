/**
 * Derivação canónica das contagens/quotas por formato.
 *
 * Esta lógica vivia inline em `report-redesign/v2/report-overview-block.tsx`.
 * Foi extraída sem qualquer alteração de comportamento para poder ser
 * reutilizada pela camada de apresentação Editorial V2 sem duplicar uma
 * regra de negócio. Pura, determinística, sem I/O.
 *
 * Ordem de precedência para a contagem (idêntica à de produção):
 *   1. `payload.format_stats[k].count` — autoritativo do snapshot;
 *   2. contagem por post em `enriched.analysedPostFormats`;
 *   3. arredondamento `sharePct × postsAnalyzed` (comportamento legado).
 */
import { normaliseFormatKey, type CanonicalFormatKey } from "@/lib/report/format-keys";

export interface FormatEntryLike {
  format: CanonicalFormatKey;
  sharePct: number;
  count: number;
}

export interface BuildFormatEntriesInput {
  /** `result.data.formatBreakdown` — define a ordem e as quotas. */
  formatBreakdown: ReadonlyArray<{ format: string; sharePct: number }>;
  /** `result.data.keyMetrics.postsAnalyzed`. */
  postsAnalyzed: number;
  /** `payload.format_stats` (chaves cruas do snapshot). */
  formatStats?: Record<string, { count?: number | null } | undefined> | null;
  /** `result.enriched.analysedPostFormats`. */
  analysedPostFormats: ReadonlyArray<{ type: string }>;
}

export function buildFormatEntries({
  formatBreakdown,
  postsAnalyzed,
  formatStats,
  analysedPostFormats,
}: BuildFormatEntriesInput): FormatEntryLike[] {
  // 1. Contagens do payload cru (autoritativas).
  const fromPayload = new Map<string, number>();
  if (formatStats) {
    for (const [rawKey, v] of Object.entries(formatStats)) {
      const canonical = normaliseFormatKey(rawKey);
      if (!canonical) continue;
      const c =
        typeof v?.count === "number" && Number.isFinite(v.count) ? v.count : 0;
      fromPayload.set(canonical, (fromPayload.get(canonical) ?? 0) + c);
    }
  }

  // 2. Fallback: contagem por publicação.
  const fromPosts = new Map<string, number>();
  for (const p of analysedPostFormats) {
    const canonical =
      p.type === "reel"
        ? "Reels"
        : p.type === "carousel"
          ? "Carousels"
          : p.type === "image"
            ? "Imagens"
            : null;
    if (!canonical) continue;
    fromPosts.set(canonical, (fromPosts.get(canonical) ?? 0) + 1);
  }

  return formatBreakdown.map((f) => {
    const key = f.format as CanonicalFormatKey;
    const real = fromPayload.get(key);
    const fallbackPosts = fromPosts.get(key);
    const fallbackRound = Math.round((f.sharePct / 100) * postsAnalyzed);
    const count =
      typeof real === "number" && real > 0
        ? real
        : typeof fallbackPosts === "number" && fallbackPosts > 0
          ? fallbackPosts
          : fallbackRound;
    return { format: key, sharePct: f.sharePct, count };
  });
}
