import { useMemo, type ReactNode } from "react";

import type { AdapterResult, SnapshotPayload } from "@/lib/report/snapshot-to-report-data";
import type { AiInsightV2Section } from "@/lib/insights/types";

import {
  computeEnvolvimento,
  envolvimentoSubtitle,
  computeFrequencia,
  frequenciaSubtitle,
  type ScoreKey,
} from "./overview/score-utils";
import { EditorialIdentityCard } from "./overview/editorial-identity-card";
import { MethodologyLine } from "./overview/methodology-line";
import { EngagementCardRefined } from "./report-overview-engagement";
import { FrequencyCard } from "./overview/frequency-card";
import { FormatCard, type FormatEntry } from "./overview/format-card";
import { PostComparisonBlock } from "./report-post-comparison";
import {
  buildCadenceLabelPt,
  classifyHashtagsState,
  pickHashtagsForVerdict,
} from "@/lib/report/cadence-label";
import { computePostAverages } from "@/lib/report/post-aggregates";
import { buildBlock01Sample } from "@/lib/report/block01-sample";
import { Lock, Sparkles } from "lucide-react";
import { usePremiumCta } from "./premium-cta-context";
import { PremiumTeaserCard } from "./premium-teaser-card";

const PREMIUM_TEASERS = [
  {
    number: "03",
    eyebrow: "FREQUÊNCIA EDITORIAL",
    title: "Com que ritmo publica este perfil?",
    description:
      "Percebe se o perfil publica com consistência suficiente e onde existem quebras de ritmo.",
    anchorId: "frequencia",
  },
  {
    number: "04",
    eyebrow: "MIX DE FORMATOS",
    title: "Que formatos dominam a estratégia?",
    description:
      "Vê se o perfil depende demasiado de um formato ou se há espaço para variar.",
    anchorId: "formatos",
  },
  {
    number: "05",
    eyebrow: "PUBLICAÇÕES-CHAVE",
    title: "Que posts puxam o perfil para cima?",
    description:
      "Identifica os melhores e piores conteúdos e percebe onde estão os padrões.",
    anchorId: "publicacoes-chave",
  },
  {
    number: "06",
    eyebrow: "CONTEXTO ESTRATÉGICO",
    title: "O que estes sinais dizem sobre o perfil?",
    description:
      "Recebe uma leitura editorial sobre posicionamento, conteúdo e oportunidades.",
    anchorId: "contexto-estrategico",
  },
  {
    number: "07",
    eyebrow: "PRIORIDADES DE ACÇÃO",
    title: "O que testar, corrigir ou repetir?",
    description:
      "Fica com recomendações práticas para transformar dados em decisões.",
    anchorId: "prioridades",
  },
] as const;

export interface Props {
  result: AdapterResult;
  renderInsight: (key: AiInsightV2Section) => ReactNode;
  payload?: SnapshotPayload;
  /**
   * Split rendering for the public lock gate:
   * - "all" (default): renders everything.
   * - "free": renders only the Editorial Identity Card (above the gate).
   * - "free_with_engagement": renders Identity Card + Methodology Line +
   *   Engagement card. Frequency, Format and Best-vs-Worst become PRO
   *   teaser placeholders. Used by the post-lead-capture FREE flow.
   * - "locked": renders content from the Engagement card onward
   *   (Engagement, Frequency+Format grid, Best vs Worst posts).
   */
  mode?: "all" | "free" | "free_with_engagement" | "locked";
}

function normaliseFormatKey(raw: string | null | undefined): "Reels" | "Carousels" | "Imagens" | null {
  const s = (raw ?? "").toLowerCase();
  if (s.startsWith("reel")) return "Reels";
  if (s.startsWith("carro") || s.startsWith("carou")) return "Carousels";
  if (s.startsWith("imag")) return "Imagens";
  return null;
}

