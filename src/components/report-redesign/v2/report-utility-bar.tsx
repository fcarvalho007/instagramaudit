import { Download, Loader2, Share2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { AdapterResult } from "@/lib/report/snapshot-to-report-data";
import type { ReportPageActions } from "@/components/report/report-page";
import { ShareReportPopover } from "@/components/report-share/share-popover";
import { cn } from "@/lib/utils";

interface ReportUtilityBarProps {
  result: AdapterResult;
  actions: ReportPageActions;
  /** When false, the bar is hidden (collapsed state). */
  visible: boolean;
}

/**
 * Sticky compact utility bar shown when the user scrolls past the hero on
 * `/analyze/$username`. Replaces the institutional nav (which is hidden via
 * `analyze-header-collapse.css`) with product actions: PDF, Share, and a
 * jump-to-benchmark "Add competitor" anchor.
 *
 * Pure presentation — never mutates report data, never calls the backend.
 */
export function ReportUtilityBar({
  result,
  actions,
  visible,
}: ReportUtilityBarProps) {
  const { t } = useTranslation("report");

  return (
    <div
      aria-hidden={!visible}
      className={cn(
        "sticky z-30 top-16 md:top-20",
        "border-b border-border-default bg-surface-base/95 backdrop-blur-md",
        "transition-[opacity,transform] duration-150 ease-out",
        visible
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 -translate-y-1 pointer-events-none",
      )}
    >
      <div className="mx-auto max-w-[1520px] px-3 sm:px-6">
        <div className="flex items-center justify-end gap-1.5 sm:gap-2 h-11">
          <button
            type="button"
            onClick={actions.onExportPdf}
            disabled={actions.pdfDisabled || actions.pdfBusy}
            aria-busy={actions.pdfBusy}
            aria-label={t("hero.actions.pdf")}
            title={t("hero.actions.pdf")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg",
              "border border-border-default bg-white text-content-secondary",
              "px-2.5 sm:px-3 h-8 text-xs sm:text-sm font-medium",
              "transition-colors duration-150",
              "hover:bg-surface-muted hover:border-border-strong hover:text-content-primary",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            {actions.pdfBusy ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Download className="size-3.5" aria-hidden="true" />
            )}
            <span className="hidden sm:inline">{t("hero.actions.pdf")}</span>
          </button>
          <ShareReportPopover
            result={result}
            customTrigger={
              <button
                type="button"
                aria-label={t("hero.actions.share")}
                title={t("hero.actions.share")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg",
                  "border border-border-default bg-white text-content-secondary",
                  "px-2.5 sm:px-3 h-8 text-xs sm:text-sm font-medium",
                  "transition-colors duration-150",
                  "hover:bg-surface-muted hover:border-border-strong hover:text-content-primary",
                )}
              >
                <Share2 className="size-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">
                  {t("hero.actions.share")}
                </span>
              </button>
            }
          />
        </div>
      </div>
    </div>
  );
}