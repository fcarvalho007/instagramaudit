import { cn } from "@/lib/utils";

/**
 * Canonical missing-data strings used across every Profile vs Competitor
 * card. Exported so callers (e.g. card footers) can reuse the exact same
 * phrase without drift.
 */
export const COMPARE_MISSING_COPY = {
  competitorMissing: "Dados do concorrente indisponíveis nesta amostra.",
  competitorNoPosts: "Sem publicações do concorrente nesta janela.",
  thumbnailsMissing: "Miniaturas indisponíveis nesta amostra.",
} as const;

interface PerSide {
  primaryHandle: string;
  primaryN: number;
  competitorHandle: string;
  competitorN: number;
}

interface Props {
  /** Number of posts in the shared/single sample. Omit when no sample exists. */
  sampleN?: number | null;
  /** Per-side sample counts. Takes precedence over `sampleN` when both
   *  contagens forem > 0 — renders "Amostra: P publicações (@primary) ·
   *  C publicações (@competitor)." */
  perSide?: PerSide | null;
  /** "Sem publicações do concorrente nesta janela." */
  competitorNoPosts?: boolean;
  /** "Dados do concorrente indisponíveis nesta amostra." */
  competitorMissing?: boolean;
  /** "Miniaturas indisponíveis nesta amostra." */
  thumbnailsMissing?: boolean;
  /** Extra free-form qualifier appended at the end (escape hatch,
   *  e.g. CDN-expired explanation). */
  qualifier?: string | null;
  className?: string;
}

/**
 * Centralised methodology / missing-data note used by every Profile vs
 * Competitor card so copy never drifts. Sentence order is fixed:
 *   1. Amostra (perSide if both > 0, else sampleN)
 *   2. Sem publicações do concorrente nesta janela.
 *   3. Dados do concorrente indisponíveis nesta amostra.
 *   4. Miniaturas indisponíveis nesta amostra.
 *   5. qualifier
 *
 * Renders nothing when no sentence applies — caller is expected to gate
 * on its own empty-state already.
 */
export function CompareMissingDataNote({
  sampleN,
  perSide,
  competitorNoPosts,
  competitorMissing,
  thumbnailsMissing,
  qualifier,
  className,
}: Props) {
  const hasSample =
    typeof sampleN === "number" && Number.isFinite(sampleN) && sampleN > 0;
  const hasPerSide =
    !!perSide &&
    Number.isFinite(perSide.primaryN) &&
    Number.isFinite(perSide.competitorN) &&
    perSide.primaryN > 0 &&
    perSide.competitorN > 0;

  const parts: string[] = [];
  if (hasPerSide) {
    parts.push(
      `Amostra: ${perSide!.primaryN} publicações (@${perSide!.primaryHandle}) · ${perSide!.competitorN} publicações (@${perSide!.competitorHandle}).`,
    );
  } else if (hasSample) {
    parts.push(`Amostra: últimas ${sampleN} publicações disponíveis.`);
  }
  if (competitorNoPosts) {
    parts.push(COMPARE_MISSING_COPY.competitorNoPosts);
  }
  if (competitorMissing) {
    parts.push(COMPARE_MISSING_COPY.competitorMissing);
  }
  if (thumbnailsMissing) {
    parts.push(COMPARE_MISSING_COPY.thumbnailsMissing);
  }
  if (qualifier) {
    parts.push(qualifier);
  }

  if (parts.length === 0) return null;

  return (
    <p className={cn("text-sm text-content-secondary", className)}>
      {parts.join(" ")}
    </p>
  );
}