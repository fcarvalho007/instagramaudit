import { cn } from "@/lib/utils";
import { CompareStatBlock } from "@/components/report-redesign/v2/compare";
import type { ReportCompetitorBreakdownEntry } from "@/components/report/report-mock-data";

interface PrimarySide {
  handle: string;
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

  const showLikes =
    isPositive(primary.averageLikes) && isPositive(competitor.averageLikes);
  const showComments =
    isPositive(primary.averageComments) &&
    isPositive(competitor.averageComments);

  return (
    <section
      aria-label="Comparação de envolvimento com concorrente"
      className="rounded-2xl border border-border-default bg-surface-secondary shadow-card overflow-hidden"
    >
      <header className="px-4 sm:px-5 md:px-6 pt-6 sm:pt-7 pb-3 space-y-1">
        <span className="text-eyebrow-sm text-content-tertiary">
          Envolvimento vs concorrente
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

      <div className="px-4 sm:px-5 md:px-6 pb-4 sm:pb-5">
        <CompareStatBlock
          label="Envolvimento médio"
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
      </div>

      {(showLikes || showComments) && (
        <div className="px-4 sm:px-5 md:px-6 pb-4 sm:pb-5 space-y-2">
          {showLikes && (
            <SupportRow
              label="Likes por publicação"
              primaryHandle={primary.handle}
              competitorHandle={competitor.username}
              primaryFormatted={fmtInt(Math.round(primary.averageLikes))}
              competitorFormatted={fmtInt(Math.round(competitor.averageLikes))}
            />
          )}
          {showComments && (
            <SupportRow
              label="Comentários por publicação"
              primaryHandle={primary.handle}
              competitorHandle={competitor.username}
              primaryFormatted={fmtInt(Math.round(primary.averageComments))}
              competitorFormatted={fmtInt(
                Math.round(competitor.averageComments),
              )}
            />
          )}
        </div>
      )}

      <div className="px-4 sm:px-5 md:px-6 pb-6 sm:pb-7">
        <p className="text-sm text-content-secondary leading-relaxed">
          {verdict}
        </p>
      </div>
    </section>
  );
}

function SupportRow({
  label,
  primaryHandle,
  competitorHandle,
  primaryFormatted,
  competitorFormatted,
}: {
  label: string;
  primaryHandle: string;
  competitorHandle: string;
  primaryFormatted: string;
  competitorFormatted: string;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] items-center gap-1 sm:gap-3 rounded-lg border border-border-subtle bg-surface-primary px-3 py-2">
      <span className="text-xs text-content-secondary">{label}</span>
      <Pair accent="primary" handle={primaryHandle} value={primaryFormatted} />
      <Pair
        accent="secondary"
        handle={competitorHandle}
        value={competitorFormatted}
      />
    </div>
  );
}

function Pair({
  accent,
  handle,
  value,
}: {
  accent: "primary" | "secondary";
  handle: string;
  value: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-content-primary">
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 rounded-full shrink-0",
          accent === "primary" ? "bg-accent-primary" : "bg-accent-secondary",
        )}
      />
      <span className="text-content-secondary truncate max-w-[8rem]">
        @{handle}
      </span>
      <span className="tabular-nums font-medium">{value}</span>
    </span>
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

function fmtInt(n: number): string {
  return n.toLocaleString("pt-PT");
}

function fmtPct(n: number): string {
  return `${n.toLocaleString("pt-PT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} %`;
}