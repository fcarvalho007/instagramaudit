import { CompareStatBlock } from "@/components/report-redesign/v2/compare";
import type { CompareUnit } from "@/components/report-redesign/v2/compare";
import type { ReportCompetitorBreakdownEntry } from "@/components/report/report-mock-data";

interface PrimarySide {
  handle: string;
  followers: number;
  postsAnalyzed: number;
  engagementRate: number;
  averageLikes: number;
  averageComments: number;
  postingFrequencyWeekly: number;
}

interface Props {
  primary: PrimarySide;
  competitor: ReportCompetitorBreakdownEntry;
  /**
   * Limits which rows are rendered:
   * - "all" (default): all comparable KPIs.
   * - "identity": only identity-level rows (Seguidores, Publicações analisadas).
   *   Use when Engagement / Cadence comparisons are rendered in their own
   *   cards to avoid duplicating the same metric across the report.
   */
  scope?: "all" | "identity";
}

/**
 * Pro-only "Profile vs Competitor" comparison block — Overview.
 *
 * Sibling enhancement to the EditorialIdentityCard: never edits the
 * locked identity card, never replaces existing content. Renders nothing
 * when no metric can be honestly compared.
 *
 * Phase 1 — supports a single competitor (caller passes
 * `competitorBreakdown[0]`).
 */
export function CompetitorOverviewCompare({ primary, competitor, scope = "all" }: Props) {
  const rows = buildRows(primary, competitor, scope);
  if (rows.length === 0) return null;

  return (
    <section
      aria-label="Comparação com concorrente"
      className="rounded-2xl border border-border-default bg-surface-secondary shadow-card overflow-hidden"
    >
      <header className="px-4 sm:px-5 md:px-6 pt-6 sm:pt-7 pb-3 space-y-1">
        <span className="text-eyebrow-sm text-content-tertiary">
          Comparação com concorrente
        </span>
        <h3 className="text-base sm:text-lg font-semibold text-content-primary">
          @{primary.handle} vs @{competitor.username}
        </h3>
        {!competitor.windowAligned ? (
          <p className="text-xs text-content-tertiary">
            Concorrente em janela baseline.
          </p>
        ) : null}
      </header>

      <div className="px-4 sm:px-5 md:px-6 pb-6 sm:pb-7 grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {rows.map((row) => (
          <CompareStatBlock
            key={row.label}
            label={row.label}
            primary={{
              handle: primary.handle,
              value: row.primaryValue,
              formatted: row.primaryFormatted,
            }}
            competitor={{
              handle: competitor.username,
              value: row.competitorValue,
              formatted: row.competitorFormatted,
            }}
            unit={row.unit}
            higherIsBetter={true}
          />
        ))}
      </div>
    </section>
  );
}

interface Row {
  label: string;
  unit: CompareUnit;
  primaryValue: number;
  competitorValue: number;
  primaryFormatted: string;
  competitorFormatted: string;
}

function buildRows(
  primary: PrimarySide,
  c: ReportCompetitorBreakdownEntry,
  scope: "all" | "identity",
): Row[] {
  const rows: Row[] = [];

  if (isPositive(primary.followers) && isPositive(c.followers)) {
    rows.push({
      label: "Seguidores",
      unit: "abs",
      primaryValue: primary.followers,
      competitorValue: c.followers,
      primaryFormatted: fmtInt(primary.followers),
      competitorFormatted: fmtInt(c.followers),
    });
  }

  if (isPositive(primary.postsAnalyzed) && isPositive(c.postsAnalyzed)) {
    rows.push({
      label: "Publicações analisadas",
      unit: "abs",
      primaryValue: primary.postsAnalyzed,
      competitorValue: c.postsAnalyzed,
      primaryFormatted: fmtInt(primary.postsAnalyzed),
      competitorFormatted: fmtInt(c.postsAnalyzed),
    });
  }

  if (scope === "identity") return rows;

  if (isPositive(primary.engagementRate) && isPositive(c.averageEngagementRate)) {
    rows.push({
      label: "Envolvimento médio",
      unit: "pp",
      primaryValue: primary.engagementRate,
      competitorValue: c.averageEngagementRate,
      primaryFormatted: fmtPct(primary.engagementRate),
      competitorFormatted: fmtPct(c.averageEngagementRate),
    });
  }

  if (isPositive(primary.averageLikes) && isPositive(c.averageLikes)) {
    rows.push({
      label: "Likes por publicação",
      unit: "abs",
      primaryValue: primary.averageLikes,
      competitorValue: c.averageLikes,
      primaryFormatted: fmtInt(Math.round(primary.averageLikes)),
      competitorFormatted: fmtInt(Math.round(c.averageLikes)),
    });
  }

  if (isPositive(primary.averageComments) && isPositive(c.averageComments)) {
    rows.push({
      label: "Comentários por publicação",
      unit: "abs",
      primaryValue: primary.averageComments,
      competitorValue: c.averageComments,
      primaryFormatted: fmtInt(Math.round(primary.averageComments)),
      competitorFormatted: fmtInt(Math.round(c.averageComments)),
    });
  }

  if (
    isPositive(primary.postingFrequencyWeekly) &&
    isPositive(c.estimatedPostsPerWeek)
  ) {
    rows.push({
      label: "Publicações por semana",
      unit: "abs",
      primaryValue: primary.postingFrequencyWeekly,
      competitorValue: c.estimatedPostsPerWeek,
      primaryFormatted: fmtDecimal(primary.postingFrequencyWeekly, 1),
      competitorFormatted: fmtDecimal(c.estimatedPostsPerWeek, 1),
    });
  }

  return rows;
}

function isPositive(n: number | null | undefined): n is number {
  return typeof n === "number" && Number.isFinite(n) && n > 0;
}

function fmtInt(n: number): string {
  return n.toLocaleString("pt-PT");
}

function fmtDecimal(n: number, digits: number): string {
  return n.toLocaleString("pt-PT", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function fmtPct(n: number): string {
  return `${n.toLocaleString("pt-PT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} %`;
}