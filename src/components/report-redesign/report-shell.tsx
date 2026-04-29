import { ReportDataProvider } from "@/components/report/report-data-context";
import { ReportTemporalChart } from "@/components/report/report-temporal-chart";
import { ReportBenchmarkGauge } from "@/components/report/report-benchmark-gauge";
import { ReportFormatBreakdown } from "@/components/report/report-format-breakdown";
import { ReportCompetitors } from "@/components/report/report-competitors";
import { ReportTopPosts } from "@/components/report/report-top-posts";
import { ReportPostingHeatmap } from "@/components/report/report-posting-heatmap";
import { ReportBestDays } from "@/components/report/report-best-days";
import { ReportHashtagsKeywords } from "@/components/report/report-hashtags-keywords";

import { ReportEnrichedTopLinks } from "@/components/report-enriched/report-enriched-top-links";
import { ReportEnrichedMentions } from "@/components/report-enriched/report-enriched-mentions";
import { ReportEnrichedCompetitorsCta } from "@/components/report-enriched/report-enriched-competitors-cta";

import { ReportMarketSignalsSection } from "@/components/report-market-signals/report-market-signals";
import { TierComparisonBlock } from "@/components/report-tier/tier-comparison-block";
import { ReportFinalBlock } from "@/components/report-share/report-final-block";
import type { ReportPageActions } from "@/components/report/report-page";
import { BETA_COPY } from "@/components/report-beta/beta-copy";
import { AIInsightBox } from "@/components/report/ai-insight-box";
import type { AiInsightV2Section } from "@/lib/insights/types";

import type { AdapterResult, SnapshotPayload } from "@/lib/report/snapshot-to-report-data";

import { ReportHero } from "./report-hero";
import { ReportExecutiveSummary } from "./report-executive-summary";
import { ReportSectionFrame } from "./report-section-frame";
import { ReportFramedBlock } from "./report-framed-block";
import { ReportAiReading } from "./report-ai-reading";
import { ReportPendingAiNotice } from "./report-pending-ai-notice";
import { ReportMethodology } from "./report-methodology";
import { ReportTierTeaser } from "./report-tier-teaser";
import { ReportEditorialPatterns } from "./report-editorial-patterns";
import { REDESIGN_TOKENS } from "./report-tokens";

interface ReportShellProps {
  result: AdapterResult;
  snapshotId: string;
  actions: ReportPageActions;
  /**
   * Raw snapshot payload as returned by `/api/public/analysis-snapshot`.
   * Used to short-circuit the market-signals fetch when a cached summary
   * already lives at `payload.market_signals_free`.
   */
  payload?: SnapshotPayload;
  /**
   * ISO timestamp de `meta.generated_at` — usado para mostrar o aviso
   * "leitura editorial em preparação" apenas em snapshots recentes
   * (< 5 min) sem `ai_insights_v1`.
   */
  analyzedAtIso?: string | null;
}

/**
 * Orquestrador novo, premium e analytics-first do relatório público
 * `/analyze/$username`. Compõe a nova hierarquia editorial reusando
 * componentes locked sem os modificar. `/report/example` continua a
 * usar o `ReportPage` locked completo.
 */
