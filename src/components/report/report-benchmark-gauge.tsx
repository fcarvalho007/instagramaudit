import { ReportSection } from "./report-section";
import { useReportData } from "./report-data-context";

export function ReportBenchmarkGauge() {
  const reportData = useReportData();
  const m = reportData.keyMetrics;
  const max = Math.max(m.engagementRate, m.engagementBenchmark) * 1.6;
  const valuePct = (m.engagementRate / max) * 100;
  const benchPct = (m.engagementBenchmark / max) * 100;

  const badge = (
    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-tint-warning border border-signal-warning/30">
      <span className="h-1.5 w-1.5 rounded-full bg-signal-warning" />
      <span className="font-mono text-[10px] uppercase tracking-wider text-signal-warning font-semibold">
        Abaixo do benchmark
      </span>
    </span>
  );

  return (
    <ReportSection
      label={`Benchmark · Reels · ${reportData.profile.tier} (${reportData.profile.tierRange})`}
      title="Posicionamento face ao benchmark"
      subtitle="Comparação com contas do mesmo escalão e formato dominante."
      action={badge}
    >
      <div className="bg-surface-secondary border border-border-default/40 rounded-xl shadow-card p-6 md:p-8">
        <div className="relative h-3 w-full rounded-full bg-surface-muted overflow-hidden">
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-indigo-400 via-blue-500 to-cyan-400"
            style={{
              width: `${valuePct}%`,
              boxShadow: "0 0 12px rgb(59 130 246 / 0.35)",
            }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 h-5 w-0.5 bg-content-primary rounded-full"
            style={{ left: `calc(${benchPct}% - 1px)` }}
            aria-label="Benchmark"
          />
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-accent-primary" />
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-content-tertiary">
                Atual
              </p>
              <p className="font-display text-lg text-content-primary">
                {m.engagementRate.toString().replace(".", ",")}%
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:justify-center">
            <span className="h-3 w-0.5 bg-content-primary rounded-full" />
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-content-tertiary">
                Benchmark
              </p>
              <p className="font-display text-lg text-content-primary">
                {m.engagementBenchmark.toString().replace(".", ",")}%
              </p>
            </div>
          </div>
          <div className="sm:text-right">
            <p className="font-mono text-[10px] uppercase tracking-wider text-content-tertiary">
              Δ
            </p>
            <p className="font-display text-lg text-signal-danger">
              {m.engagementDeltaPct.toString().replace(".", ",")}%
            </p>
          </div>
        </div>

        <p className="text-sm text-content-secondary leading-relaxed pt-6 mt-6 border-t border-border-subtle/30">
          O envolvimento médio do perfil situa-se{" "}
          <span className="text-content-primary font-medium">
            55% abaixo do benchmark
          </span>{" "}
          de contas Micro com Reels como formato dominante. A causa principal
          encontra-se na performance individual de cada Reel, detalhada na
          secção seguinte.
        </p>
      </div>
    </ReportSection>
  );
}
