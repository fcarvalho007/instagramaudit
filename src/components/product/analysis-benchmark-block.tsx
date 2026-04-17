import { Badge } from "@/components/ui/badge";
import {
  formatPercent,
  type AnalysisBenchmark,
} from "@/lib/mock-analysis";

interface AnalysisBenchmarkBlockProps {
  benchmark: AnalysisBenchmark;
}

const POSITION_VARIANT: Record<
  AnalysisBenchmark["position"],
  { variant: "success" | "warning" | "default"; label: string }
> = {
  above: { variant: "success", label: "Acima do benchmark" },
  on: { variant: "default", label: "Em linha" },
  below: { variant: "warning", label: "Abaixo do benchmark" },
};

export function AnalysisBenchmarkBlock({
  benchmark,
}: AnalysisBenchmarkBlockProps) {
  const { value, reference, max, position, helperText, formatLabel } = benchmark;
  const valuePercent = Math.min((value / max) * 100, 100);
  const benchmarkPercent = Math.min((reference / max) * 100, 100);
  const positionMeta = POSITION_VARIANT[position];

  return (
    <section
      aria-labelledby="benchmark-heading"
      className="rounded-xl border border-border-subtle bg-surface-secondary p-5 md:p-6 space-y-5"
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-content-tertiary">
            {formatLabel}
          </span>
          <h2
            id="benchmark-heading"
            className="font-display text-lg font-medium text-content-primary tracking-tight"
          >
            Posicionamento face ao benchmark
          </h2>
        </div>
        <Badge variant={positionMeta.variant} size="md" className="shrink-0">
          {positionMeta.label}
        </Badge>
      </header>

      <div className="space-y-3">
        <div
          className="relative h-2.5 rounded-full bg-surface-elevated border border-border-subtle overflow-visible"
          role="img"
          aria-label={`Envolvimento de ${formatPercent(value)} face a referência de ${formatPercent(reference)}`}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-accent-primary to-accent-luminous shadow-[0_0_12px_-2px_rgb(6_182_212_/_0.5)]"
            style={{ width: `${valuePercent}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-5 w-px bg-content-secondary"
            style={{ left: `${benchmarkPercent}%` }}
            aria-hidden="true"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-accent-luminous" aria-hidden="true" />
            <span className="font-mono text-[0.625rem] uppercase tracking-wide text-content-tertiary">
              Atual
            </span>
            <span className="font-mono text-sm text-content-primary">
              {formatPercent(value)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-px bg-content-secondary" aria-hidden="true" />
            <span className="font-mono text-[0.625rem] uppercase tracking-wide text-content-tertiary">
              Benchmark
            </span>
            <span className="font-mono text-sm text-content-primary">
              {formatPercent(reference)}
            </span>
          </div>
        </div>
      </div>

      <p className="font-sans text-sm text-content-secondary leading-relaxed">
        {helperText}
      </p>
    </section>
  );
}
