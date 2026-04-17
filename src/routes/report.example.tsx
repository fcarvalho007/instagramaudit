import { createFileRoute } from "@tanstack/react-router";
import { ReportThemeWrapper } from "@/components/report/report-theme-wrapper";
import { ReportPage } from "@/components/report/report-page";

export const Route = createFileRoute("/report/example")({
  head: () => ({
    meta: [
      { title: "Relatório · @frederico.marketing · InstaBench" },
      {
        name: "description",
        content: "Exemplo de relatório analítico completo do InstaBench.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ReportRoute,
});

function ReportRoute() {
  return (
    <ReportThemeWrapper>
      <ReportPage />
    </ReportThemeWrapper>
  );
}