export function ReportOverviewBlock({ result, renderInsight: _renderInsight, payload, mode = "all" }: Props) {
  const k = result.data.keyMetrics;
  const enriched = result.enriched;

  // Single source of truth: derive likes/comments averages from the same
  // canonical Block 1 sample that feeds the engagement rate
  // (`buildBlock01Sample.performancePosts` — pinned + date outliers
  // excluded). Falls back to `content_summary` only when the snapshot has
  // no usable posts. Passing `excludePinned: false` because the sample is
  // already pinned-filtered upstream.
  // Single source of truth: derive Block 1 sample once and reuse it for
  // (a) averages and (b) the methodology line.
  const sample = useMemo(() => {
    const posts = payload?.posts ?? null;
    if (!Array.isArray(posts) || posts.length === 0) return null;
    return buildBlock01Sample(posts);
  }, [payload?.posts]);

  const postAverages = useMemo(() => {
    if (!sample) return null;
    const source =
      sample.performancePosts.length > 0
        ? sample.performancePosts
        : sample.analyzedPosts;
    return computePostAverages(source, { excludePinned: false });
  }, [sample]);

  const avgLikes =
    postAverages?.averageLikes ?? payload?.content_summary?.average_likes ?? 0;
  const avgComments =
    postAverages?.averageComments ??
    payload?.content_summary?.average_comments ??
    0;

  const scores: Record<ScoreKey, { value: number; subtitle: string }> = useMemo(() => ({
    envolvimento: {
      value: computeEnvolvimento(k.engagementRate, k.engagementBenchmark),
      subtitle: envolvimentoSubtitle(k.engagementRate, k.engagementBenchmark),
    },
    frequencia: {
      value: computeFrequencia(k.postingFrequencyWeekly),
      subtitle: frequenciaSubtitle(k.postingFrequencyWeekly),
    },
  }), [k]);

  // Counts: prefer the snapshot's authoritative `format_stats[k].count`.
  // Fallback: count per-post records in `analysedPostFormats`. Last resort:
  // round-trip from sharePct × postsAnalyzed (legacy behaviour).
  const formatEntries: FormatEntry[] = useMemo(() => {
    // 1. Index counts from raw payload (authoritative).
    const fromPayload = new Map<string, number>();
    const stats = payload?.format_stats ?? null;
    if (stats) {
      for (const [rawKey, v] of Object.entries(stats)) {
        const canonical = normaliseFormatKey(rawKey);
        if (!canonical) continue;
        const c = typeof v?.count === "number" && Number.isFinite(v.count) ? v.count : 0;
        fromPayload.set(canonical, (fromPayload.get(canonical) ?? 0) + c);
      }
    }
    // 2. Fallback: per-post counts.
    const fromPosts = new Map<string, number>();
    for (const p of enriched.analysedPostFormats) {
      const canonical =
        p.type === "reel" ? "Reels"
        : p.type === "carousel" ? "Carousels"
        : p.type === "image" ? "Imagens"
        : null;
      if (!canonical) continue;
      fromPosts.set(canonical, (fromPosts.get(canonical) ?? 0) + 1);
    }

    return result.data.formatBreakdown.map((f) => {
      const key = f.format as "Reels" | "Carousels" | "Imagens";
      const real = fromPayload.get(key);
      const fallbackPosts = fromPosts.get(key);
      const fallbackRound = Math.round((f.sharePct / 100) * k.postsAnalyzed);
      const count =
        typeof real === "number" && real > 0 ? real
        : typeof fallbackPosts === "number" && fallbackPosts > 0 ? fallbackPosts
        : fallbackRound;
      return { format: key, sharePct: f.sharePct, count };
    });
  }, [result.data.formatBreakdown, k.postsAnalyzed, payload, enriched.analysedPostFormats]);

  return (
    <div className="relative space-y-8 md:space-y-10">

      {(mode === "all" || mode === "free") && (
        /* Zona B — Editorial Identity Card (replaces 6-card grid) */
        <EditorialIdentityCard
          scores={scores}
          aiVerdict={enriched.aiInsightsV2?.editorialVerdict ?? null}
          keyMetrics={{
            engagementRate: k.engagementRate,
            engagementBenchmark: k.engagementBenchmark,
            engagementDeltaPct: k.engagementDeltaPct,
          }}
          dominantFormat={k.dominantFormat}
          dominantFormatShare={k.dominantFormatShare}
          postingFrequencyWeekly={k.postingFrequencyWeekly}
          followers={result.data.profile.followers}
          postsAnalyzed={k.postsAnalyzed}
          averageLikes={avgLikes}
          averageComments={avgComments}
          cadenceSufficient={enriched.cadence.sufficient}
          cadenceReliability={enriched.cadence.reliability}
          competitorsCount={result.data.competitors.length}
          cadenceMethod={enriched.cadence.method}
          cadenceWindowDays={enriched.cadence.windowDays}
          hasRecurringHashtags={
            (result.data.topHashtags ?? []).some((h) => (h.uses ?? 0) >= 2)
          }
          cadenceLabelPt={buildCadenceLabelPt({
            weekly: enriched.cadence.sufficient
              ? (enriched.cadence.weekly ?? null)
              : null,
            sufficient: enriched.cadence.sufficient,
          })}
          hashtagsState={classifyHashtagsState(
            (result.data.topHashtags ?? []).map((h) => ({
              tag: h.tag,
              uses: h.uses,
            })),
          )}
          topHashtags={pickHashtagsForVerdict(
            (result.data.topHashtags ?? []).map((h) => ({
              tag: h.tag,
              uses: h.uses,
            })),
            2,
          )}
        />
      )}

      {(mode === "all" || mode === "free") && (
        /* Linha de transparência da metodologia — discreta, abaixo do
         * cartão editorial, visível tanto no modo free como no completo. */
        <MethodologyLine
          count={sample?.performancePosts.length ?? 0}
          observedDays={enriched.cadence.windowDays}
          sufficient={enriched.cadence.sufficient}
          pinnedExcluded={sample?.pinnedPostsExcluded ?? 0}
          outliersExcluded={sample?.dateOutliersExcluded ?? 0}
        />
      )}

      {mode === "free_with_engagement" && (
        <>
          <MethodologyLine
            count={sample?.performancePosts.length ?? 0}
            observedDays={enriched.cadence.windowDays}
            sufficient={enriched.cadence.sufficient}
            pinnedExcluded={sample?.pinnedPostsExcluded ?? 0}
            outliersExcluded={sample?.dateOutliersExcluded ?? 0}
          />
          <div id="engagement" className="scroll-mt-24">
            <EngagementCardRefined result={result} />
          </div>
          <div className="space-y-5 md:space-y-6">
            <p className="text-eyebrow-sm text-content-tertiary">
              Relatório completo · 5 secções premium
            </p>
            {PREMIUM_TEASERS.map((teaser) => (
              <PremiumTeaserCard
                key={teaser.anchorId}
                number={teaser.number}
                eyebrow={teaser.eyebrow}
                title={teaser.title}
                description={teaser.description}
                anchorId={teaser.anchorId}
                source="overview_pro_teaser"
              />
            ))}
          </div>
        </>
      )}

      {(mode === "all" || mode === "locked") && (
        <>
          {/* Zona C — Card de Taxa de Envolvimento (lock boundary) */}
          <div id="engagement" className="scroll-mt-24">
            <EngagementCardRefined result={result} />
          </div>

          {/* Zona D — Frequência + Tipo de conteúdo (stack vertical) */}
          <div className="space-y-6 md:space-y-8">
            <div id="frequencia" className="scroll-mt-24">
            <FrequencyCard
              postsAnalyzed={k.postsAnalyzed}
              windowDays={result.coverage.windowDays}
              postingFrequencyWeekly={k.postingFrequencyWeekly}
              calendarDays={enriched.postingTimeline}
              cadenceSufficient={enriched.cadence.sufficient}
              cadenceSampleSize={enriched.cadence.sampleSize}
              cadenceWindowDays={enriched.cadence.windowDays}
              socialinsiderRef={result.externalReferences}
            />
            </div>
            <div id="formatos" className="scroll-mt-24">
            <FormatCard
              postsAnalyzed={k.postsAnalyzed}
              dominantFormat={k.dominantFormat}
              dominantFormatShare={k.dominantFormatShare}
              formats={formatEntries}
              analysedPostFormats={enriched.analysedPostFormats}
              socialinsiderRef={result.externalReferences}
            />
            </div>
          </div>

          {/* Best vs Worst Posts */}
          <div id="publicacoes-chave" className="scroll-mt-24">
          <PostComparisonBlock
            topPosts={result.enriched.topPosts}
            bottomPosts={result.enriched.bottomPosts}
            allPostsForScatter={result.enriched.allPostsScatter}
            windowRange={result.enriched.windowRange}
            aiInsightText={result.enriched.aiInsightsV2?.sections.topPosts?.text ?? null}
            cadenceMethod={enriched.cadence.method}
            cadenceWindowDays={enriched.cadence.windowDays}
            sampleSize={sample?.performancePosts.length ?? 0}
          />
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Teaser único que substitui Frequência editorial + Mix de formatos +
 * Publicações-chave no fluxo FREE pós-lead-capture. Concentra os três
 * cartões num só CTA PRO (sem blur de dados reais — menos render, copy
 * editorial mais limpa). O CTA é encaminhado pelo `PremiumCtaProvider`
 * (mesma waitlist que sidebar/sticky/end-of-free), com
 * `source_component: "overview_pro_teaser"`.
 */
function OverviewProTeaser() {
  const { handlePremiumAccessClick } = usePremiumCta();
  return (
    <div className="rounded-2xl border border-border-default bg-surface-base/60 p-6 md:p-8 shadow-card">
      <div className="flex items-start gap-4">
        <div className="hidden md:flex size-10 shrink-0 items-center justify-center rounded-full bg-[rgb(var(--accent-soft-pale))]">
          <Lock
            className="size-4 text-[rgb(var(--accent-primary))]"
            aria-hidden="true"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-eyebrow-sm text-[rgb(var(--accent-primary))]">
            PRO
          </p>
          <h3 className="mt-1 text-lg md:text-xl font-semibold text-content-primary">
            Mais 3 blocos no relatório PRO
          </h3>
          <p className="mt-2 text-sm md:text-[15px] text-content-secondary leading-relaxed max-w-2xl">
            <strong className="font-semibold text-content-primary">
              Frequência editorial
            </strong>
            ,{" "}
            <strong className="font-semibold text-content-primary">
              Mix de formatos
            </strong>{" "}
            e{" "}
            <strong className="font-semibold text-content-primary">
              Publicações-chave
            </strong>{" "}
            ficam disponíveis no relatório PRO, junto com o contexto
            estratégico e as prioridades de acção.
          </p>
          <button
            type="button"
            onClick={() => handlePremiumAccessClick("overview_pro_teaser")}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-content-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-content-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent-primary))] focus-visible:ring-offset-1"
          >
            <Sparkles className="size-3.5" aria-hidden="true" />
            Desbloquear o relatório PRO
          </button>
        </div>
      </div>
    </div>
  );
}
