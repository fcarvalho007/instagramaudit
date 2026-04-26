import { SmilePlus, LayoutGrid, Calendar, Film } from "lucide-react";
import { ReportKpiCard } from "./report-kpi-card";
import { useReportData } from "./report-data-context";

export function ReportKeyMetrics() {
  const reportData = useReportData();
  const m = reportData.keyMetrics;
  const kpiSubtitle =
    reportData.meta?.kpiSubtitle ?? "janela de 30 dias";
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
      <ReportKpiCard
        icon={SmilePlus}
        tint="primary"
        label="Envolvimento médio"
        value={m.engagementRate.toString().replace(".", ",")}
        valueSuffix="%"
        trend={{
          value: `${m.engagementDeltaPct.toString().replace(".", ",")}% vs benchmark`,
          direction: "down",
        }}
        trendVariant="danger"
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
