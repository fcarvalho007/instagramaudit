import { CompareCardShell, CompareStatBlock } from "@/components/report-redesign/v2/compare";
import type { ReportCompetitorBreakdownEntry } from "@/components/report/report-mock-data";

interface PrimarySide {
  handle: string;
  avatarUrl?: string | null;
  fullName?: string | null;
  verified?: boolean;
  engagementRate: number;
  averageLikes: number;
  averageComments: number;
}

interface Props {
  primary: PrimarySide;
  competitor: ReportCompetitorBreakdownEntry;
}

/**
 * Pro-only "Profile vs Competitor" comparison block — Engagement.
 *
 * Sibling enhancement to EngagementCardRefined. Focuses on engagement
 * rate (Padrão 1) with optional supporting rows for likes/comments per
 * post. Renders nothing when the competitor has no usable engagement
 * signal.
 */
export function CompetitorEngagementCompare({ primary, competitor }: Props) {
  if (!isPositive(competitor.averageEngagementRate)) return null;
  if (!isPositive(primary.engagementRate)) return null;

  const verdict = buildVerdict(
    primary.engagementRate,
    competitor.averageEngagementRate,
  );

  return (
    <CompareCardShell
      title="Taxa de engagement"
      subtitle="Envolvimento médio por publicação"
      windowAligned={competitor.windowAligned}
      primary={{
        handle: primary.handle,
        avatarUrl: primary.avatarUrl ?? null,
        isVerified: Boolean(primary.verified),
        displayName: primary.fullName ?? null,
      }}
      competitor={{
        handle: competitor.username,
        avatarUrl: competitor.avatarUrl ?? null,
        isVerified: competitor.isVerified,
        displayName: competitor.displayName,
      }}
      footer={verdict}
    >
      <CompareStatBlock
        variant="bare"
        label="Taxa de engagement"
        primary={{
          handle: primary.handle,
          value: primary.engagementRate,
          formatted: fmtPct(primary.engagementRate),
        }}
        competitor={{
          handle: competitor.username,
          value: competitor.averageEngagementRate,
          formatted: fmtPct(competitor.averageEngagementRate),
        }}
        unit="pp"
        higherIsBetter={true}
      />
    </CompareCardShell>
  );
}

function buildVerdict(primaryER: number, competitorER: number): string {
  const ratio = primaryER / competitorER;
  if (ratio >= 0.95 && ratio <= 1.05) {
    return "Os dois perfis estão em linha no envolvimento médio.";
  }
  if (ratio > 1.05) {
    return "Este perfil está acima do concorrente em envolvimento médio.";
  }
  const inverse = competitorER / primaryER;
  const mult = inverse.toLocaleString("pt-PT", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return `O concorrente gera ${mult}× mais envolvimento médio por publicação.`;
}

function isPositive(n: number | null | undefined): n is number {
  return typeof n === "number" && Number.isFinite(n) && n > 0;
}

function fmtPct(n: number): string {
  return `${n.toLocaleString("pt-PT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} %`;
}