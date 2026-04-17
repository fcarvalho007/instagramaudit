import { useEffect, useState, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { AnalysisErrorState } from "@/components/product/analysis-error-state";
import { AnalysisSkeleton } from "@/components/product/analysis-skeleton";
import { PublicAnalysisDashboard } from "@/components/product/public-analysis-dashboard";
import { fetchPublicAnalysis } from "@/lib/analysis/client";
import type { PublicAnalysisResponse } from "@/lib/analysis/types";

export const Route = createFileRoute("/analyze/$username")({
  // SSR-disabled: the analysis fetch runs only in the browser to keep the
  // Apify boundary inside the server route and avoid SSR-time fetch loops.
  ssr: false,
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
  const cleaned = username.replace(/^@/, "");

  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "ready"; data: PublicAnalysisResponse }
  >({ status: "loading" });

  const load = useCallback(async () => {
    setState({ status: "loading" });
    const data = await fetchPublicAnalysis(cleaned);
    setState({ status: "ready", data });
  }, [cleaned]);

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
