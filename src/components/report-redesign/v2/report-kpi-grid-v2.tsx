import { Activity, CalendarDays, Film } from "lucide-react";
import type { ReactNode } from "react";

import type { AdapterResult } from "@/lib/report/snapshot-to-report-data";
import { cn } from "@/lib/utils";

import { ReportSourceLabel } from "./report-source-label";
import { REDESIGN_TOKENS } from "../report-tokens";

interface Props {
  result: AdapterResult;
}

const FORMAT_PT: Record<string, string> = {
  Carousels: "Carrosséis",
  Carousel: "Carrosséis",
  Sidecar: "Carrosséis",
  Carrosséis: "Carrosséis",
  Reels: "Reels",
  Reel: "Reels",
  Images: "Imagens",
  Image: "Imagens",
  Imagens: "Imagens",
};

/**
 * KPI grid v2 (Phase 1B.1E) — métricas analíticas (sem duplicação
 * com o hero estilo perfil IG).
 *
 * Apenas métricas derivadas da análise: envolvimento, ritmo e formato
 * dominante. Contagens públicas (seguidores, publicações totais,
 * publicações analisadas) vivem agora no hero.
 */
export function ReportKpiGridV2({ result }: Props) {
  const k = result.data.keyMetrics;
  const formatLabel = FORMAT_PT[k.dominantFormat] ?? k.dominantFormat;
  const formatTone = formatChipTone(formatLabel);

  return (
    <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <KpiCard
        icon={<Activity className="h-4 w-4" aria-hidden="true" />}
        label="Envolvimento médio"
        value={`${k.engagementRate.toFixed(2)}%`}
        sourceBadge={<ReportSourceLabel type="auto" detail="Gostos + comentários" />}
        help={
          k.engagementBenchmark > 0
            ? `vs. ${k.engagementBenchmark.toFixed(2).replace(".", ",")}% de referência`
            : undefined
        }
      />

      <KpiCard
        icon={<CalendarDays className="h-4 w-4" aria-hidden="true" />}
        label="Ritmo semanal"
        value={k.postingFrequencyWeekly.toFixed(1).replace(".", ",")}
        help="publicações por semana"
        sourceBadge={<ReportSourceLabel type="auto" detail="Datas de publicação" />}
      />

      <KpiCard
        icon={<Film className="h-4 w-4" aria-hidden="true" />}
        label="Formato dominante"
        value={<FormatChip label={formatLabel} tone={formatTone} />}
        sourceBadge={<ReportSourceLabel type="auto" detail="Tipo de publicação" />}
        help={
          k.dominantFormatShare > 0
            ? `${k.dominantFormatShare}% da amostra`
            : undefined
        }
        compact
      />
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  help,
  compact,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  help?: string;
  compact?: boolean;
  sourceBadge?: ReactNode;
}) {
  return (
    <div
      className={cn(
        REDESIGN_TOKENS.kpiCardV2,
        "p-4 md:p-5 lg:p-5 flex flex-col gap-3 min-w-0",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={REDESIGN_TOKENS.kpiIconBoxV2} aria-hidden="true">
          {icon}
        </span>
        {sourceBadge ?? null}
      </div>
      <p className={REDESIGN_TOKENS.kpiLabel}>{label}</p>
      <div
        className={cn(
          "min-w-0",
          compact ? "" : REDESIGN_TOKENS.kpiValueV2,
        )}
      >
        {value}
      </div>
      {help ? <p className={REDESIGN_TOKENS.kpiHelp}>{help}</p> : null}
    </div>
  );
}

// ─── Format chip ─────────────────────────────────────────────────────

type FormatTone = "primary" | "success" | "warning" | "neutral";

function formatChipTone(label: string): FormatTone {
  if (label === "Reels") return "primary";
  if (label === "Carrosséis") return "success";
  if (label === "Imagens") return "warning";
  return "neutral";
}

function FormatChip({ label, tone }: { label: string; tone: FormatTone }) {
  const toneCls =
    tone === "primary"
      ? "bg-blue-50 text-blue-700 ring-blue-200"
      : tone === "success"
        ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
        : tone === "warning"
          ? "bg-amber-50 text-amber-700 ring-amber-200"
          : "bg-slate-100 text-slate-600 ring-slate-200";
  const dot =
    tone === "primary"
      ? "bg-blue-500"
      : tone === "success"
        ? "bg-emerald-500"
        : tone === "warning"
          ? "bg-amber-500"
          : "bg-slate-400";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 ring-1",
        "text-eyebrow",
        toneCls,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", dot)} aria-hidden="true" />
      {label}
    </span>
  );
}
