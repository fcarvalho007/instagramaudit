import { Container } from "@/components/layout/container";
import { computeBenchmarkPositioning } from "@/lib/benchmark/engine";
import type { PublicAnalysisSuccess } from "@/lib/analysis/types";
import { formatPercent } from "@/lib/mock-analysis";

import { AnalysisBenchmarkBlock } from "./analysis-benchmark-block";
import { AnalysisCompetitorComparison } from "./analysis-competitor-comparison";
import { AnalysisHeader } from "./analysis-header";
import { AnalysisMetricCard } from "./analysis-metric-card";
import { PremiumLockedSection } from "./premium-locked-section";

interface PublicAnalysisDashboardProps {
  data: PublicAnalysisSuccess;
}

// Stable, non-personalised premium teasers — the gate must look credible
// without leaking made-up numbers per profile until the real engine ships.
const PREMIUM_TEASERS = {
  estimatedReach: "12K – 38K",
  aiInsightsCount: 3,
  opportunitiesCount: 5,
  recommendations30d: 7,
};

function formatPostsPerWeek(value: number): string {
  return value.toFixed(1).replace(".", ",");
}

export function PublicAnalysisDashboard({
  data,
}: PublicAnalysisDashboardProps) {
  const { profile, content_summary } = data;

  // Prefer the server-precomputed positioning (resolved against the
  // cloud-managed benchmark dataset). Fall back to a local computation
  // using the in-code defaults for backward compatibility with older
  // responses that don't carry the field.
  const positioning =
    data.benchmark_positioning ??
    computeBenchmarkPositioning({
      followers: profile.followers_count,
      engagement: content_summary.average_engagement_rate,
      dominantFormat: content_summary.dominant_format,
    });

  const benchmarkReference =
    positioning.status === "available"
      ? positioning.benchmarkValue
      : content_summary.average_engagement_rate;

  const engagementDelta =
    content_summary.average_engagement_rate - benchmarkReference;

  return (
    <div className="bg-surface-base">
      <Container size="lg" as="section" className="py-10 md:py-16 space-y-12 md:space-y-16">
        <AnalysisHeader
          username={profile.username}
          displayName={profile.display_name}
          followers={profile.followers_count}
          avatarUrl={profile.avatar_url}
          isVerified={profile.is_verified}
          bio={profile.bio}
        />

        <section aria-labelledby="metrics-heading" className="space-y-5">
          <header className="flex items-baseline justify-between gap-4">
            <h2
              id="metrics-heading"
              className="font-display text-lg font-medium text-content-primary tracking-tight"
            >
              Métricas-chave
            </h2>
            <span className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-content-tertiary">
              {`${content_summary.posts_analyzed} publicações analisadas`}
            </span>
          </header>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <AnalysisMetricCard
              label="Envolvimento médio"
              value={formatPercent(content_summary.average_engagement_rate)}
              hint={
                positioning.status === "available"
                  ? engagementDelta >= 0
                    ? `+${formatPercent(engagementDelta)} vs benchmark`
                    : `${formatPercent(engagementDelta)} vs benchmark`
                  : "benchmark indisponível"
              }
              emphasis
            />
            <AnalysisMetricCard
              label="Publicações analisadas"
              value={String(content_summary.posts_analyzed)}
              hint="amostra recente"
            />
            <AnalysisMetricCard
              label="Frequência semanal"
              value={formatPostsPerWeek(content_summary.estimated_posts_per_week)}
              hint="publicações por semana"
            />
            <AnalysisMetricCard
              label="Formato dominante"
              value={content_summary.dominant_format}
              hint={`média de ${content_summary.average_likes.toLocaleString("pt-PT")} gostos`}
            />
          </div>
        </section>

        <AnalysisBenchmarkBlock positioning={positioning} />

        <AnalysisCompetitorComparison
          primary={{ profile, content_summary }}
          competitors={data.competitors}
        />

        <PremiumLockedSection
          teasers={PREMIUM_TEASERS}
          username={profile.username}
          analysisSnapshotId={data.analysis_snapshot_id}
        />
      </Container>
    </div>
  );
}
