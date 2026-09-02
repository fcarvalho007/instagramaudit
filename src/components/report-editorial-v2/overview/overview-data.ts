import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import type {
  AdapterResult,
  SnapshotPayload,
} from "@/lib/report/snapshot-to-report-data";
import { buildBlock01Sample } from "@/lib/report/block01-sample";
import { computePostAverages } from "@/lib/report/post-aggregates";
import {
  buildCadenceLabelPt,
  classifyHashtagsState,
  pickHashtagsForVerdict,
} from "@/lib/report/cadence-label";
import {
  deriveEditorialVerdict,
  type EditorialVerdictMetrics,
} from "@/lib/report/editorial-verdict";
import { buildFallbackVerdict } from "@/lib/report/editorial-verdict-fallback";
import {
  computeAttentionSignals,
  type AttentionSignal,
} from "@/lib/report/attention-signals";
import {
  computeEnvolvimento,
  computeFrequencia,
  computeGlobalScore,
} from "@/components/report-redesign/v2/overview/score-utils";

/**
 * Adaptador de APRESENTAÇÃO do Editorial V2.
 *
 * Não faz fetch, não cria métricas novas e não introduz regras de
 * negócio: apenas reúne os valores que a visão geral de produção já
 * consome (veredicto editorial, índice do perfil, sinais de atenção,
 * identidade e janela) num único objecto para a nova composição.
 */
export interface EditorialOverviewData {
  profile: {
    username: string;
    fullName: string | null;
    avatarUrl: string | null;
    followers: number;
    postsAnalyzed: number;
    tierLabel: string | null;
  };
  windowLabel: string | null;
  verdict: { title: string; paragraph: string };
  score: number;
  signals: readonly AttentionSignal[];
  engagement: {
    rate: number;
    benchmark: number;
    deltaPct: number;
    hasBenchmark: boolean;
  };
  postingFrequencyWeekly: number;
}

function tierLabelFromFollowers(followers: number): string | null {
  if (!Number.isFinite(followers) || followers <= 0) return null;
  if (followers >= 1_000_000) return "Mega";
  if (followers >= 250_000) return "Macro";
  if (followers >= 50_000) return "Mid";
  if (followers >= 10_000) return "Micro";
  return "Nano";
}

export function useEditorialOverviewData(
  result: AdapterResult,
  payload?: SnapshotPayload,
): EditorialOverviewData {
  const { t } = useTranslation("report");
  const k = result.data.keyMetrics;
  const enriched = result.enriched;

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

  const score = useMemo(
    () =>
      Math.max(
        0,
        Math.min(
          100,
          computeGlobalScore(
            computeEnvolvimento(k.engagementRate, k.engagementBenchmark),
            computeFrequencia(k.postingFrequencyWeekly),
          ),
        ),
      ),
    [k.engagementRate, k.engagementBenchmark, k.postingFrequencyWeekly],
  );

  const verdict = useMemo(() => {
    const metrics: EditorialVerdictMetrics = {
      postsPerWeek30d: enriched.cadence.sufficient
        ? (enriched.cadence.weekly ?? null)
        : null,
      cadenceSufficient: enriched.cadence.sufficient,
      cadenceReliability: enriched.cadence.reliability,
      engagementPct: k.engagementRate,
      benchmarkEngagementPct:
        k.engagementBenchmark > 0 ? k.engagementBenchmark : null,
      avgComments,
      avgLikes,
      competitorsCount: result.data.competitors.length,
      postsAnalyzed: k.postsAnalyzed,
    };
    const hashtags = (result.data.topHashtags ?? []).map((h) => ({
      tag: h.tag,
      uses: h.uses,
    }));
    const fallback = buildFallbackVerdict(metrics, t, {
      cadenceMethod: enriched.cadence.method,
      cadenceWindowDays: enriched.cadence.windowDays,
      hasRecurringHashtags: hashtags.some((h) => (h.uses ?? 0) >= 2),
      cadenceLabelPt: buildCadenceLabelPt({
        weekly: enriched.cadence.sufficient
          ? (enriched.cadence.weekly ?? null)
          : null,
        sufficient: enriched.cadence.sufficient,
      }),
      hashtagsState: classifyHashtagsState(hashtags),
      topHashtags: pickHashtagsForVerdict(hashtags, 2),
    });
    const resolved = deriveEditorialVerdict(
      enriched.aiInsightsV2?.editorialVerdict ?? null,
      metrics,
      fallback,
    ).verdict;
    return { title: resolved.title, paragraph: resolved.paragraph };
  }, [
    enriched.cadence,
    enriched.aiInsightsV2,
    k.engagementRate,
    k.engagementBenchmark,
    k.postsAnalyzed,
    avgLikes,
    avgComments,
    result.data.competitors.length,
    result.data.topHashtags,
    t,
  ]);

  const signals = useMemo(
    () => computeAttentionSignals(result, t).slice(0, 3),
    [result, t],
  );

  return {
    profile: {
      username: result.data.profile.username,
      fullName: result.data.profile.fullName ?? null,
      avatarUrl: enriched.profile.avatarUrl,
      followers: result.data.profile.followers,
      postsAnalyzed: k.postsAnalyzed,
      tierLabel: tierLabelFromFollowers(result.data.profile.followers),
    },
    windowLabel: result.data.meta?.windowLabel ?? null,
    verdict,
    score,
    signals,
    engagement: {
      rate: k.engagementRate,
      benchmark: k.engagementBenchmark,
      deltaPct: k.engagementDeltaPct,
      hasBenchmark: k.engagementBenchmark > 0,
    },
    postingFrequencyWeekly: k.postingFrequencyWeekly,
  };
}
