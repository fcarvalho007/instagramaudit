import { useMemo, type ReactNode } from "react";

import type { AdapterResult, SnapshotPayload } from "@/lib/report/snapshot-to-report-data";
import type { AiInsightV2Section } from "@/lib/insights/types";

import {
  computeEnvolvimento,
  envolvimentoSubtitle,
  computeFrequencia,
  frequenciaSubtitle,
  computeInteraccao,
  interaccaoSubtitle,
  type ScoreKey,
} from "./overview/score-utils";
import { EditorialIdentityCard } from "./overview/editorial-identity-card";
import { EngagementCardRefined } from "./report-overview-engagement";
import { FrequencyCard } from "./overview/frequency-card";
import { FormatCard, type FormatEntry } from "./overview/format-card";
import { PostComparisonBlock } from "./report-post-comparison";
import {
  classifyContentType,
  classifyFunnelStage,
  classifyAudienceResponse,
  classifyChannelIntegration,
  inferProbableObjective,
} from "@/lib/report/block02-diagnostic";
import { buildDiagnosticCards } from "./overview/diagnostic-summary";
import type { SummaryCardData } from "./overview/diagnostic-summary";

export interface Props {
  result: AdapterResult;
  renderInsight: (key: AiInsightV2Section) => ReactNode;
  payload?: SnapshotPayload;
}

export function ReportOverviewBlock({ result, renderInsight, payload }: Props) {
  const k = result.data.keyMetrics;
  const enriched = result.enriched;

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
  }), [k, avgComments]);

  const diagnosticCards = useMemo(() => {
    const posts = payload?.posts ?? [];
    const bio = enriched.profile.bio ?? null;
    const externalUrls = enriched.profile.externalUrls ?? [];
    const contentType = classifyContentType(posts);
    const funnel = classifyFunnelStage(posts);
    const audience = classifyAudienceResponse(posts);
    const integration = classifyChannelIntegration(bio, externalUrls, posts);
    const objective = inferProbableObjective({ contentType, funnel, integration, bio, audience });
    return buildDiagnosticCards(contentType, funnel, objective);
  }, [payload?.posts, enriched.profile.bio, enriched.profile.externalUrls]);

  const formatEntries: FormatEntry[] = useMemo(() => {
    return result.data.formatBreakdown.map((f) => ({
      format: f.format as "Reels" | "Carousels" | "Imagens",
      sharePct: f.sharePct,
      count: Math.round((f.sharePct / 100) * k.postsAnalyzed),
    }));
  }, [result.data.formatBreakdown, k.postsAnalyzed]);

  return (
    <div className="relative space-y-8 md:space-y-10">

      {/* Zona B — 6-card summary grid (3 scores + 3 diagnostic) */}
      {/* Zona B — Editorial Identity Card (replaces 6-card grid) */}
      <EditorialIdentityCard
        scores={scores}
        aiHeroText={enriched.aiInsightsV2?.sections.hero?.text ?? null}
      />

      {/* Zona C — Card de Taxa de Envolvimento */}
      <EngagementCardRefined result={result} />

      {/* Zona D — Frequência + Tipo de conteúdo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
        <FrequencyCard
          postsAnalyzed={k.postsAnalyzed}
          windowDays={result.coverage.windowDays}
          postingFrequencyWeekly={k.postingFrequencyWeekly}
          calendarDays={enriched.postingTimeline}
        />
        <FormatCard
          postsAnalyzed={k.postsAnalyzed}
          dominantFormat={k.dominantFormat}
          dominantFormatShare={k.dominantFormatShare}
          formats={formatEntries}
          analysedPostFormats={enriched.analysedPostFormats}
        />
      </div>

      {/* Best vs Worst Posts */}
      <PostComparisonBlock
        topPosts={result.enriched.topPosts}
        bottomPosts={result.enriched.bottomPosts}
        renderInsight={() => renderInsight("topPosts")}
        windowLabel={result.data.meta?.windowShortLabel}
      />
    </div>
  );
}
