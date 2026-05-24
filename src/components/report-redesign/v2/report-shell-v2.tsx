import { ReportDataProvider } from "@/components/report/report-data-context";
import { ReportTemporalChart } from "@/components/report/report-temporal-chart";
import { ReportBenchmarkGauge } from "@/components/report/report-benchmark-gauge";
import { ReportFormatBreakdown } from "@/components/report/report-format-breakdown";
import { ReportCompetitors } from "@/components/report/report-competitors";
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
import {
  type ReportVariant,
  ReportVariantProvider,
  getVariantFeatures,
  VariantFeaturesOverrideProvider,
  type VariantFeatures,
} from "@/lib/report/report-variant";
import { ReportTrackingProvider } from "./report-tracking-context";

import { ReportFramedBlock } from "../report-framed-block";
import { Lock, Sparkles } from "lucide-react";
import { ReportMethodology } from "../report-methodology";
import { REDESIGN_TOKENS } from "../report-tokens";

import { useBlocks } from "./block-config";
import { ReportBlockSidebar, ReportBlockTopTabs } from "./report-block-nav";
import { ReportBlockSection } from "./report-block-section";
import { ReportHeroV2 } from "./report-hero-v2";
import { ReportOverviewBlock } from "./report-overview-block";
import { ReportDiagnosticBlock } from "./report-diagnostic-block";
import { ReportLockGate } from "@/components/product/report-lock-gate";
import { useTranslation } from "react-i18next";

