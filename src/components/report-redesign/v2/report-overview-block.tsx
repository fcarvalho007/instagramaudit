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
import { PremiumTeaserCard } from "./premium-teaser-card";
import { ComparisonHero } from "./overview/comparison-hero";
import { CompetitorEngagementCompare } from "./competitor-engagement-compare";
import { CompetitorCadenceCompare } from "./competitor-cadence-compare";
import { CompetitorBioCompare } from "./competitor-bio-compare";
import { CompetitorFormatCompare } from "./competitor-format-compare";
import { CompetitorWeekdayCompare } from "./competitor-weekday-compare";
import { normaliseFormatKey } from "@/lib/report/format-keys";
import { pickThumbnailUrl } from "@/lib/report/pick-thumbnail";

function tierLabelFromFollowers(n: number | null | undefined): string | null {
  if (typeof n !== "number" || !Number.isFinite(n) || n <= 0) return null;
  if (n < 5_000) return "Nano";
  if (n < 20_000) return "Micro";
  if (n < 100_000) return "Mid";
  if (n < 1_000_000) return "Macro";
  return "Mega";
}

const PREMIUM_TEASERS = [
  {
    number: "03",
    eyebrow: "FREQUÊNCIA EDITORIAL",
    title: "Com que ritmo publica este perfil?",
    description:
      "Percebe se o perfil publica com consistência suficiente e onde existem quebras de ritmo.",
    anchorId: "frequencia",
    previewVariant: "frequency",
  },
  {
    number: "04",
    eyebrow: "MIX DE FORMATOS",
    title: "Que formatos dominam a estratégia?",
    description:
      "Vê se o perfil depende demasiado de um formato ou se há espaço para variar.",
    anchorId: "formatos",
    previewVariant: "format",
  },
  {
    number: "05",
    eyebrow: "PUBLICAÇÕES-CHAVE",
    title: "Que posts puxam o perfil para cima?",
    description:
      "Identifica os melhores e piores conteúdos e percebe onde estão os padrões.",
    anchorId: "publicacoes-chave",
    previewVariant: "publications",
  },
  {
    number: "06",
    eyebrow: "DIAGNÓSTICO EDITORIAL",
    title: "O que explica estes resultados?",
    description:
      "Desbloqueia 7 perguntas estratégicas sobre conteúdo, funil, hashtags, legendas, capas, audiência e integração.",
    anchorId: "diagnostico-editorial",
    previewVariant: "diagnostic",
    subItems: [
      "Natureza do conteúdo",
      "Funil",
      "Hashtags",
      "Legendas",
      "Capas",
      "Audiência",
      "Integração",
    ],
  },
  {
    number: "07",
    eyebrow: "PRIORIDADES DE ACÇÃO",
    title: "O que testar, corrigir ou repetir?",
    description:
      "Recebe recomendações práticas para transformar dados em decisões.",
    anchorId: "prioridades",
    previewVariant: "priorities",
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

export function ReportOverviewBlock({ result, renderInsight: _renderInsight, payload, mode = "all" }: Props) {
  const k = result.data.keyMetrics;
  const enriched = result.enriched;

  // TODO: multi-competitor layout (Fase 1.5). Today we render only the first
  // entry; the remaining competitors stay in the legacy gauge.
  const firstCompetitor = result.data.competitorBreakdown[0] ?? null;
  const primaryHandle = result.data.profile.username;

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

      {mode === "all" && firstCompetitor ? (
        <ComparisonHero
          primary={{
            handle: primaryHandle,
            fullName: result.data.profile.fullName ?? null,
            avatarUrl: enriched.profile.avatarUrl,
            verified: Boolean(result.data.profile.verified),
            followers: result.data.profile.followers,
            engagementRate: k.engagementRate,
            engagementBenchmark: k.engagementBenchmark,
            postingFrequencyWeekly: k.postingFrequencyWeekly,
            dominantFormat: k.dominantFormat,
            postsAnalyzed: k.postsAnalyzed,
          }}
          competitor={firstCompetitor}
          windowLabel={result.data.meta?.windowLabel ?? null}
        />
      ) : null}

      {((mode === "all" && !firstCompetitor) || mode === "free") && (
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

      {((mode === "all" && !firstCompetitor) || mode === "free") && (
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

      {mode === "all" && firstCompetitor ? (
        <CompetitorBioCompare
          primaryHandle={primaryHandle}
          primaryAvatarUrl={enriched.profile.avatarUrl}
          primaryFullName={result.data.profile.fullName ?? null}
          primaryBio={enriched.profile.bio}
          primaryExternalUrls={enriched.profile.externalUrls}
          primaryVerified={Boolean(result.data.profile.verified)}
          competitor={firstCompetitor}
        />
      ) : null}

      {mode === "free_with_engagement" && (
        <>
          <MethodologyLine
            count={sample?.performancePosts.length ?? 0}
            observedDays={enriched.cadence.windowDays}
            sufficient={enriched.cadence.sufficient}
            pinnedExcluded={sample?.pinnedPostsExcluded ?? 0}
            outliersExcluded={sample?.dateOutliersExcluded ?? 0}
          />
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
                subItems={"subItems" in teaser ? teaser.subItems : undefined}
                previewVariant={teaser.previewVariant}
              />
            ))}
          </div>
        </>
      )}

      {(mode === "all" || mode === "locked") && (
        <>
          {/* Zona C — Card de Taxa de Envolvimento (lock boundary) */}
          <div id="engagement" className="scroll-mt-24">
            {firstCompetitor ? (
              <CompetitorEngagementCompare
                primary={{
                  handle: primaryHandle,
                  avatarUrl: enriched.profile.avatarUrl,
                  fullName: result.data.profile.fullName ?? null,
                  verified: Boolean(result.data.profile.verified),
                  engagementRate: k.engagementRate,
                  averageLikes: avgLikes,
                  averageComments: avgComments,
                }}
                competitor={firstCompetitor}
                benchmark={k.engagementBenchmark}
                scaleLabel={tierLabelFromFollowers(result.data.profile.followers)}
              />
            ) : (
              <EngagementCardRefined result={result} />
            )}
          </div>

          {/* Zona D — Frequência + Tipo de conteúdo (stack vertical) */}
          <div className="space-y-6 md:space-y-8">
            <div id="frequencia" className="scroll-mt-24">
            {firstCompetitor ? (
              <div className="space-y-4">
                <CompetitorCadenceCompare
                  primary={{
                    handle: primaryHandle,
                    avatarUrl: enriched.profile.avatarUrl,
                    fullName: result.data.profile.fullName ?? null,
                    verified: Boolean(result.data.profile.verified),
                    postingFrequencyWeekly: k.postingFrequencyWeekly,
                  }}
                  competitor={firstCompetitor}
                  primaryRecentPosts={(sample?.analyzedPosts ?? [])
                    .slice()
                    .sort((a, b) => (b.taken_at ?? 0) - (a.taken_at ?? 0))
                    .slice(0, 5)
                    .map((p) => ({
                      thumbUrl: pickThumbnailUrl({
                        thumbnail_storage_url: p.thumbnail_storage_url ?? null,
                        thumbnail_url: p.thumbnail_url ?? null,
                      }),
                      permalink: p.permalink ?? null,
                      takenAt: p.taken_at ?? null,
                    }))}
                />
                <CompetitorWeekdayCompare
                  primaryHandle={primaryHandle}
                  primaryAvatarUrl={enriched.profile.avatarUrl}
                  primaryFullName={result.data.profile.fullName ?? null}
                  primaryVerified={Boolean(result.data.profile.verified)}
                  payload={payload}
                  competitor={firstCompetitor}
                />
              </div>
            ) : (
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
            )}
            </div>
            <div id="formatos" className="scroll-mt-24">
            {firstCompetitor ? (
              <CompetitorFormatCompare
                primaryHandle={primaryHandle}
                primaryAvatarUrl={enriched.profile.avatarUrl}
                primaryFullName={result.data.profile.fullName ?? null}
                primaryVerified={Boolean(result.data.profile.verified)}
                formats={formatEntries}
                competitor={firstCompetitor}
              />
            ) : (
              <FormatCard
                postsAnalyzed={k.postsAnalyzed}
                dominantFormat={k.dominantFormat}
                dominantFormatShare={k.dominantFormatShare}
                formats={formatEntries}
                analysedPostFormats={enriched.analysedPostFormats}
                socialinsiderRef={result.externalReferences}
              />
            )}
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

