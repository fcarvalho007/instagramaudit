import { SmilePlus, LayoutGrid, Calendar, Film } from "lucide-react";
import { ReportKpiCard } from "./report-kpi-card";
import { useReportData } from "./report-data-context";

export function ReportKeyMetrics() {
  const reportData = useReportData();
  const m = reportData.keyMetrics;
  const kpiSubtitle =
    reportData.meta?.kpiSubtitle ?? "janela de 30 dias";

  // Engagement KPI trend chip: derived from the actual delta sign rather than
  // hardcoded. When no benchmark is available (mostly real-data preview with
  // missing reference) we degrade gracefully to a neutral "sem benchmark"
  // chip instead of the misleading "0% vs benchmark" red arrow.
  const hasBenchmark = m.engagementBenchmark > 0;
  const delta = m.engagementDeltaPct;
  const trendDirection: "up" | "down" = delta >= 0 ? "up" : "down";
  const trendVariant: "success" | "danger" | "neutral" = !hasBenchmark
    ? "neutral"
    : delta >= 0
      ? "success"
      : "danger";
  const trendValue = hasBenchmark
    ? `${delta.toString().replace(".", ",")}% vs benchmark`
    : "Sem benchmark disponível";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
      <ReportKpiCard
        icon={SmilePlus}
        tint="primary"
        label="Envolvimento médio"
        value={m.engagementRate.toString().replace(".", ",")}
        valueSuffix="%"
        trend={{
          value: trendValue,
          direction: trendDirection,
        }}
        trendVariant={trendVariant}
      />
      <ReportKpiCard
        icon={LayoutGrid}
        tint="neutral"
        label="Publicações analisadas"
        value={m.postsAnalyzed.toString()}
        subtitle={kpiSubtitle}
      />
      <ReportKpiCard
        icon={Calendar}
        tint="indigo"
        label="Frequência semanal"
        value={m.postingFrequencyWeekly.toString().replace(".", ",")}
        subtitle="por semana"
      />
      <ReportKpiCard
        icon={Film}
        tint="cyan"
        label="Formato dominante"
        value={m.dominantFormat}
        subtitle={`${m.dominantFormatShare}% do conteúdo`}
      />
    </div>
  );
}
