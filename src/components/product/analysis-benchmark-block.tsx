import { Badge } from "@/components/ui/badge";
import { getPositionStatusLabel } from "@/lib/benchmark/engine";
import type {
  BenchmarkPositioning,
  PositionStatus,
} from "@/lib/benchmark/types";
import { formatPercent } from "@/lib/mock-analysis";

interface AnalysisBenchmarkBlockProps {
  positioning: BenchmarkPositioning;
}

const STATUS_VARIANT: Record<
  PositionStatus,
  "success" | "warning" | "default"
> = {
  above: "success",
  aligned: "default",
  below: "warning",
};

function formatSignedPercent(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  const abs = Math.abs(value).toFixed(1).replace(".", ",");
  return `${sign}${abs}%`;
}

export function AnalysisBenchmarkBlock({
  positioning,
}: AnalysisBenchmarkBlockProps) {
  if (positioning.status === "unavailable") {
    return (
      <section
        aria-labelledby="benchmark-heading"
        className="rounded-xl border border-border-subtle bg-surface-secondary p-5 md:p-6 space-y-4"
      >
        <header className="flex flex-col gap-1">
          <span className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-content-tertiary">
            Benchmark
          </span>
          <h2
            id="benchmark-heading"
            className="font-display text-lg font-medium text-content-primary tracking-tight"
          >
            Posicionamento face ao benchmark
          </h2>
        </header>
        <p className="font-sans text-sm text-content-secondary leading-relaxed">
          Não foi possível calcular o benchmark neste momento. A comparação será
          apresentada assim que os dados estiverem disponíveis.
        </p>
      </section>
    );
  }

  const {
    accountTierLabel,
    dominantFormat,
    benchmarkValue,
    profileValue,
    differencePercent,
    positionStatus,
    shortExplanation,
  } = positioning;

  const max = Math.max(profileValue, benchmarkValue) * 1.4;
  const valuePercent = Math.min((profileValue / max) * 100, 100);
  const benchmarkPercent = Math.min((benchmarkValue / max) * 100, 100);
  const statusLabel = getPositionStatusLabel(positionStatus);

  return (
    <section
      aria-labelledby="benchmark-heading"
      className="rounded-xl border border-border-subtle bg-surface-secondary p-5 md:p-6 space-y-5"
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-content-tertiary">
            {`Benchmark · ${dominantFormat} · ${accountTierLabel}`}
          </span>
          <h2
            id="benchmark-heading"
            className="font-display text-lg font-medium text-content-primary tracking-tight"
          >
            Posicionamento face ao benchmark
          </h2>
          <p className="font-sans text-xs text-content-tertiary">
            Comparação com contas do mesmo escalão e formato dominante.
          </p>
        </div>
        <Badge variant={STATUS_VARIANT[positionStatus]} size="md" className="shrink-0">
          {statusLabel}
        </Badge>
      </header>

      <div className="space-y-3">
        <div
          className="relative h-2.5 rounded-full bg-surface-elevated border border-border-subtle overflow-visible"
          role="img"
          aria-label={`Envolvimento de ${formatPercent(profileValue)} face a benchmark de ${formatPercent(benchmarkValue)}`}
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
              {formatPercent(profileValue)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-px bg-content-secondary" aria-hidden="true" />
            <span className="font-mono text-[0.625rem] uppercase tracking-wide text-content-tertiary">
              Benchmark
            </span>
            <span className="font-mono text-sm text-content-primary">
              {formatPercent(benchmarkValue)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[0.625rem] uppercase tracking-wide text-content-tertiary">
              Δ
            </span>
            <span className="font-mono text-sm text-content-primary">
              {formatSignedPercent(differencePercent)}
            </span>
          </div>
        </div>
      </div>

      <p className="font-sans text-sm text-content-secondary leading-relaxed">
        {shortExplanation}
      </p>
    </section>
  );
}
