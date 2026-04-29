import { Film, LayoutGrid, Image as ImageIcon } from "lucide-react";
import { ReportSection } from "./report-section";
import { useReportData } from "./report-data-context";
import { cn } from "@/lib/utils";

const ICONS = {
  Reels: Film,
  Carousels: LayoutGrid,
  Imagens: ImageIcon,
} as const;

const STATUS_LABELS = {
  abaixo: { text: "Abaixo do benchmark", tone: "danger" as const },
  acima: { text: "Acima do benchmark", tone: "success" as const },
  "ligeiramente-acima": {
    text: "Ligeiramente acima",
    tone: "warning" as const,
  },
};

const TINT = {
  primary: { bg: "bg-tint-primary", fg: "text-accent-primary" },
  success: { bg: "bg-tint-success", fg: "text-signal-success" },
  warning: { bg: "bg-tint-warning", fg: "text-signal-warning" },
};

const TONE = {
  danger: "border-signal-danger/30 text-signal-danger",
  success: "border-signal-success/30 text-signal-success",
  warning: "border-signal-warning/30 text-signal-warning",
};

export function ReportFormatBreakdown() {
  const reportData = useReportData();
  return (
    <ReportSection
      label="Análise por formato"
      title="Desempenho por tipo de publicação"
      subtitle="Cada formato comparado com o benchmark do mesmo escalão."
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
        {reportData.formatBreakdown.map((f) => {
          const Icon = ICONS[f.format as keyof typeof ICONS];
          const tint = TINT[f.tint];
          const status = STATUS_LABELS[f.status];
          const max = Math.max(f.engagement, f.benchmark) * 1.5;
          const valuePct = (f.engagement / max) * 100;
          const benchPct = (f.benchmark / max) * 100;

          return (
            <div
              key={f.format}
              className="bg-surface-secondary border border-border-default rounded-2xl shadow-card p-6 md:p-7 flex flex-col gap-5"
            >
              <div className="flex items-start justify-between">
                <div
                  className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center",
                    tint.bg,
                  )}
                >
                  <Icon className={cn("size-5", tint.fg)} />
                </div>
                <span
                  className={cn(
                    "inline-flex items-center px-2.5 py-1 rounded-full border font-mono text-[10px] uppercase tracking-[0.12em] font-semibold",
                    TONE[status.tone],
                  )}
                >
                  {status.text}
                </span>
              </div>

              <div>
                <h3 className="font-sans text-[18px] font-medium tracking-[-0.01em] text-content-primary">
                  {f.format}
                </h3>
                <p className="font-mono text-[10px] text-content-tertiary uppercase tracking-[0.12em] mt-1">
                  {f.sharePct}% do conteúdo
                </p>
              </div>

              <div className="space-y-2">
                <div className="relative h-2 w-full rounded-full bg-surface-muted overflow-hidden">
                  <div
                    className="absolute left-0 top-0 h-full rounded-full bg-accent-primary"
                    style={{ width: `${valuePct}%` }}
                  />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 h-3 w-px bg-content-primary/60 rounded-full"
                    style={{ left: `calc(${benchPct}% - 1px)` }}
                  />
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="font-sans text-[22px] font-medium tracking-[-0.01em] text-content-primary">
                    {f.engagement.toString().replace(".", ",")}%
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-content-tertiary">
                    bench {f.benchmark.toString().replace(".", ",")}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ReportSection>
  );
}
