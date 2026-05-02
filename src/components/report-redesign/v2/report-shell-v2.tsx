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

import type {
  AdapterResult,
  SnapshotPayload,
} from "@/lib/report/snapshot-to-report-data";
import { cn } from "@/lib/utils";

import { ReportFramedBlock } from "../report-framed-block";
import { ReportMethodology } from "../report-methodology";
import { ReportTierTeaser } from "../report-tier-teaser";
import { REDESIGN_TOKENS } from "../report-tokens";

import { BLOCKS } from "./block-config";
import {
  ReportBlockSidebar,
  ReportBlockTopTabs,
} from "./report-block-nav";
import { ReportBlockSection } from "./report-block-section";
import { ReportHeroV2 } from "./report-hero-v2";
import { ReportOverviewBlock } from "./report-overview-block";
import { ReportDiagnosticBlock } from "./report-diagnostic-block";

interface ReportShellV2Props {
  result: AdapterResult;
  snapshotId: string;
  actions: ReportPageActions;
  payload?: SnapshotPayload;
  analyzedAtIso?: string | null;
}

/**
 * Phase 1A — orquestrador six-block para `/analyze/$username`.
 *
 * Reorganiza os componentes existentes em 6 blocos guiados por
 * perguntas humanas, com sidebar sticky no desktop e tabs
 * horizontais no mobile. Não modifica nenhum componente locked
 * — apenas os compõe numa nova hierarquia.
 *
 * O `ReportShell` original continua a existir e a ser válido para
 * rollback trivial.
 */
