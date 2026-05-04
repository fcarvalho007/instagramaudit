/**
 * DEV-ONLY — Visual QA preview of the AnalysisSkeleton loading screen.
 *
 * Opens at: /dev-loading-preview
 *
 * This route renders the skeleton in isolation with zero backend calls.
 * It exists solely for visual testing during development.
 * Do NOT link this route publicly or include it in navigation.
 */
import { createFileRoute } from "@tanstack/react-router";
import { AnalysisSkeleton } from "@/components/product/analysis-skeleton";

export const Route = createFileRoute("/dev-loading-preview")({
  component: LoadingPreview,
});

function LoadingPreview() {
  return <AnalysisSkeleton username="frederico.m.carvalho" />;
}
