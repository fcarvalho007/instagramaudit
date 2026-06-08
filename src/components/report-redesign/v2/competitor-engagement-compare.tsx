import { CompareCardShell, CompareStatBlock } from "@/components/report-redesign/v2/compare";
import type { ReportCompetitorBreakdownEntry } from "@/components/report/report-mock-data";
import { cn } from "@/lib/utils";

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
  /** Tier reference ER (%) for the primary's follower scale. */
  benchmark?: number | null;
  /** Portuguese label for the scale (e.g. "Micro", "Mid"). */
  scaleLabel?: string | null;
}

/**
 * Pro-only "Profile vs Competitor" comparison block — Engagement.
 *
 * Sibling enhancement to EngagementCardRefined. Shows engagement rate
 * primary vs competitor, plus per-side reading against the tier
 * benchmark when available. Gracefully degrades to the minimal layout
 * (no rail, no scale copy) when benchmark is missing.
 */
export function CompetitorEngagementCompare({ primary, competitor, benchmark, scaleLabel }: Props) {
  if (!isPositive(competitor.averageEngagementRate)) return null;
  if (!isPositive(primary.engagementRate)) return null;

  const hasBenchmark = isPositive(benchmark);
  const verdict = hasBenchmark
    ? buildCombinedVerdict(
        primary.engagementRate,
        competitor.averageEngagementRate,
        benchmark as number,
        scaleLabel ?? null,
      )
    : buildVerdict(primary.engagementRate, competitor.averageEngagementRate);

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
      {hasBenchmark ? (
        <div className="mt-5 sm:mt-6 space-y-5">
          <BenchmarkRail
            primaryHandle={primary.handle}
            competitorHandle={competitor.username}
            primaryER={primary.engagementRate}
            competitorER={competitor.averageEngagementRate}
            benchmark={benchmark as number}
            scaleLabel={scaleLabel ?? null}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SideBenchmarkLine
              side="primary"
              er={primary.engagementRate}
              benchmark={benchmark as number}
              scaleLabel={scaleLabel ?? null}
            />
            <SideBenchmarkLine
              side="competitor"
              er={competitor.averageEngagementRate}
              benchmark={benchmark as number}
              scaleLabel={scaleLabel ?? null}
            />
          </div>
        </div>
      ) : null}
    </CompareCardShell>
  );
}

// ─── Benchmark rail ────────────────────────────────────────────────

function BenchmarkRail({
  primaryHandle,
  competitorHandle,
  primaryER,
  competitorER,
  benchmark,
  scaleLabel,
}: {
  primaryHandle: string;
  competitorHandle: string;
  primaryER: number;
  competitorER: number;
  benchmark: number;
  scaleLabel: string | null;
}) {
  const strongMax = benchmark * 2;
  const rangeMax = Math.max(strongMax, primaryER, competitorER) * 1.05;
  const pct = (n: number) => `${Math.max(0, Math.min(100, (n / rangeMax) * 100))}%`;
  const refLabel = scaleLabel ? `Referência ${scaleLabel}` : "Referência";
  const ariaLabel = `Posição no escalão: @${primaryHandle} ${fmtPct(primaryER)}, @${competitorHandle} ${fmtPct(competitorER)}, referência ${fmtPct(benchmark)}.`;
  return (
    <div className="pt-1" role="img" aria-label={ariaLabel}>
      {/* Axis labels */}
      <div className="flex items-center justify-between text-[11px] text-content-tertiary mb-1.5">
        <span>0 %</span>
        <span className="font-medium text-content-secondary">{refLabel} · {fmtPct(benchmark)}</span>
        <span>{fmtPct(rangeMax)}</span>
      </div>
      {/* Track */}
      <div className="relative h-2 rounded-full bg-surface-muted">
        {/* Strong zone band */}
        <div
          aria-hidden="true"
          className="absolute top-0 bottom-0 rounded-full bg-signal-success/15"
          style={{ left: pct(benchmark), right: `calc(100% - ${pct(strongMax)})` }}
        />
        {/* Reference tick */}
        <div
          aria-hidden="true"
          className="absolute -top-1 bottom-[-0.25rem] w-px bg-content-tertiary/70"
          style={{ left: pct(benchmark) }}
        />
        {/* Markers */}
        <Marker side="primary" position={pct(primaryER)} />
        <Marker side="competitor" position={pct(competitorER)} />
      </div>
      {/* Handle labels */}
      <div className="mt-2 relative h-4 text-xs">
        <MarkerLabel side="primary" position={pct(primaryER)} handle={primaryHandle} />
        <MarkerLabel side="competitor" position={pct(competitorER)} handle={competitorHandle} />
      </div>
    </div>
  );
}

