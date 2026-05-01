import { ReportSection } from "./report-section";
import { useReportData } from "./report-data-context";
import { ArrowRight } from "lucide-react";
import { ReportEngagementHistory } from "@/components/report-redesign/report-engagement-history";

export function ReportBenchmarkGauge() {
  const reportData = useReportData();
  const m = reportData.keyMetrics;
  const isAdminPreview = reportData.meta?.isAdminPreview ?? false;
  const hasBenchmark = m.engagementBenchmark > 0;

  // No benchmark in admin preview → hide the section so we don't render an
  // empty gauge with a marker pinned at 0%. The CoverageNotice explains why.
  // Outside admin preview (mock) the benchmark is always present.
  if (!hasBenchmark && isAdminPreview) {
    return null;
  }

  // Anchor the gauge to the benchmark (always at 100%). The actual value is
  // a percentage of the benchmark, capped at 120% so an outlier still
  // remains visible inside the track.
  const benchPct = 80;
  const ratio = m.engagementBenchmark > 0 ? m.engagementRate / m.engagementBenchmark : 0;
  const valuePct = Math.min(Math.max(ratio * benchPct, 2), 118);
  const delta = m.engagementDeltaPct;
  const deltaPp = m.engagementRate - m.engagementBenchmark;

  // Status (matches the engine's ±10% rule used elsewhere).
  const status: "acima" | "ligeiramente-acima" | "abaixo" =
    delta > 10 ? "acima" : delta > 0 ? "ligeiramente-acima" : "abaixo";
  const badgeStyles =
    status === "abaixo"
      ? {
          wrap: "bg-tint-danger border-signal-danger/30",
          dot: "bg-signal-danger",
          text: "text-signal-danger",
          label: "Abaixo do benchmark",
        }
      : {
          wrap: "bg-tint-success border-signal-success/30",
          dot: "bg-signal-success",
          text: "text-signal-success",
          label:
            status === "acima"
              ? "Acima do benchmark"
              : "Ligeiramente acima do benchmark",
        };

  const badge = (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${badgeStyles.wrap}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${badgeStyles.dot}`} />
      <span
        className={`font-mono text-[10px] uppercase tracking-wider font-semibold ${badgeStyles.text}`}
      >
        {badgeStyles.label}
      </span>
    </span>
  );

  const deltaColorClass =
    status === "abaixo" ? "text-signal-danger" : "text-signal-success";
  const deltaSign = delta >= 0 ? "+" : "−";
  const absDelta = Math.abs(delta).toString().replace(".", ",");
  const absDeltaPp = Math.abs(deltaPp).toFixed(2).replace(".", ",");

  return (
    <ReportSection
      label={`Benchmark · Reels · ${reportData.profile.tier} (${reportData.profile.tierRange})`}
      title="Posicionamento face ao benchmark"
      subtitle="Comparação com contas do mesmo escalão e formato dominante."
      action={badge}
    >
      <div className="bg-surface-secondary border border-border-default rounded-2xl shadow-card p-7 md:p-9">
        {/* Horizontal gauge */}
        <div className="relative pt-12 pb-14">
          {/* Track with semantic gradient: danger → warning → success */}
          <div
            className="relative h-2 w-full rounded-full overflow-visible"
            style={{
              background:
                "linear-gradient(90deg, rgb(var(--signal-danger) / 0.55) 0%, rgb(var(--signal-warning) / 0.55) 50%, rgb(var(--signal-success) / 0.55) 100%)",
            }}
          >
            {/* Marker — Atual */}
            <div
              className="absolute -top-12 -translate-x-1/2 flex flex-col items-center gap-1"
              style={{ left: `${valuePct}%` }}
            >
              <span className="text-eyebrow-sm font-semibold text-content-secondary whitespace-nowrap">
                Atual
              </span>
              <span className="block h-2.5 w-2.5 rounded-full bg-content-primary ring-4 ring-surface-secondary" />
            </div>
            <div
              className="absolute top-3 -translate-x-1/2 flex flex-col items-center"
              style={{ left: `${valuePct}%` }}
            >
              <span className="block h-3 w-px bg-content-primary/40" />
              <span className="mt-1 font-sans text-[15px] font-medium text-content-primary whitespace-nowrap">
                {m.engagementRate.toString().replace(".", ",")}%
              </span>
            </div>

            {/* Marker — Benchmark */}
            <div
              className="absolute -top-12 -translate-x-1/2 flex flex-col items-center gap-1"
              style={{ left: `${benchPct}%` }}
            >
              <span className="text-eyebrow-sm font-semibold text-content-tertiary whitespace-nowrap">
                Benchmark
              </span>
              <span className="block h-3 w-[2px] rounded-full bg-content-tertiary" />
            </div>
            <div
              className="absolute top-3 -translate-x-1/2 flex flex-col items-center"
              style={{ left: `${benchPct}%` }}
            >
              <span className="block h-3 w-px bg-content-tertiary/40" />
              <span className="mt-1 font-sans text-[15px] font-medium text-content-tertiary whitespace-nowrap">
                {m.engagementBenchmark.toString().replace(".", ",")}%
              </span>
            </div>
          </div>
        </div>

        {/* Gap summary */}
        <div className="flex items-center justify-center gap-2 pt-2">
          <span className="text-eyebrow-sm font-semibold text-content-secondary">
            Gap
          </span>
          <ArrowRight className="size-3.5 text-content-tertiary" />
          <span className={`font-sans text-[15px] font-medium ${deltaColorClass}`}>
            {deltaSign}
            {absDeltaPp}pp
          </span>
          <span className="font-mono text-xs text-content-tertiary">
            ({deltaSign}
            {absDelta}%)
          </span>
        </div>

        {/* Mini-histórico das últimas análises */}
        {reportData.profile.username ? (
          <ReportEngagementHistory
            handle={reportData.profile.username}
            current={m.engagementRate}
          />
        ) : null}
      </div>
    </ReportSection>
  );
}
