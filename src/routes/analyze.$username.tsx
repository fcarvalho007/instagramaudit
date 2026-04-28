import { useEffect, useState, useCallback, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { AnalysisErrorState } from "@/components/product/analysis-error-state";
import { AnalysisSkeleton } from "@/components/product/analysis-skeleton";
import { ReportPage } from "@/components/report/report-page";
import { ReportThemeWrapper } from "@/components/report/report-theme-wrapper";
import { ScopeStrip } from "@/components/report-tier/scope-strip";
import { TierComparisonBlock } from "@/components/report-tier/tier-comparison-block";
import { ReportMarketSignals } from "@/components/report-market-signals/report-market-signals";
import { ReportEnrichedBio } from "@/components/report-enriched/report-enriched-bio";
import { ReportEnrichedBenchmarkSource } from "@/components/report-enriched/report-enriched-benchmark-source";
import { ReportEnrichedTopLinks } from "@/components/report-enriched/report-enriched-top-links";
import { ReportEnrichedMentions } from "@/components/report-enriched/report-enriched-mentions";
import { ReportEnrichedCompetitorsCta } from "@/components/report-enriched/report-enriched-competitors-cta";
import { ReportEnrichedAiInsights } from "@/components/report-enriched/report-enriched-ai-insights";
import { ReportFinalBlock } from "@/components/report-share/report-final-block";
import { Toaster } from "@/components/ui/sonner";
import { fetchPublicAnalysis } from "@/lib/analysis/client";
import {
  snapshotToReportData,
  type AdapterResult,
  type ReportBenchmarkInput,
  type SnapshotMetadata,
  type SnapshotPayload,
} from "@/lib/report/snapshot-to-report-data";

interface AnalyzeSearch {
  vs?: string;
}

export const Route = createFileRoute("/analyze/$username")({
  // SSR-disabled: the analysis fetch runs only in the browser to keep the
  // Apify boundary inside the server route and avoid SSR-time fetch loops.
  ssr: false,
  validateSearch: (search: Record<string, unknown>): AnalyzeSearch => ({
    vs: typeof search.vs === "string" ? search.vs : undefined,
  }),
  head: ({ params }) => {
    const handle = params.username.replace(/^@/, "");
    return {
      meta: [
        {
          title: `Análise de @${handle} · InstaBench`,
        },
        {
          name: "description",
          content: `Análise pública do perfil @${handle} no Instagram. Métricas, benchmark e comparação com concorrentes.`,
        },
        {
          property: "og:title",
          content: `Análise de @${handle} · InstaBench`,
        },
        {
          property: "og:description",
          content: `Análise pública do perfil @${handle} no Instagram. Métricas, benchmark e comparação com concorrentes.`,
        },
      ],
      scripts: [
        // Pré-hidratação: paleta clara antes do primeiro paint em hard reloads,
        // espelhando o comportamento do `/report/example` para evitar flicker
        // dark→light na entrada por SSR-off.
        { children: `document.body.setAttribute("data-theme","light")` },
      ],
    };
  },
  component: AnalyzePage,
});

interface SnapshotResponse {
  success: boolean;
  snapshot?: {
    id: string;
    instagram_username: string;
    payload: SnapshotPayload;
    meta: SnapshotMetadata;
    created_at: string;
    updated_at: string;
    benchmark?: ReportBenchmarkInput;
  } | null;
  error_code?: string;
  message?: string;
}

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; result: AdapterResult; snapshotId: string };