function Marker({ side, position }: { side: "primary" | "competitor"; position: string }) {
  const color = side === "primary" ? "bg-accent-primary" : "bg-compare-competitor";
  const ring = side === "primary" ? "ring-accent-primary/30" : "ring-compare-competitor/30";
  return (
    <span
      aria-hidden="true"
      className={cn(
        "absolute top-1/2 -translate-x-1/2 -translate-y-1/2 size-3 rounded-full ring-4 ring-white",
        color,
      )}
      style={{ left: position, boxShadow: `0 0 0 1px var(--border-default)` }}
    >
      <span className={cn("absolute inset-0 rounded-full ring-2", ring)} aria-hidden="true" />
    </span>
  );
}

function MarkerLabel({ side, position, handle }: { side: "primary" | "competitor"; position: string; handle: string }) {
  const color = side === "primary" ? "text-accent-primary" : "text-compare-competitor";
  return (
    <span
      className={cn(
        "absolute top-0 -translate-x-1/2 font-semibold tabular-nums truncate max-w-[8rem]",
        color,
      )}
      style={{ left: position }}
    >
      @{handle}
    </span>
  );
}

// ─── Per-side benchmark reading ───────────────────────────────────

function SideBenchmarkLine({
  side,
  er,
  benchmark,
  scaleLabel,
}: {
  side: "primary" | "competitor";
  er: number;
  benchmark: number;
  scaleLabel: string | null;
}) {
  const ratio = er / benchmark;
  const deltaPct = Math.round((er - benchmark) / benchmark * 100);
  const arrow = deltaPct > 2 ? "↗" : deltaPct < -2 ? "↘" : "→";
  const sign = deltaPct > 0 ? "+" : "";
  const reading = classifyRatio(ratio);
  const tone =
    reading.tone === "success"
      ? "text-signal-success"
      : reading.tone === "warning"
      ? "text-signal-warning"
      : "text-content-secondary";
  const accentDot = side === "primary" ? "bg-accent-primary" : "bg-compare-competitor";
  const refSuffix = scaleLabel ? ` ${scaleLabel}` : "";
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className={cn("size-2 rounded-full", accentDot)} />
        <span className="text-sm text-content-tertiary tabular-nums">
          {arrow} {sign}{deltaPct} % vs referência{refSuffix}
        </span>
      </div>
      <span className={cn("text-sm font-medium", tone)}>{reading.label}</span>
    </div>
  );
}

function classifyRatio(ratio: number): {
  label: string;
  tone: "success" | "warning" | "neutral";
} {
  if (ratio < 0.7) return { label: "Abaixo da referência do escalão", tone: "warning" };
  if (ratio < 0.95) return { label: "Ligeiramente abaixo da referência", tone: "neutral" };
  if (ratio <= 1.15) return { label: "Em linha com a referência", tone: "neutral" };
  if (ratio <= 2) return { label: "Acima da referência do escalão", tone: "success" };
  return { label: "Muito acima da referência do escalão", tone: "success" };
}

// ─── Verdict copy ──────────────────────────────────────────────────

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

function buildCombinedVerdict(
  primaryER: number,
  competitorER: number,
  benchmark: number,
  scaleLabel: string | null,
): string {
  const refSuffix = scaleLabel ? ` ${scaleLabel}` : "";
  const ratio = primaryER / competitorER;
  const tie = ratio >= 0.95 && ratio <= 1.05;
  const strongerER = tie ? (primaryER + competitorER) / 2 : Math.max(primaryER, competitorER);
  const reading = classifyRatio(strongerER / benchmark);
  if (tie) {
    return `Os dois perfis estão em linha no envolvimento médio. ${reading.label}${refSuffix ? ` do escalão${refSuffix}` : ""}.`;
  }
  if (primaryER > competitorER) {
    const ppDelta = (primaryER - competitorER).toLocaleString("pt-PT", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `Este perfil lidera o envolvimento médio (+${ppDelta} pp). ${reading.label}${refSuffix ? ` do escalão${refSuffix}` : ""}.`;
  }
  const inverse = competitorER / primaryER;
  const mult = inverse.toLocaleString("pt-PT", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return `O concorrente gera ${mult}× mais envolvimento médio. ${reading.label}${refSuffix ? ` do escalão${refSuffix}` : ""}.`;
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