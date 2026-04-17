import { cn } from "@/lib/utils";
import {
  formatPercent,
  type AnalysisCompetitor,
} from "@/lib/mock-analysis";

interface AnalysisCompetitorComparisonProps {
  competitors: AnalysisCompetitor[];
}

export function AnalysisCompetitorComparison({
  competitors,
}: AnalysisCompetitorComparisonProps) {
  const max = Math.max(...competitors.map((c) => c.engagement)) * 1.15;

  return (
    <section
      aria-labelledby="competitors-heading"
      className="rounded-xl border border-border-subtle bg-surface-secondary p-5 md:p-6 space-y-5"
    >
      <header className="flex flex-col gap-1">
        <span className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-content-tertiary">
          Envolvimento médio · últimos 30 dias
        </span>
        <h2
          id="competitors-heading"
          className="font-display text-lg font-medium text-content-primary tracking-tight"
        >
          Comparação com concorrentes
        </h2>
      </header>

      <ul className="space-y-3">
        {competitors.map((row) => {
          const widthPct = Math.min((row.engagement / max) * 100, 100);
          return (
            <li
              key={row.handle}
              className="grid grid-cols-[minmax(0,1fr)_72px] sm:grid-cols-[180px_1fr_72px] gap-3 sm:gap-4 items-center"
            >
              <div className="flex items-center gap-2 min-w-0 sm:col-span-1 col-span-2">
                {row.isSelf ? (
                  <span
                    className="size-1.5 rounded-full bg-accent-luminous shrink-0"
                    aria-hidden="true"
                  />
                ) : (
                  <span
                    className="size-1.5 rounded-full bg-content-tertiary shrink-0"
                    aria-hidden="true"
                  />
                )}
                <span
                  className={cn(
                    "font-mono text-sm truncate",
                    row.isSelf
                      ? "text-content-primary font-semibold"
                      : "text-content-secondary",
                  )}
                >
                  @{row.handle}
                </span>
                {row.isSelf ? (
                  <span className="font-mono text-[0.5625rem] uppercase tracking-wider text-accent-luminous shrink-0">
                    Perfil
                  </span>
                ) : null}
              </div>
              <div className="hidden sm:block relative h-2 rounded-full bg-surface-elevated border border-border-subtle overflow-hidden">
                <div
                  className={cn(
                    "absolute inset-y-0 left-0 h-full rounded-full",
                    row.isSelf
                      ? "bg-gradient-to-r from-accent-violet via-accent-violet-luminous to-accent-luminous shadow-[0_0_12px_-2px_rgb(139_92_246_/_0.5)]"
                      : "bg-content-tertiary/50",
                  )}
                  style={{ width: `${widthPct}%` }}
                />
              </div>
              <div className="sm:hidden col-span-2 relative h-2 rounded-full bg-surface-elevated border border-border-subtle overflow-hidden">
                <div
                  className={cn(
                    "absolute inset-y-0 left-0 h-full rounded-full",
                    row.isSelf
                      ? "bg-gradient-to-r from-accent-violet via-accent-violet-luminous to-accent-luminous"
                      : "bg-content-tertiary/50",
                  )}
                  style={{ width: `${widthPct}%` }}
                />
              </div>
              <span
                className={cn(
                  "font-mono text-sm text-right",
                  row.isSelf
                    ? "text-content-primary font-semibold"
                    : "text-content-secondary",
                )}
              >
                {formatPercent(row.engagement)}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