export function ReportShellV2({
  result,
  snapshotId,
  actions,
  payload,
  analyzedAtIso,
}: ReportShellV2Props) {
  const v2 = result.enriched.aiInsightsV2;

  /** Insight v2 dentro de um container já com padding (block content). */
  const renderInsight = (key: AiInsightV2Section) => {
    const item = v2?.sections[key];
    if (!item) return null;
    return <AIInsightBox insight={item.text} emphasis={item.emphasis} />;
  };

  const [overview, diagnostico, performance, conteudo, procura, benchmark] =
    BLOCKS;

  return (
    <ReportDataProvider data={result.data}>
      <div
        className={cn(
          REDESIGN_TOKENS.pageCanvas,
          "min-h-screen overflow-x-clip",
        )}
      >
        {/* Hero v2 (full-bleed, fora dos 6 blocos) */}
        <ReportHeroV2 result={result} actions={actions} />

        {/* Tabs mobile sticky abaixo do hero/posicionamento */}
        <ReportBlockTopTabs />

        {/* Layout 2-col a partir do bloco 01 */}
        <div className="mx-auto max-w-[1380px] px-5 md:px-6">
          <div className="flex gap-10 lg:gap-12 pt-6 lg:pt-10">
            <ReportBlockSidebar />
            <main className="min-w-0 flex-1">
              {/* 01 · Overview (redesigned) */}
              <ReportBlockSection block={overview} tone="canvas">
                <ReportOverviewBlock
                  result={result}
                  renderInsight={renderInsight}
                />
              </ReportBlockSection>

              {/* 02 · Diagnóstico editorial */}
              <ReportBlockSection block={diagnostico} tone="canvas">
                <ReportDiagnosticBlock result={result} payload={payload} />
              </ReportBlockSection>

              {/* 03 · Performance */}
              <ReportBlockSection block={performance} tone="canvas">
                <ReportFramedBlock
                  tone="canvas"
                  ariaLabel="Performance ao longo do tempo"
                >
                  <ReportTemporalChart />
                  <div className="mt-4">{renderInsight("evolutionChart")}</div>
                </ReportFramedBlock>
                <ReportFramedBlock
                  tone="canvas"
                  ariaLabel="Resposta da audiência"
                >
                  <div className="space-y-10 md:space-y-12">
                    <ReportPostingHeatmap />
                    <div className="mt-4">{renderInsight("heatmap")}</div>
                    <ReportBestDays />
                    <div className="mt-4">{renderInsight("daysOfWeek")}</div>
                  </div>
                </ReportFramedBlock>
              </ReportBlockSection>

              {/* 04 · Conteúdo */}
              <ReportBlockSection block={conteudo} tone="soft-blue">
                <ReportFramedBlock
                  tone="soft-blue"
                  ariaLabel="Top publicações"
                >
                  <div className="mt-6">
                    <ReportEnrichedTopLinks enriched={result.enriched} />
                  </div>
                </ReportFramedBlock>
                <ReportFramedBlock
                  tone="soft-blue"
                  ariaLabel="Mistura de formatos"
                >
                  <ReportFormatBreakdown />
                  <div className="mt-4">{renderInsight("formats")}</div>
                </ReportFramedBlock>
                <ReportFramedBlock
                  tone="soft-blue"
                  ariaLabel="Hashtags, palavras-chave e menções"
                >
                  <div className="space-y-10 md:space-y-12">
                    <ReportHashtagsKeywords />
                    <div className="mt-4">{renderInsight("language")}</div>
                    <ReportEnrichedMentions enriched={result.enriched} />
                  </div>
                </ReportFramedBlock>
              </ReportBlockSection>

              {/* 05 · Procura fora do Instagram */}
              <ReportBlockSection block={procura} tone="canvas">
                <p className="text-sm md:text-[15px] text-slate-600 leading-relaxed max-w-3xl">
                  O Instagram mostra como a audiência atual reage. A procura
                  fora da plataforma ajuda a perceber se os mesmos temas também
                  despertam interesse em pesquisa. Os valores atuais são
                  índices relativos do Google Trends, não volume absoluto de
                  pesquisas.
                </p>
                <ReportMarketSignalsSection
                  snapshotId={snapshotId}
                  plan="free"
                  cachedSummary={payload?.market_signals_free}
                  compact
                />
                {renderInsight("marketSignals")}
              </ReportBlockSection>

              {/* 06 · Benchmark competitivo */}
              <ReportBlockSection block={benchmark} tone="soft-blue">
                <ReportFramedBlock
                  tone="soft-blue"
                  ariaLabel="Posição face ao mercado"
                >
                  <ReportBenchmarkGauge />
                  <div className="mt-4">{renderInsight("benchmark")}</div>
                </ReportFramedBlock>
                <ReportFramedBlock
                  tone="soft-blue"
                  ariaLabel="Comparação com perfis pares"
                >
                  <ReportCompetitors />
                  {result.coverage.competitors === "empty" ? (
                    <div className="mt-6">
                      <ReportEnrichedCompetitorsCta />
                    </div>
                  ) : null}
                </ReportFramedBlock>
              </ReportBlockSection>
            </main>
          </div>
        </div>

        {/* Pós-blocos (mantêm-se fora da numeração 1–6) */}
        <ReportMethodology enriched={result.enriched} />
        <ReportTierTeaser />
        <TierComparisonBlock />
        <ReportFinalBlock snapshotId={snapshotId} result={result} />
        <BetaFeedbackBannerV2 />
      </div>
    </ReportDataProvider>
  );
}

/**
 * Cópia local do banner beta para evitar editar `report-shell.tsx`
 * (locked). Reutiliza `BETA_COPY.feedback` — mesma copy, mesmo visual.
 */
function BetaFeedbackBannerV2() {
  const { feedback } = BETA_COPY;
  return (
    <section
      aria-label="Feedback durante a fase beta"
      className="w-full bg-slate-50 border-t border-slate-200"
    >
      <div className="mx-auto max-w-[1380px] px-5 md:px-6 py-10 md:py-12">
        <div className="rounded-2xl border border-slate-200/70 bg-white p-6 md:p-8 flex flex-col gap-5 md:flex-row md:items-center md:justify-between shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="space-y-1.5 max-w-2xl">
            <p className="text-eyebrow text-blue-600">
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
