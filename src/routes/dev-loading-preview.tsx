/**
 * DEV-ONLY — Visual QA preview of the AnalysisSkeleton loading screen.
 *
 * Opens at: /dev-loading-preview
 *
 * This route renders the skeleton in isolation with zero backend calls,
 * wrapped in ReportThemeWrapper to match the real /analyze/$username context.
 * Do NOT link this route publicly or include it in navigation.
 */
import { createFileRoute } from "@tanstack/react-router";
import { AnalysisSkeleton } from "@/components/product/analysis-skeleton";
import { ReportThemeWrapper } from "@/components/report/report-theme-wrapper";

export const Route = createFileRoute("/dev-loading-preview")({
  component: LoadingPreview,
});

function LoadingPreview() {
  return (
    <ReportThemeWrapper>
      <div className="-mt-8 -mb-24">
        <AnalysisSkeleton username="frederico.m.carvalho" />
      </div>
    </ReportThemeWrapper>
  );
}