interface ReportShellV2Props {
  result: AdapterResult;
  snapshotId: string;
  actions: ReportPageActions;
  payload?: SnapshotPayload;
  analyzedAtIso?: string | null;
  expiresAtIso?: string | null;
  /** Report variant — controls feature visibility. Defaults to public_mvp. */
  variant?: ReportVariant;
  /** Optional resolved features override (from admin visibility manager). */
  featuresOverride?: VariantFeatures | null;
  /**
   * If "engagement", everything from the Engagement card onward is wrapped
   * in a frosted lock gate with a CTA. Default null = no gate.
   */
  lockBoundary?: "engagement" | null;
  unlocked?: boolean;
  onUnlockClick?: () => void;
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
  expiresAtIso,
  variant = "public_mvp",
  featuresOverride,
  lockBoundary = null,
  unlocked = false,
  onUnlockClick,
}: ReportShellV2Props) {
  const { t } = useTranslation("report");
  const v2 = result.enriched.aiInsightsV2;
  const features = featuresOverride ?? getVariantFeatures(variant);

  const sidebarProfile = {
    handle: result.data.profile.username,
    avatarUrl: result.enriched.profile?.avatarUrl ?? null,
    displayName: result.data.profile.fullName ?? null,
  };

  const scrollToCofre = () => {
    if (typeof document === "undefined") return;
    const el = document.getElementById("report-cofre");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /** Insight v2 dentro de um container já com padding (block content). */
  const renderInsight = (key: AiInsightV2Section) => {
    const item = v2?.sections[key];
    if (!item) return null;
    return <AIInsightBox insight={item.text} emphasis={item.emphasis} />;
  };

  const [overview, diagnostico, performance, conteudo, procura, benchmark] =
    useBlocks();

  const gated = lockBoundary === "engagement" && !unlocked;
  const handleUnlockClick = onUnlockClick ?? (() => {});

  return (
    <ReportVariantProvider value={variant}>
    <VariantFeaturesOverrideProvider value={featuresOverride ?? null}>
    <ReportDataProvider data={result.data}>
    <ReportTrackingProvider
      value={{
        snapshotId: snapshotId ?? null,
        handle: result.data.profile.username ?? null,
        variant,
      }}
    >
      <div
        className={cn(
          REDESIGN_TOKENS.pageCanvas,
          "min-h-screen overflow-x-clip",
        )}
      >
        {/* Hero v2 (full-bleed, fora dos 6 blocos) */}
        <section className="bg-surface-base">
          <ReportHeroV2
            result={result}
            actions={actions}
            analyzedAtIso={analyzedAtIso ?? null}
            expiresAtIso={expiresAtIso ?? null}
          />
        </section>

        {/* Tabs mobile sticky abaixo do hero */}
        <ReportBlockTopTabs
          variant={variant}
          features={features}
          profile={sidebarProfile}
        />

        {/* Layout 2-col a partir do bloco 01 */}
        <div className="mx-auto max-w-[1520px] px-5 md:px-6 lg:px-8">
          <div className="flex gap-8 lg:gap-10 pt-5 lg:pt-6">
            <ReportBlockSidebar
              variant={variant}
              features={features}
              profile={sidebarProfile}
            />
            <main className="min-w-0 flex-1">
              {/* 01 · Overview (redesigned) */}
              {features.blockOverview !== "hidden" && (
              <ReportBlockSection block={overview} tone="canvas" first>
                {lockBoundary === "engagement" && !unlocked ? (
                  <ReportOverviewBlock
                    result={result}
                    renderInsight={renderInsight}
                    payload={payload}
                    mode="free"
                  />
                ) : (
                  <ReportOverviewBlock
                    result={result}
                    renderInsight={renderInsight}
                    payload={payload}
                  />
                )}
              </ReportBlockSection>
              )}

              {/* When gated, everything from the Engagement card onward
                  lives inside one ReportLockGate so a single CTA overlay
                  covers the entire locked region. */}
              {gated ? (
                <ReportLockGate
                  unlocked={unlocked}
                  onUnlockClick={handleUnlockClick}
                  handle={result.data.profile.username}
                >
                  {features.blockOverview !== "hidden" && (
                    <div className="mt-6 md:mt-8">
                      <ReportOverviewBlock
                        result={result}
                        renderInsight={renderInsight}
                        payload={payload}
                        mode="locked"
                      />
                    </div>
                  )}
                  {features.blockDiagnosis !== "hidden" && (
                    <ReportBlockSection block={diagnostico} tone="canvas">
                      <ReportDiagnosticBlock result={result} payload={payload} />
                    </ReportBlockSection>
                  )}
                  {features.blockPerformance !== "hidden" && (
                    <ReportBlockSection block={performance} tone="canvas">
                      <ReportFramedBlock
                        tone="canvas"
                        ariaLabel={t("shell.aria.performance_time")}
                      >
                        <ReportTemporalChart />
                        <div className="mt-4">{renderInsight("evolutionChart")}</div>
                      </ReportFramedBlock>
                      <ReportFramedBlock
                        tone="canvas"
                        ariaLabel={t("shell.aria.audience_response")}
                      >
                        <div className="space-y-10 md:space-y-12">
                          <ReportPostingHeatmap />
                          <div className="mt-4">{renderInsight("heatmap")}</div>
                          {features.blockPerformance === "full" ? (
                            <>
                              <ReportBestDays />
                              <div className="mt-4">{renderInsight("daysOfWeek")}</div>
                            </>
                          ) : (
                            <PerformanceLockedTeaser onUnlock={scrollToCofre} />
                          )}
                        </div>
                      </ReportFramedBlock>
                    </ReportBlockSection>
                  )}
                  {features.blockContent !== "hidden" && (
                    <ReportBlockSection block={conteudo} tone="soft-blue">
                      <ReportFramedBlock tone="soft-blue" ariaLabel={t("shell.aria.top_posts")}>
                        <div className="mt-6">
                          <ReportEnrichedTopLinks enriched={result.enriched} />
                        </div>
                      </ReportFramedBlock>
                      <ReportFramedBlock tone="soft-blue" ariaLabel={t("shell.aria.format_mix")}>
                        <ReportFormatBreakdown />
                        <div className="mt-4">{renderInsight("formats")}</div>
                      </ReportFramedBlock>
                      <ReportFramedBlock tone="soft-blue" ariaLabel={t("shell.aria.hashtags")}>
                        <div className="space-y-10 md:space-y-12">
                          <ReportHashtagsKeywords />
                          <div className="mt-4">{renderInsight("language")}</div>
                          <ReportEnrichedMentions enriched={result.enriched} />
                        </div>
                      </ReportFramedBlock>
                    </ReportBlockSection>
                  )}
                  {features.blockSearch !== "hidden" && (
                    <ReportBlockSection block={procura} tone="canvas">
                      <p className="text-sm md:text-[15px] text-content-secondary leading-relaxed max-w-3xl">
                        {t("shell.search_intro_short")}
                      </p>
                      <ReportMarketSignalsSection
                        snapshotId={snapshotId}
                        plan="free"
                        cachedSummary={payload?.market_signals_free}
                        compact
                      />
                      {renderInsight("marketSignals")}
                    </ReportBlockSection>
                  )}
                  {features.blockBenchmark !== "hidden" && (
                    <ReportBlockSection block={benchmark} tone="soft-blue">
                      <ReportFramedBlock tone="soft-blue" ariaLabel={t("shell.aria.market_position")}>
                        <ReportBenchmarkGauge />
                        <div className="mt-4">{renderInsight("benchmark")}</div>
                      </ReportFramedBlock>
                      <ReportFramedBlock tone="soft-blue" ariaLabel={t("shell.aria.peer_comparison")}>
                        <ReportCompetitors />
                        {result.coverage.competitors === "empty" ? (
                          <div className="mt-6">
                            <ReportEnrichedCompetitorsCta />
                          </div>
                        ) : null}
                      </ReportFramedBlock>
                    </ReportBlockSection>
                  )}
                </ReportLockGate>
              ) : null}

              {/* 02 · Diagnóstico editorial */}
              {!gated && features.blockDiagnosis !== "hidden" && (
              <ReportBlockSection block={diagnostico} tone="canvas">
                <ReportDiagnosticBlock result={result} payload={payload} />
              </ReportBlockSection>
              )}

              {/* 03 · Performance */}
              {!gated && features.blockPerformance !== "hidden" && (
              <ReportBlockSection block={performance} tone="canvas">
                <ReportFramedBlock
                  tone="canvas"
                  ariaLabel={t("shell.aria.performance_time")}
                >
                  <ReportTemporalChart />
                  <div className="mt-4">{renderInsight("evolutionChart")}</div>
                </ReportFramedBlock>
                <ReportFramedBlock
                  tone="canvas"
                  ariaLabel={t("shell.aria.audience_response")}
                >
                  <div className="space-y-10 md:space-y-12">
                    <ReportPostingHeatmap />
                    <div className="mt-4">{renderInsight("heatmap")}</div>
                    {features.blockPerformance === "full" ? (
                      <>
                        <ReportBestDays />
                        <div className="mt-4">{renderInsight("daysOfWeek")}</div>
                      </>
                    ) : (
                      <PerformanceLockedTeaser onUnlock={scrollToCofre} />
                    )}
                  </div>
                </ReportFramedBlock>
              </ReportBlockSection>
              )}

              {/* 04 · Conteúdo */}
              {!gated && features.blockContent !== "hidden" && (
              <ReportBlockSection block={conteudo} tone="soft-blue">
                <ReportFramedBlock
                  tone="soft-blue"
                  ariaLabel={t("shell.aria.top_posts")}
                >
                  <div className="mt-6">
                    <ReportEnrichedTopLinks enriched={result.enriched} />
                  </div>
                </ReportFramedBlock>
                <ReportFramedBlock
                  tone="soft-blue"
                  ariaLabel={t("shell.aria.format_mix")}
                >
                  <ReportFormatBreakdown />
                  <div className="mt-4">{renderInsight("formats")}</div>
                </ReportFramedBlock>
                <ReportFramedBlock
                  tone="soft-blue"
                  ariaLabel={t("shell.aria.hashtags")}
                >
                  <div className="space-y-10 md:space-y-12">
                    <ReportHashtagsKeywords />
                    <div className="mt-4">{renderInsight("language")}</div>
                    <ReportEnrichedMentions enriched={result.enriched} />
                  </div>
                </ReportFramedBlock>
              </ReportBlockSection>
              )}

              {/* 05 · Procura fora do Instagram */}
              {!gated && features.blockSearch !== "hidden" && (
              <ReportBlockSection block={procura} tone="canvas">
                <p className="text-sm md:text-[15px] text-content-secondary leading-relaxed max-w-3xl">
                  {t("shell.search_intro")}
                </p>
                <ReportMarketSignalsSection
                  snapshotId={snapshotId}
                  plan="free"
                  cachedSummary={payload?.market_signals_free}
                  compact
                />
                {renderInsight("marketSignals")}
              </ReportBlockSection>
              )}

              {/* 06 · Benchmark competitivo */}
              {!gated && features.blockBenchmark !== "hidden" && (
              <ReportBlockSection block={benchmark} tone="soft-blue">
                <ReportFramedBlock
                  tone="soft-blue"
                  ariaLabel={t("shell.aria.market_position")}
                >
                  <ReportBenchmarkGauge />
                  <div className="mt-4">{renderInsight("benchmark")}</div>
                </ReportFramedBlock>
                <ReportFramedBlock
                  tone="soft-blue"
                  ariaLabel={t("shell.aria.peer_comparison")}
                >
                  <ReportCompetitors />
                  {result.coverage.competitors === "empty" ? (
                    <div className="mt-6">
                      <ReportEnrichedCompetitorsCta />
                    </div>
                  ) : null}
                </ReportFramedBlock>
              </ReportBlockSection>
              )}
            </main>
          </div>
        </div>

        {/* Pós-blocos (mantêm-se fora da numeração 1–6) */}
        <ReportMethodology />
        <TierComparisonBlock />
        <ReportFinalBlock snapshotId={snapshotId} result={result} />
        {features.betaFeedbackBanner !== "hidden" && <BetaFeedbackBannerV2 />}

        {/* Espaço inferior mobile para a bottom nav bar não tapar conteúdo */}
        <div className="h-20 lg:hidden" aria-hidden="true" />
      </div>
    </ReportTrackingProvider>
    </ReportDataProvider>
    </VariantFeaturesOverrideProvider>
    </ReportVariantProvider>
  );
}

/**
 * Teaser inline para a parte locked do bloco 03 (Desempenho)
 * em variantes parciais (public_mvp lightweight). Renderiza um cartão
 * compacto a anunciar as 2 secções restantes e leva ao cofre.
 */
function PerformanceLockedTeaser({ onUnlock }: { onUnlock: () => void }) {
  return (
    <div className="mt-4 rounded-xl border border-dashed border-border-default bg-surface-muted/50 p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-signal-warning/15 p-2">
          <Lock className="size-4 text-accent-gold" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-eyebrow-sm text-accent-gold">Premium</p>
          <h4 className="mt-1 text-sm md:text-base font-semibold text-content-primary">
            Mais 2 secções dentro de Desempenho
          </h4>
          <p className="mt-1 text-sm text-content-secondary leading-relaxed">
            Melhores dias da semana e leitura editorial do ritmo de publicação
            ficam disponíveis no relatório completo.
          </p>
          <button
            type="button"
            onClick={onUnlock}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700"
          >
            <Sparkles className="size-3.5" aria-hidden="true" />
            Desbloquear análise completa →
          </button>
        </div>
      </div>
    </div>
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
      className="w-full bg-surface-muted border-t border-border-default"
    >
      <div className="mx-auto max-w-[1520px] px-5 md:px-6 lg:px-8 py-10 md:py-12">
        <div className="rounded-2xl border border-border-default bg-white p-6 md:p-8 flex flex-col gap-5 md:flex-row md:items-center md:justify-between shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="space-y-1.5 max-w-2xl">
            <p className="text-eyebrow text-blue-600">
              {feedback.eyebrow}
            </p>
            <p className="text-sm md:text-base text-content-secondary leading-relaxed">
              {feedback.subtitle}
            </p>
          </div>
          <a
            href={feedback.action.href}
            className="shrink-0 inline-flex items-center justify-center gap-2 rounded-full bg-content-primary px-5 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-content-primary/90 min-h-[44px]"
          >
            {feedback.action.label}
            <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </section>
  );
}
