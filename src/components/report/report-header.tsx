import { Download, Share2 } from "lucide-react";
import { useReportData } from "./report-data-context";
import { cn } from "@/lib/utils";

export function ReportHeader() {
  const { profile } = reportData;
  return (
    <div className="bg-surface-secondary border border-border-default/40 rounded-xl shadow-card p-6 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="flex items-center gap-4 md:gap-5">
          <div
            className={cn(
              "h-14 w-14 md:h-16 md:w-16 rounded-full bg-gradient-to-br shrink-0 ring-2 ring-white",
              profile.avatarGradient,
            )}
            aria-hidden="true"
          />
          <div className="min-w-0">
            <h1 className="font-display text-2xl md:text-[28px] font-medium tracking-tight text-content-primary leading-tight">
              @{profile.username}
            </h1>
            <p className="font-mono text-xs uppercase tracking-wide text-content-tertiary mt-1">
              Análise · {profile.postsAnalyzed} publicações ·{" "}
              {profile.analyzedAt}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-tint-success border border-signal-success/20">
            <span className="h-1.5 w-1.5 rounded-full bg-signal-success" />
            <span className="font-mono text-[10px] uppercase tracking-wider text-signal-success font-semibold">
              Relatório completo
            </span>
          </span>
          <button
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border-default/40 hover:border-border-strong/60 text-sm font-medium text-content-primary transition-colors"
          >
            <Download className="size-4" />
            Exportar PDF
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-primary text-white text-sm font-medium hover:opacity-90 transition-opacity shadow-sm"
          >
            <Share2 className="size-4" />
            Partilhar
          </button>
        </div>
      </div>
    </div>
  );
}
