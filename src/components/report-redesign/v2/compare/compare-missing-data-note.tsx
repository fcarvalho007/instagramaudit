import { cn } from "@/lib/utils";

interface Props {
  /** Number of posts in the shared sample. Omit when no sample exists. */
  sampleN?: number | null;
  /** Print "Dados do concorrente indisponíveis nesta amostra." */
  competitorMissing?: boolean;
  /** Extra qualifier appended after the missing-data sentence
   *  (e.g. "Miniaturas do concorrente indisponíveis…"). */
  qualifier?: string | null;
  className?: string;
}

/**
 * Centralised methodology / missing-data note used by the
 * Profile vs Competitor cards so the copy never drifts:
 *
 *   "Amostra: últimas N publicações disponíveis."
 *   "Dados do concorrente indisponíveis nesta amostra."
 *
 * Renders nothing when there is no sample size and the competitor
 * is not flagged as missing — the caller is expected to gate on
 * its own empty-state already.
 */
export function CompareMissingDataNote({
  sampleN,
  competitorMissing,
  qualifier,
  className,
}: Props) {
  const hasSample =
    typeof sampleN === "number" && Number.isFinite(sampleN) && sampleN > 0;
  if (!hasSample && !competitorMissing && !qualifier) return null;

  const parts: string[] = [];
  if (hasSample) {
    parts.push(`Amostra: últimas ${sampleN} publicações disponíveis.`);
  }
  if (competitorMissing) {
    parts.push("Dados do concorrente indisponíveis nesta amostra.");
  }
  if (qualifier) {
    parts.push(qualifier);
  }

  return (
    <p className={cn("text-sm text-content-secondary", className)}>
      {parts.join(" ")}
    </p>
  );
}