import { CompareStatBlock } from "@/components/report-redesign/v2/compare";
import type { ReportCompetitorBreakdownEntry } from "@/components/report/report-mock-data";

interface PrimarySide {
  handle: string;
  postingFrequencyWeekly: number;
}

interface Props {
  primary: PrimarySide;
  // TODO: multi-competitor layout (Fase 1.5) — today only the first
  // competitor is rendered.
  competitor: ReportCompetitorBreakdownEntry;
}

/**
 * Pro-only "Profile vs Competitor" cadence comparison — Frequency section.
 *
 * Sibling enhancement to FrequencyCard: never edits the locked card,
 * never replaces existing content. Renders nothing when the competitor
 * has no usable weekly cadence.
 *
 * Pattern 1 — single-number comparison: primary `postingFrequencyWeekly`
 * vs competitor `estimatedPostsPerWeek`.
 */
export function CompetitorCadenceCompare({ primary, competitor }: Props) {
  if (!isPositive(primary.postingFrequencyWeekly)) return null;
  if (!isPositive(competitor.estimatedPostsPerWeek)) return null;

  const verdict = buildVerdict(
    primary.postingFrequencyWeekly,
    competitor.estimatedPostsPerWeek,
  );

  return (
    <section
      aria-label="Comparação de cadência com concorrente"
      className="space-y-3"
    >
      <CompareStatBlock
        label="Cadência semanal"
        hint={
          !competitor.windowAligned
            ? "Concorrente em janela baseline · publicações por semana"
            : "Publicações por semana"
        }
        primary={{
          handle: primary.handle,
          value: primary.postingFrequencyWeekly,
          formatted: fmtDecimal(primary.postingFrequencyWeekly, 1),
        }}
        competitor={{
          handle: competitor.username,
          value: competitor.estimatedPostsPerWeek,
          formatted: fmtDecimal(competitor.estimatedPostsPerWeek, 1),
        }}
        unit="abs"
        higherIsBetter={true}
      />
      <p className="text-sm text-content-secondary leading-relaxed px-1">
        {verdict}
      </p>
    </section>
  );
}

function buildVerdict(primaryWeekly: number, competitorWeekly: number): string {
  const ratio = primaryWeekly / competitorWeekly;
  if (ratio >= 1.05) return "Este perfil publica com maior frequência.";
  if (ratio <= 0.95) return "O concorrente publica com maior frequência.";
  return "Os dois perfis têm uma cadência semelhante.";
}

function isPositive(n: number | null | undefined): n is number {
  return typeof n === "number" && Number.isFinite(n) && n > 0;
}

function fmtDecimal(n: number, digits: number): string {
  return n.toLocaleString("pt-PT", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}