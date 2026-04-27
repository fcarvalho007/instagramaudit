import { Container } from "@/components/layout/container";
import { ReportHeader } from "./report-header";
import { ReportKeyMetrics } from "./report-key-metrics";
import { ReportTemporalChart } from "./report-temporal-chart";
import { ReportBenchmarkGauge } from "./report-benchmark-gauge";
import { ReportFormatBreakdown } from "./report-format-breakdown";
import { ReportCompetitors } from "./report-competitors";
import { ReportTopPosts } from "./report-top-posts";
import { ReportPostingHeatmap } from "./report-posting-heatmap";
import { ReportBestDays } from "./report-best-days";
import { ReportHashtagsKeywords } from "./report-hashtags-keywords";
import { ReportAiInsights } from "./report-ai-insights";
import { ReportFooter } from "./report-footer";
import { ReportDataProvider } from "./report-data-context";
import type { ReportData } from "./report-mock-data";

interface ReportPageProps {
  data?: ReportData;
  /**
   * When true, the AI insights section is hidden if `aiInsights` is empty
   * instead of showing the editorial empty-state. Used by the public
   * `/analyze/$username` flow to keep the layout clean while the AI engine
   * is not yet generating real insights.
   */
  hideEmptyAiInsights?: boolean;
}

export function ReportPage({
  data,
  hideEmptyAiInsights = false,
}: ReportPageProps = {}) {
  const aiInsights = data?.aiInsights ?? [];
  const showAi = !(hideEmptyAiInsights && aiInsights.length === 0);
  const content = (
    <div className="bg-surface-base min-h-screen">
      <Container size="xl">
        <div className="py-8 md:py-12 space-y-10 md:space-y-12">
          <ReportHeader />
          <ReportKeyMetrics />
          <ReportTemporalChart />
          <ReportBenchmarkGauge />
          <ReportFormatBreakdown />
          <ReportCompetitors />
          <ReportTopPosts />
          <ReportPostingHeatmap />
          <ReportBestDays />
          <ReportHashtagsKeywords />
          {showAi ? <ReportAiInsights /> : null}
          <ReportFooter />
        </div>
      </Container>
    </div>
  );

  if (data) {
    return <ReportDataProvider data={data}>{content}</ReportDataProvider>;
  }
  return content;
}