function AnalyzePage() {
  const { username } = Route.useParams();
  const { vs } = Route.useSearch();
  const cleaned = username.replace(/^@/, "");

  // Parse competitors from the `?vs=` query string. Capped at 2.
  const competitors = useMemo(() => {
    if (!vs) return [];
    return vs
      .split(",")
      .map((s: string) => s.trim().replace(/^@/, ""))
      .filter((s: string) => s.length > 0)
      .slice(0, 2);
  }, [vs]);

  const competitorsKey = competitors.join(",");

  const [state, setState] = useState<LoadState>({ status: "loading" });

  const load = useCallback(async () => {
    setState({ status: "loading" });
    // Step 1 — trigger the public analyze pipeline. This guarantees a fresh
    // snapshot is recolhida (or served from cache/stale) and persisted in
    // `analysis_snapshots` before we ask for the full payload.
    const analysis = await fetchPublicAnalysis(cleaned, competitors);
    if (!analysis.success) {
      setState({ status: "error", message: analysis.message });
      return;
    }

    // Step 2 — fetch the persisted snapshot (full payload + server-resolved
    // benchmark) and run the editorial adapter on the client.
    try {
      const res = await fetch(
        `/api/public/analysis-snapshot/${encodeURIComponent(cleaned)}`,
      );
      const body = (await res.json().catch(() => null)) as SnapshotResponse | null;
      if (!res.ok || !body?.success || !body.snapshot) {
        setState({
          status: "error",
          message:
            body?.message ??
            "Não foi possível carregar este relatório. Tentar novamente dentro de instantes.",
        });
        return;
      }
      const result = snapshotToReportData({
        payload: body.snapshot.payload ?? {},
        meta: body.snapshot.meta ?? undefined,
        benchmark: body.snapshot.benchmark,
        isAdminPreview: false,
      });
      setState({ status: "ready", result, snapshotId: body.snapshot.id });
    } catch {
      setState({
        status: "error",
        message: "Falha de ligação. Tentar novamente.",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleaned, competitorsKey]);

  useEffect(() => {
    void load();
  }, [load]);

  if (state.status === "loading") {
    return <AnalysisSkeleton username={cleaned} />;
  }

  if (state.status === "error") {
    return (
      <AnalysisErrorState
        message={state.message}
        onRetry={() => void load()}
      />
    );
  }

  return (
    <ReportThemeWrapper>
      <div className="bg-surface-base min-h-screen">
        {/* 1. Perfil + métricas primeiro — utilizador chega depressa aos dados */}
        <ReportEnrichedBio
          enriched={state.result.enriched}
          username={state.result.data.profile.username}
        />
        <CoverageStrip result={state.result} />
        <ReportPage data={state.result.data} />

        {/* Companion ao ReportAiInsights locked: confidence + evidence + meta. */}
        <ReportEnrichedAiInsights enriched={state.result.enriched} />

        {/* 2. Camadas enriquecidas */}
        <ReportEnrichedBenchmarkSource enriched={state.result.enriched} />
        <ReportEnrichedTopLinks enriched={state.result.enriched} />
        <ReportEnrichedMentions enriched={state.result.enriched} />
        {state.result.coverage.competitors === "empty" ? (
          <ReportEnrichedCompetitorsCta />
        ) : null}
        <ReportMarketSignals snapshotId={state.snapshotId} plan="free" />

        {/* 3. Posicionamento + comparação Free vs Pro */}
        <ScopeStrip />
        <TierComparisonBlock />

        {/* 4. Bloco final único: PDF como deliverable + partilha + feedback */}
        <ReportFinalBlock snapshotId={state.snapshotId} />
      </div>
      <Toaster />
    </ReportThemeWrapper>
  );
}

function CoverageStrip({ result }: { result: AdapterResult }) {
  const c = result.coverage;
  const meta = result.data.meta;
  const windowValue = c.windowDays > 0 ? `${c.windowDays} dias` : "amostra";
  const benchmarkValue =
    c.benchmark === "real"
      ? meta?.benchmarkDatasetVersion
        ? `dataset ${meta.benchmarkDatasetVersion}`
        : "ligados"
      : c.benchmark === "partial"
        ? "parciais"
        : "em afinação";
  const competitorsValue = c.competitors === "empty" ? "ausentes" : "presentes";

  return (
    <div className="mx-auto max-w-7xl px-6 pt-8">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-border-subtle/40 pb-4">
        <CoverageItem label="publicações" value={String(c.postsAvailable)} />
        <CoverageItem label="janela" value={windowValue} />
        <CoverageItem label="benchmark" value={benchmarkValue} />
        <CoverageItem label="concorrentes" value={competitorsValue} />
      </div>
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-content-tertiary pt-3">
        Relatório baseado em dados públicos do Instagram · amostra recolhida automaticamente.
      </p>
    </div>
  );
}

function CoverageItem({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-baseline gap-2">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-content-tertiary">
        {label}
      </span>
      <span className="font-mono text-xs text-content-secondary">{value}</span>
    </span>
  );
}
