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
          const actualBarClass =
            f.status === "abaixo"
              ? "bg-signal-danger"
              : f.status === "acima"
                ? "bg-signal-success"
                : "bg-accent-primary";

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

              <div className="space-y-3">
                {/* Barra "Atual" — cor depende da posição face ao benchmark */}
                <div className="space-y-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-content-secondary">
                      Atual
                    </span>
                    <span className="font-sans text-[18px] font-medium tracking-[-0.01em] text-content-primary tabular-nums">
                      {f.engagement.toString().replace(".", ",")}%
                    </span>
                  </div>
                  <div className="relative h-2 w-full rounded-full bg-surface-muted overflow-hidden">
                    <div
                      className={cn("absolute left-0 top-0 h-full rounded-full", actualBarClass)}
                      style={{ width: `${Math.max(valuePct, 2)}%` }}
                    />
                  </div>
                </div>
                {/* Barra "Benchmark" — sempre cinza neutro */}
                <div className="space-y-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-content-tertiary">
                      Benchmark
                    </span>
                    <span className="font-mono text-[13px] font-medium text-content-secondary tabular-nums">
                      {f.benchmark.toString().replace(".", ",")}%
                    </span>
                  </div>
                  <div className="relative h-2 w-full rounded-full bg-surface-muted overflow-hidden">
                    <div
                      className="absolute left-0 top-0 h-full rounded-full bg-content-tertiary/40"
                      style={{ width: `${Math.max(benchPct, 2)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ReportSection>
  );
}