export function ReportShell({
  result,
  snapshotId,
  actions,
  payload,
  analyzedAtIso,
}: ReportShellProps) {
  const hasAiInsights = result.data.aiInsights.length > 0;
  const v2 = result.enriched.aiInsightsV2;
  /** Caixa de insight em secção full-bleed (hero, market signals). */
  const renderInsightOuter = (key: AiInsightV2Section) => {
    const item = v2?.sections[key];
    if (!item) return null;
    return (
      <div className="mx-auto max-w-7xl px-5 md:px-6 mt-4">
        <AIInsightBox insight={item.text} emphasis={item.emphasis} />
      </div>
    );
  };
  /** Caixa de insight dentro de um `ReportFramedBlock` (já em container). */
  const renderInsightInner = (key: AiInsightV2Section) => {
    const item = v2?.sections[key];
    if (!item) return null;
    return (
      <div className="mt-4">
        <AIInsightBox insight={item.text} emphasis={item.emphasis} />
      </div>
    );
  };
  return (
    <ReportDataProvider data={result.data}>
      <div className={`${REDESIGN_TOKENS.pageCanvas} min-h-screen overflow-x-hidden`}>
        {/* 1. Hero premium */}
        <ReportHero result={result} actions={actions} />
        {renderInsightOuter("hero")}

        {/* 2. KPI grid (5 cards) */}
        <ReportExecutiveSummary result={result} />

        {/* 3. Strategic AI reading — ou aviso de "a preparar" para snapshots recentes */}
        {hasAiInsights ? (
          <ReportAiReading data={result.data} enriched={result.enriched} />
        ) : (
          <ReportPendingAiNotice generatedAtIso={analyzedAtIso ?? null} />
        )}

        {/* 4. Procura de mercado (Market Signals) — section wrapper hides
            itself silently when the snapshot reports disabled/blocked. */}
        <ReportMarketSignalsSection
          snapshotId={snapshotId}
          plan="free"
          cachedSummary={payload?.market_signals_free}
        />
        {renderInsightOuter("marketSignals")}

        {/* 4b. Padrões editoriais (R4-B / Prompt 18) — cruzamentos derivados
            que explicam PORQUÊ os resultados são o que são. */}
        <ReportEditorialPatterns patterns={result.enriched.editorialPatterns} />

        {/* 5. Performance ao longo do tempo */}
        <ReportFramedBlock tone="canvas" ariaLabel="Performance ao longo do tempo">
          <ReportTemporalChart />
          {renderInsightInner("evolutionChart")}
        </ReportFramedBlock>

        {/* 6. Benchmark + formatos */}
        <ReportFramedBlock tone="soft-blue" ariaLabel="Benchmark e formatos">
          <div className="space-y-10 md:space-y-12">
            <ReportBenchmarkGauge />
            {renderInsightInner("benchmark")}
            <ReportFormatBreakdown />
            {renderInsightInner("formats")}
          </div>
        </ReportFramedBlock>

        {/* 7. Concorrentes */}
        <ReportFramedBlock tone="canvas" ariaLabel="Comparação com perfis pares">
          <ReportCompetitors />
          {result.coverage.competitors === "empty" ? (
            <div className="mt-6">
              <ReportEnrichedCompetitorsCta />
            </div>
          ) : null}
        </ReportFramedBlock>

        {/* 8. Top posts */}
        <ReportFramedBlock tone="soft-blue" ariaLabel="Top publicações">
          <ReportTopPosts />
          {renderInsightInner("topPosts")}
          <div className="mt-6">
            <ReportEnrichedTopLinks enriched={result.enriched} />
          </div>
        </ReportFramedBlock>

        {/* 9. Resposta da audiência */}
        <ReportFramedBlock tone="canvas" ariaLabel="Resposta da audiência">
          <div className="space-y-10 md:space-y-12">
            <ReportPostingHeatmap />
            {renderInsightInner("heatmap")}
            <ReportBestDays />
            {renderInsightInner("daysOfWeek")}
          </div>
        </ReportFramedBlock>

        {/* 10. Hashtags + palavras-chave + menções */}
        <ReportFramedBlock tone="soft-blue" ariaLabel="Hashtags, palavras-chave e menções">
          <div className="space-y-10 md:space-y-12">
            <ReportHashtagsKeywords />
            {renderInsightInner("language")}
            <ReportEnrichedMentions enriched={result.enriched} />
          </div>
        </ReportFramedBlock>

        {/* 11. Metodologia */}
        <ReportMethodology enriched={result.enriched} />

        {/* 12. Teaser Free vs Pro + bloco completo (âncora) */}
        <ReportTierTeaser />
        <TierComparisonBlock />

        {/* 13. Bloco final */}
        <ReportFinalBlock snapshotId={snapshotId} result={result} />

        {/* 14. Banner de feedback beta — full-width antes do footer */}
        <BetaFeedbackBanner />
      </div>
    </ReportDataProvider>
  );
}

function BetaFeedbackBanner() {
  const { feedback } = BETA_COPY;
  return (
    <section
      aria-label="Feedback durante a fase beta"
      className="w-full bg-slate-50 border-t border-slate-200"
    >
      <div className="mx-auto max-w-7xl px-5 md:px-6 py-10 md:py-12">
        <div className="rounded-2xl border border-slate-200/70 bg-white p-6 md:p-8 flex flex-col gap-5 md:flex-row md:items-center md:justify-between shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="space-y-1.5 max-w-2xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-blue-600">
              {feedback.eyebrow}
            </p>
            <p className="text-sm md:text-base text-slate-700 leading-relaxed">
              {feedback.subtitle}
            </p>
          </div>
          <a
            href={feedback.action.href}
            className="shrink-0 inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-slate-700 min-h-[44px]"
          >
            {feedback.action.label}
            <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </section>
  );
}
