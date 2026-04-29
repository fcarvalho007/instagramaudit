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
import { AIInsightBox } from "./ai-insight-box";
import { AI_INSIGHTS_MOCK } from "@/lib/report/ai-insights-mock";

export interface ReportPageActions {
  onExportPdf?: () => void;
  onShare?: () => void;
  pdfBusy?: boolean;
  pdfDisabled?: boolean;
  shareBusy?: boolean;
}

export function ReportPage({
  data,
  actions,
}: {
  data?: ReportData;
  actions?: ReportPageActions;
} = {}) {
  const content = (
    <div className="bg-surface-base min-h-screen">
      <Container size="xl">
        <div className="py-8 md:py-12 space-y-12 md:space-y-14">
          <ReportHeader actions={actions} />
          <ReportKeyMetrics />
          <AIInsightBox
            insight={AI_INSIGHTS_MOCK.hero.text}
            emphasis={AI_INSIGHTS_MOCK.hero.emphasis}
          />
          <ReportTemporalChart />
          <AIInsightBox
            insight={AI_INSIGHTS_MOCK.temporal.text}
            emphasis={AI_INSIGHTS_MOCK.temporal.emphasis}
          />
          <AIInsightBox
            insight={AI_INSIGHTS_MOCK.marketSignals.text}
            emphasis={AI_INSIGHTS_MOCK.marketSignals.emphasis}
          />
          <ReportBenchmarkGauge />
          <AIInsightBox
            insight={AI_INSIGHTS_MOCK.benchmark.text}
            emphasis={AI_INSIGHTS_MOCK.benchmark.emphasis}
          />
          <ReportFormatBreakdown />
          <AIInsightBox
            insight={AI_INSIGHTS_MOCK.format.text}
            emphasis={AI_INSIGHTS_MOCK.format.emphasis}
          />
          <ReportCompetitors />
          <ReportTopPosts />
          <AIInsightBox
            insight={AI_INSIGHTS_MOCK.topPosts.text}
            emphasis={AI_INSIGHTS_MOCK.topPosts.emphasis}
          />
          <ReportPostingHeatmap />
          <AIInsightBox
            insight={AI_INSIGHTS_MOCK.heatmap.text}
            emphasis={AI_INSIGHTS_MOCK.heatmap.emphasis}
          />
          <ReportBestDays />
          <AIInsightBox
            insight={AI_INSIGHTS_MOCK.bestDays.text}
            emphasis={AI_INSIGHTS_MOCK.bestDays.emphasis}
          />
          <ReportHashtagsKeywords />
          <AIInsightBox
            insight={AI_INSIGHTS_MOCK.hashtagsKeywords.text}
            emphasis={AI_INSIGHTS_MOCK.hashtagsKeywords.emphasis}
          />
          <ReportAiInsights />
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
