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
import type { ReportPageActions } from "@/components/report/report-page";
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
import { PremiumCtaProvider } from "./premium-cta-context";

import { ReportFramedBlock } from "../report-framed-block";
import { Lock, Sparkles } from "lucide-react";
import { ReportMethodology } from "../report-methodology";
import { REDESIGN_TOKENS } from "../report-tokens";
import { ReportLockGate } from "@/components/product/report-lock-gate";

import { useBlocks } from "./block-config";
import { ReportBlockSidebar, ReportBlockTopTabs } from "./report-block-nav";
import { ReportBlockSection } from "./report-block-section";
import { ReportHeroV2 } from "./report-hero-v2";
import { AnalysisPeriodSelector } from "./analysis-period-selector";
import { ReportOverviewBlock } from "./report-overview-block";
import { ReportDiagnosticBlock } from "./report-diagnostic-block";
import { BlockFeedback } from "./feedback/block-feedback";
import { ReportEndOfFreeBlock } from "./end-of-free-block";
import { EndFeedbackStrip } from "./feedback/end-feedback-strip";
import { useTranslation } from "react-i18next";
import { useEffect, useMemo, useState } from "react";

import { BackToTopButton } from "./back-to-top-button";
import { StickyUnlockBar } from "./sticky-unlock-bar";
import { ReportShortcutDialog } from "./report-shortcut-dialog";
import { useReportKeyboardShortcuts } from "./use-report-keyboard-shortcuts";
import { scrollToBlock } from "./use-active-block";

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
  /** True only when the user has paid/premium access. Lead capture
   *  alone must NOT set this. Defaults to false. */
  premiumUnlocked?: boolean;
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
  premiumUnlocked = false,
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

  const gated = lockBoundary === "engagement" && !premiumUnlocked;
  const handleUnlockClick = onUnlockClick ?? (() => {});

  // Deep-link via URL hash (`#performance` etc.). Runs once on mount;
  // small delay lets the layout settle so scrollIntoView lands accurately.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.location.hash.replace(/^#/, "");
    if (!raw) return;
    const id = decodeURIComponent(raw);
    const t = window.setTimeout(() => scrollToBlock(id), 250);
    return () => window.clearTimeout(t);
  }, []);

  // Keyboard shortcuts (g+1..6, t, ?).
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const blockIds = useMemo(
    () => [overview, diagnostico, performance, conteudo, procura, benchmark].map((b) => b.id),
    [overview, diagnostico, performance, conteudo, procura, benchmark],
  );
  useReportKeyboardShortcuts({
    blockIds,
    onShowHelp: () => setShortcutsOpen(true),
  });

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
    <PremiumCtaProvider
      snapshotId={snapshotId ?? null}
      handle={result.data.profile.username ?? null}
      variant={variant}
      premiumUnlocked={premiumUnlocked}
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
          {/* Analysis period selector (read-only premium teaser).
              Sits between the hero and the blocks so the temporal window
              is framed as a global report-level config, not as a metric
              inside a block. Does NOT mutate report data. */}
          <AnalysisPeriodSelector
            sampleSize={result.data.profile.postsAnalyzed ?? 0}
            observedDays={result.coverage.windowDays ?? 0}
            snapshotId={snapshotId ?? null}
            handle={result.data.profile.username ?? null}
            variant={variant}
          />
        </section>

        {/* Tabs mobile sticky abaixo do hero */}
        <ReportBlockTopTabs
          variant={variant}
          features={features}
          profile={sidebarProfile}
          unlocked={unlocked}
          onUnlockClick={handleUnlockClick}
        />

        {/* Layout 2-col a partir do bloco 01 */}
        <div className="mx-auto max-w-[1520px] px-5 md:px-6 lg:px-8">
          <div className="flex gap-8 lg:gap-10 pt-5 lg:pt-6">
            <ReportBlockSidebar
              variant={variant}
              features={features}
              profile={sidebarProfile}
              unlocked={unlocked}
              onUnlockClick={handleUnlockClick}
            />
            <main className="min-w-0 flex-1 overflow-x-clip">
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

              {/* Estado A · Anónimo — lead magnet logo após o Identity Card.
                  Substitui o resto do Bloco 1 (Engagement/Frequência/Formato/
                  Best vs Worst) e o "Há mais por trás" até o lead ser captado. */}
              {features.blockOverview !== "hidden" &&
                lockBoundary === "engagement" &&
                !unlocked && (
                  <section id="lead-magnet-card" className="mt-6 md:mt-8">
                    <ReportLockGate
                      unlocked={false}
                      onUnlockClick={handleUnlockClick}
                      handle={result.data.profile.username}
                    >
                      {null}
                    </ReportLockGate>
                  </section>
                )}

              {/* Estado B/C · Feedback do Bloco 1 (emojis "breve pausa para te
                  ouvirmos") — só após captura de lead. */}
              {features.blockOverview !== "hidden" && unlocked && (
                <div className="mt-6 md:mt-8 mb-2">
                  <BlockFeedback
                    handle={result.data.profile.username}
                    snapshotId={snapshotId ?? null}
                    block="overview"
                  />
                </div>
              )}

              {/* Fluxo público: blocos 2–6 só em premium. Sidebar/tabs
                  comunicam "5 por desbloquear". Em estado B (lead capturado
                  mas sem premium), o ReportEndOfFreeBlock abaixo serve como
                  CTA Premium. */}

              {/* 02 · Diagnóstico editorial — só fora do gate em premium */}
              {premiumUnlocked && features.blockDiagnosis !== "hidden" && (
              <ReportBlockSection block={diagnostico} tone="canvas">
                <ReportDiagnosticBlock result={result} payload={payload} />
              </ReportBlockSection>
              )}

              {/* 03 · Performance — só renderiza em variantes premium (`full`).
                  Em public_mvp (`lightweight`) a sidebar continua a mostrar o
                  bloco como locked, mas a secção de conteúdo não aparece. */}
              {premiumUnlocked && features.blockPerformance === "full" && (
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
              {premiumUnlocked && features.blockContent !== "hidden" && (
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
              {premiumUnlocked && features.blockSearch !== "hidden" && (
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
              {premiumUnlocked && features.blockBenchmark !== "hidden" && (
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

              {/* Fim do relatório free + CTA Premium. Mantém o id
                  `lead-magnet-card` que servia de âncora ao antigo
                  ReportLockGate, para deep-links e scrolls existentes.
                  Só renderiza em estado B (lead capturado, sem premium). */}
              {unlocked && !premiumUnlocked && (
                <section
                  id="lead-magnet-card"
                  className="mt-12 sm:mt-16 mb-16 sm:mb-20"
                >
                  <ReportEndOfFreeBlock />
                  <EndFeedbackStrip
                    handle={result.data.profile.username}
                    snapshotId={snapshotId ?? null}
                    className="mt-3 sm:mt-4"
                  />
                </section>
              )}
            </main>
          </div>
        </div>

        {/* Pós-blocos (mantêm-se fora da numeração 1–6).
            Só após captura de lead — versão anónima fica mais enxuta. */}
        {unlocked && <ReportMethodology />}

        {/* Espaço inferior mobile para a bottom nav bar não tapar conteúdo */}
        <div className="h-28 lg:hidden" aria-hidden="true" />

        {/* UX helpers — back to top, shortcut help, mobile unlock CTA */}
        <BackToTopButton />
        {/* Sticky premium CTA: only after lead capture (post-unlock).
            Pre-lead the lead-magnet card is the single primary CTA. */}
        {unlocked && lockBoundary === "engagement" && (
          <StickyUnlockBar />
        )}
        <ReportShortcutDialog
          open={shortcutsOpen}
          onOpenChange={setShortcutsOpen}
        />
      </div>
    </PremiumCtaProvider>
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

