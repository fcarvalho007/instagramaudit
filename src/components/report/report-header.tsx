import { Download, Loader2, Share2 } from "lucide-react";
import { useReportData } from "./report-data-context";
import { cn } from "@/lib/utils";

export interface ReportHeaderActions {
  onExportPdf?: () => void;
  onShare?: () => void;
  pdfBusy?: boolean;
  pdfDisabled?: boolean;
  shareBusy?: boolean;
}

export function ReportHeader({ actions }: { actions?: ReportHeaderActions } = {}) {
  const reportData = useReportData();
  const { profile } = reportData;
  const isAdminPreview = reportData.meta?.isAdminPreview ?? false;
  const pdfBusy = actions?.pdfBusy ?? false;
  const pdfDisabled = (actions?.pdfDisabled ?? !actions?.onExportPdf) || pdfBusy;
  const shareBusy = actions?.shareBusy ?? false;
  const shareDisabled = !actions?.onShare || shareBusy;
  return (
    <div className="bg-surface-secondary border border-border-default rounded-2xl shadow-card p-6 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="flex items-center gap-4 md:gap-5">
          <div
            className={cn(
              "h-14 w-14 md:h-16 md:w-16 rounded-full bg-gradient-to-br shrink-0 ring-1 ring-border-default",
              profile.avatarGradient,
            )}
            aria-hidden="true"
          />
          <div className="min-w-0">
            <h1 className="font-display text-2xl md:text-[28px] font-medium tracking-tight text-content-primary leading-tight">
              @{profile.username}
            </h1>
            <p className="text-eyebrow text-content-secondary mt-1.5">
              Análise · {profile.postsAnalyzed} publicações ·{" "}
              {profile.analyzedAt}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isAdminPreview ? (
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-signal-warning/30">
              <span className="h-1.5 w-1.5 rounded-full bg-signal-warning" />
              <span className="text-eyebrow-sm text-signal-warning font-semibold">
                Pré-visualização admin
              </span>
            </span>
          ) : (
            <>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-signal-success/30">
                <span className="h-1.5 w-1.5 rounded-full bg-signal-success" />
                <span className="text-eyebrow-sm text-signal-success font-semibold">
                  Relatório completo
                </span>
              </span>
              <button
                type="button"
                onClick={actions?.onExportPdf}
                disabled={pdfDisabled}
                aria-busy={pdfBusy}
                title={
                  !actions?.onExportPdf
                    ? "Disponível na página de análise real"
                    : pdfBusy
                      ? "A preparar PDF…"
                      : undefined
                }
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border-default hover:border-border-strong text-sm font-medium text-content-primary transition-colors disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pdfBusy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Download className="size-4" />
                )}
                {pdfBusy ? "A preparar…" : "Exportar PDF"}
              </button>
              <button
                type="button"
                onClick={actions?.onShare}
                disabled={shareDisabled}
                title={
                  !actions?.onShare
                    ? "Disponível na página de análise real"
                    : undefined
                }
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-primary text-content-inverse text-sm font-medium hover:opacity-90 transition-opacity shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Share2 className="size-4" />
                Partilhar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
