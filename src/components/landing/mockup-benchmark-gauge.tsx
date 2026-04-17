interface MockupBenchmarkGaugeProps {
  value: number;
  benchmark: number;
  max: number;
}

export function MockupBenchmarkGauge({
  value,
  benchmark,
  max,
}: MockupBenchmarkGaugeProps) {
  const valuePercent = Math.min((value / max) * 100, 100);
  const benchmarkPercent = Math.min((benchmark / max) * 100, 100);

  return (
    <div className="space-y-3">
      <div className="relative h-2 rounded-full bg-surface-base/60 border border-border-subtle overflow-visible">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-accent-primary to-accent-luminous shadow-[0_0_8px_-2px_rgb(6_182_212_/_0.3)]"
          style={{ width: `${valuePercent}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-4 w-0.5 bg-content-tertiary"
          style={{ left: `${benchmarkPercent}%` }}
          aria-hidden="true"
        />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[0.625rem] uppercase tracking-wide text-content-tertiary">
            Atual
          </span>
          <span className="font-mono text-xs text-content-primary">
            {value.toFixed(2).replace(".", ",")}%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[0.625rem] uppercase tracking-wide text-content-tertiary">
            Benchmark
          </span>
          <span className="font-mono text-xs text-content-primary">
            {benchmark.toFixed(2).replace(".", ",")}%
          </span>
        </div>
      </div>
    </div>
  );
}
