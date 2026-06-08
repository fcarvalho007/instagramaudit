import { CompareCardShell, CompareStatBlock } from "@/components/report-redesign/v2/compare";
import type { CompareUnit } from "@/components/report-redesign/v2/compare";
import type { ReportCompetitorBreakdownEntry } from "@/components/report/report-mock-data";
import { formatCompactNumber } from "@/lib/i18n/format";

interface PrimarySide {
  handle: string;
  avatarUrl?: string | null;
  fullName?: string | null;
  verified?: boolean;
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
    <CompareCardShell
      title="Identidade"
      subtitle="Métricas-base lado a lado"
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
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        {rows.map((row) => (
          <CompareStatBlock
            key={row.label}
            variant="bare"
            label={row.label}
            primary={{
              handle: primary.handle,
              value: row.primaryValue,
              formatted: row.primaryFormatted,
              title: row.primaryTitle,
            }}
            competitor={{
              handle: competitor.username,
              value: row.competitorValue,
              formatted: row.competitorFormatted,
              title: row.competitorTitle,
            }}
            unit={row.unit}
            higherIsBetter={true}
          />
        ))}
      </div>
    </CompareCardShell>
  );
}

interface Row {
  label: string;
  unit: CompareUnit;
  primaryValue: number;
  competitorValue: number;
  primaryFormatted: string;
  competitorFormatted: string;
  /** Optional exact-value text for native `title=` tooltip. */
  primaryTitle?: string;
  competitorTitle?: string;
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
      primaryFormatted: fmtCompact(primary.followers),
      competitorFormatted: fmtCompact(c.followers),
      primaryTitle: fmtInt(primary.followers),
      competitorTitle: fmtInt(c.followers),
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
    const p = Math.round(primary.averageLikes);
    const k = Math.round(c.averageLikes);
    rows.push({
      label: "Likes por publicação",
      unit: "abs",
      primaryValue: primary.averageLikes,
      competitorValue: c.averageLikes,
      primaryFormatted: fmtIntOrCompact(p),
      competitorFormatted: fmtIntOrCompact(k),
      primaryTitle: fmtInt(p),
      competitorTitle: fmtInt(k),
    });
  }

  if (isPositive(primary.averageComments) && isPositive(c.averageComments)) {
    const p = Math.round(primary.averageComments);
    const k = Math.round(c.averageComments);
    rows.push({
      label: "Comentários por publicação",
      unit: "abs",
      primaryValue: primary.averageComments,
      competitorValue: c.averageComments,
      primaryFormatted: fmtIntOrCompact(p),
      competitorFormatted: fmtIntOrCompact(k),
      primaryTitle: fmtInt(p),
      competitorTitle: fmtInt(k),
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

/** Always compact pt-PT (e.g. "1,1 M", "5,3 M"). Use for high-magnitude metrics. */
function fmtCompact(n: number): string {
  return formatCompactNumber(n, "pt");
}

/** Compact only when value ≥ 10 000; otherwise the full pt-PT integer fits. */
function fmtIntOrCompact(n: number): string {
  return Math.abs(n) >= 10_000 ? fmtCompact(n) : fmtInt(n);
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