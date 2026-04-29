import { Container } from "@/components/layout/container";
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
import { ReportEnrichedBenchmarkSource } from "@/components/report-enriched/report-enriched-benchmark-source";

import { ReportMarketSignalsSection } from "@/components/report-market-signals/report-market-signals";
import { TierComparisonBlock } from "@/components/report-tier/tier-comparison-block";
import { ReportFinalBlock } from "@/components/report-share/report-final-block";
import type { ReportPageActions } from "@/components/report/report-page";

import type { AdapterResult, SnapshotPayload } from "@/lib/report/snapshot-to-report-data";

import { ReportHero } from "./report-hero";
import { ReportExecutiveSummary } from "./report-executive-summary";
import { ReportSectionFrame } from "./report-section-frame";
import { ReportAiReading } from "./report-ai-reading";
import { ReportMethodology } from "./report-methodology";
import { ReportTierTeaser } from "./report-tier-teaser";
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
}

/**
 * Orquestrador novo, premium e analytics-first do relatório público
 * `/analyze/$username`. Compõe a nova hierarquia editorial reusando
 * componentes locked sem os modificar. `/report/example` continua a
 * usar o `ReportPage` locked completo.
 */
export function ReportShell({ result, snapshotId, actions, payload }: ReportShellProps) {
  return (
    <ReportDataProvider data={result.data}>
      <div className={`${REDESIGN_TOKENS.pageCanvas} min-h-screen`}>
        {/* 1. Hero premium */}
        <ReportHero result={result} actions={actions} />

        {/* 2. KPI grid (5 cards) */}
        <ReportExecutiveSummary result={result} />

        {/* 3. Strategic AI reading */}
        <ReportAiReading data={result.data} enriched={result.enriched} />

        {/* 4. Procura de mercado (Market Signals) — section wrapper hides
            itself silently when the snapshot reports disabled/blocked. */}
        <ReportMarketSignalsSection
          snapshotId={snapshotId}
          plan="free"
          cachedSummary={payload?.market_signals_free}
        />

        {/* 5. Performance ao longo do tempo */}
        <ReportSectionFrame
          eyebrow="Performance · ao longo do tempo"
          title="Como o envolvimento evoluiu"
          subtitle="Curvas de likes, comentários e engagement na janela analisada."
          tone="plain"
          framed
        >
          <ReportTemporalChart />
        </ReportSectionFrame>

        {/* 6. Benchmark + formatos */}
        <ReportSectionFrame
          eyebrow="Benchmark · referência de mercado"
          title="Diferença face à referência"
          subtitle="Onde o perfil se posiciona em relação a perfis pares e como cada formato contribui para o envolvimento."
          tone="soft-blue"
          framed
        >
          <div className="space-y-10 md:space-y-12">
            <ReportBenchmarkGauge />
            <ReportFormatBreakdown />
          </div>
        </ReportSectionFrame>

        {/* 7. Concorrentes */}
        <ReportSectionFrame
          eyebrow="Concorrentes"
          title="Comparação com perfis pares"
          tone="plain"
          framed
        >
          <ReportCompetitors />
          {result.coverage.competitors === "empty" ? (
            <div className="mt-6">
              <ReportEnrichedCompetitorsCta />
            </div>
          ) : null}
        </ReportSectionFrame>

        {/* 8. Top posts */}
        <ReportSectionFrame
          eyebrow="Top publicações"
          title="As publicações com maior envolvimento"
          subtitle="Cada card abre o conteúdo original no Instagram numa nova aba."
          tone="soft-blue"
          framed
        >
          <ReportTopPosts />
          <div className="mt-6">
            <ReportEnrichedTopLinks enriched={result.enriched} />
          </div>
        </ReportSectionFrame>

        {/* 9. Resposta da audiência */}
        <ReportSectionFrame
          eyebrow="Resposta da audiência"
          title="Quando a audiência mais responde"
          subtitle="Padrão de horário e dia da semana, com base na amostra observada."
          tone="plain"
          framed
        >
          <div className="space-y-10 md:space-y-12">
            <ReportPostingHeatmap />
            <ReportBestDays />
          </div>
        </ReportSectionFrame>

        {/* 10. Hashtags + palavras-chave + menções */}
        <ReportSectionFrame
          eyebrow="Linguagem"
          title="Hashtags, palavras-chave e contas mencionadas"
          subtitle="O que o perfil diz e a quem se refere com mais frequência."
          tone="soft-blue"
          framed
        >
          <div className="space-y-10 md:space-y-12">
            <ReportHashtagsKeywords />
            <ReportEnrichedMentions enriched={result.enriched} />
          </div>
        </ReportSectionFrame>

        {/* 11. Metodologia */}
        <ReportMethodology />
        <Container size="xl">
          <ReportEnrichedBenchmarkSource enriched={result.enriched} />
        </Container>

        {/* 12. Teaser Free vs Pro + bloco completo (âncora) */}
        <ReportTierTeaser />
        <TierComparisonBlock />

        {/* 13. Bloco final */}
        <ReportFinalBlock snapshotId={snapshotId} result={result} />
      </div>
    </ReportDataProvider>
  );
}
