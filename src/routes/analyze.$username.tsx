import { createFileRoute } from "@tanstack/react-router";

import { PublicAnalysisDashboard } from "@/components/product/public-analysis-dashboard";
import { getMockAnalysis } from "@/lib/mock-analysis";

export const Route = createFileRoute("/analyze/$username")({
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
  const data = getMockAnalysis(username);
  return <PublicAnalysisDashboard data={data} />;
}
