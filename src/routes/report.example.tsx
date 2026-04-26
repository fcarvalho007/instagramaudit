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
    scripts: [
      // Pre-hydration: flip <body> to the light palette before the first
      // paint on hard reloads. The ReportThemeWrapper does the same for SPA
      // navigations and restores the dark default on unmount.
      {
        children: `document.body.setAttribute("data-theme","light")`,
      },
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
