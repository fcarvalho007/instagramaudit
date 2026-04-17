import { useEffect, useState, useCallback, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { AnalysisErrorState } from "@/components/product/analysis-error-state";
import { AnalysisSkeleton } from "@/components/product/analysis-skeleton";
import { PublicAnalysisDashboard } from "@/components/product/public-analysis-dashboard";
import { fetchPublicAnalysis } from "@/lib/analysis/client";
import type { PublicAnalysisResponse } from "@/lib/analysis/types";

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
    };
  },
  component: AnalyzePage,
});

function AnalyzePage() {
  const { username } = Route.useParams();
  const { vs } = Route.useSearch();
  const cleaned = username.replace(/^@/, "");

  // Parse competitors from the `?vs=` query string. Capped at 2.
  const competitors = useMemo(() => {
    if (!vs) return [];
    return vs
      .split(",")
      .map((s) => s.trim().replace(/^@/, ""))
      .filter((s) => s.length > 0)
      .slice(0, 2);
  }, [vs]);

  const competitorsKey = competitors.join(",");

  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "ready"; data: PublicAnalysisResponse }
  >({ status: "loading" });

  const load = useCallback(async () => {
    setState({ status: "loading" });
    const data = await fetchPublicAnalysis(cleaned, competitors);
    setState({ status: "ready", data });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleaned, competitorsKey]);

  useEffect(() => {
    void load();
  }, [load]);

  if (state.status === "loading") {
    return <AnalysisSkeleton username={cleaned} />;
  }

  if (!state.data.success) {
    return (
      <AnalysisErrorState
        message={state.data.message}
        onRetry={() => void load()}
      />
    );
  }

  return <PublicAnalysisDashboard data={state.data} />;
}
