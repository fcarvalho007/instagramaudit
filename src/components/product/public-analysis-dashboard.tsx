import { Container } from "@/components/layout/container";
import {
  formatPercent,
  type AnalysisData,
} from "@/lib/mock-analysis";

import { AnalysisBenchmarkBlock } from "./analysis-benchmark-block";
import { AnalysisCompetitorComparison } from "./analysis-competitor-comparison";
import { AnalysisHeader } from "./analysis-header";
import { AnalysisMetricCard } from "./analysis-metric-card";
import { PremiumLockedSection } from "./premium-locked-section";

interface PublicAnalysisDashboardProps {
  data: AnalysisData;
}

export function PublicAnalysisDashboard({
  data,
}: PublicAnalysisDashboardProps) {
  const { profile, metrics, benchmark, benchmarkPositioning, competitors, premiumTeasers } = data;

  return (
    <div className="bg-surface-base">
      <Container size="lg" as="section" className="py-10 md:py-16 space-y-12 md:space-y-16">
        <AnalysisHeader profile={profile} />

        <section aria-labelledby="metrics-heading" className="space-y-5">
          <header className="flex items-baseline justify-between gap-4">
            <h2
              id="metrics-heading"
              className="font-display text-lg font-medium text-content-primary tracking-tight"
            >
              Métricas-chave
            </h2>
            <span className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-content-tertiary">
              Últimos 30 dias
            </span>
          </header>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <AnalysisMetricCard
              label="Envolvimento médio"
              value={formatPercent(metrics.engagement)}
              hint={
                metrics.engagement > benchmark.reference
                  ? `+${formatPercent(metrics.engagement - benchmark.reference)} vs benchmark`
                  : `${formatPercent(metrics.engagement - benchmark.reference)} vs benchmark`
              }
              emphasis
            />
            <AnalysisMetricCard
              label="Publicações analisadas"
              value={String(metrics.postsAnalyzed)}
              hint="janela de 30 dias"
            />
            <AnalysisMetricCard
              label="Frequência semanal"
              value={metrics.weeklyFrequency.toString().replace(".", ",")}
              hint="publicações por semana"
            />
            <AnalysisMetricCard
              label="Formato dominante"
              value={metrics.dominantFormat}
              hint={`${metrics.dominantFormatShare}% do conteúdo`}
            />
          </div>
        </section>

        <AnalysisBenchmarkBlock positioning={benchmarkPositioning} />

        <AnalysisCompetitorComparison competitors={competitors} />

        <PremiumLockedSection teasers={premiumTeasers} username={profile.handle} />
      </Container>
    </div>
  );
}
