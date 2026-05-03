import { useMemo, type ReactNode } from "react";

import type { AdapterResult } from "@/lib/report/snapshot-to-report-data";
import type { AiInsightV2Section } from "@/lib/insights/types";

import { ComparisonHeader } from "./overview/comparison-header";
import { ScoreGrid } from "./overview/score-grid";
import {
  computeEnvolvimento,
  envolvimentoSubtitle,
  computeFrequencia,
  frequenciaSubtitle,
  computeInteraccao,
  interaccaoSubtitle,
  computeMensagem,
  mensagemSubtitle,
  type ScoreKey,
} from "./overview/score-utils";
import { EngagementCardRefined } from "./report-overview-engagement";
import { ReportTopPosts } from "@/components/report/report-top-posts";

export interface Props {
  result: AdapterResult;
  renderInsight: (key: AiInsightV2Section) => ReactNode;
}

export function ReportOverviewBlock({ result, renderInsight }: Props) {
  const k = result.data.keyMetrics;
  const profile = result.data.profile;
  const enriched = result.enriched;
  const coverage = result.coverage;

  // Compute avg comments from enriched top posts
  const avgComments = useMemo(() => {
    const posts = enriched.topPosts;
    if (!posts.length) return 0;
    return posts.reduce((sum, p) => sum + p.comments, 0) / posts.length;
  }, [enriched.topPosts]);

  const scores: Record<ScoreKey, { value: number; subtitle: string }> = useMemo(() => ({
    envolvimento: {
      value: computeEnvolvimento(k.engagementRate, k.engagementBenchmark),
      subtitle: envolvimentoSubtitle(k.engagementRate, k.engagementBenchmark),
    },
    frequencia: {
      value: computeFrequencia(k.postingFrequencyWeekly),
      subtitle: frequenciaSubtitle(k.postingFrequencyWeekly),
    },
    interaccao: {
      value: computeInteraccao(avgComments, k.postsAnalyzed, 0, 0),
      subtitle: interaccaoSubtitle(avgComments),
    },
    mensagem: {
      value: computeMensagem(null, null, null),
      subtitle: mensagemSubtitle(50),
    },
  }), [k, avgComments]);

  return (
    <div className="relative space-y-5 md:space-y-6">
      {/* Zona A — Header de comparação */}
      <ComparisonHeader
        handle={profile.username ?? ""}
        avatarUrl={enriched.profile.avatarUrl}
        isVerified={Boolean(profile.verified)}
        followers={profile.followers ?? 0}
        postsAnalyzed={profile.postsAnalyzed ?? k.postsAnalyzed}
        daysAnalyzed={coverage.windowDays ?? 0}
      />

      {/* Zona B — Pontuação global */}
      <div className="pt-4">
        <ScoreGrid scores={scores} />
      </div>

      {/* Zona C — Card de Taxa de Envolvimento refinado */}
      <div className="pt-4">
        <EngagementCardRefined result={result} />
      </div>

      {/* Top Posts */}
      <div className="pt-2">
        <ReportTopPosts />
        <div className="mt-4">{renderInsight("topPosts")}</div>
      </div>
    </div>
  );
}
