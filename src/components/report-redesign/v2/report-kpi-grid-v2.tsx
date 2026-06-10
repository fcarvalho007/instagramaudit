import { Activity, CalendarDays, Film } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation("report");
  const k = result.data.keyMetrics;
  const cadence = result.enriched.cadence;
  const formatPt = FORMAT_PT[k.dominantFormat] ?? k.dominantFormat;
  const formatLabel = t(`kpi.format_names.${formatPt}`, { defaultValue: formatPt });
  const formatTone = formatChipTone(formatPt);

  const rhythmHelpKey =
    cadence.method === "window_30d" ? "kpi.rhythm.help_window_30d"
    : cadence.method === "window_90d" ? "kpi.rhythm.help_window_90d"
    : cadence.method === "sample_span" ? "kpi.rhythm.help_sample_span"
    : "kpi.rhythm.help_insufficient";
  const rhythmHelp =
    cadence.method === "insufficient"
      ? t(rhythmHelpKey)
      : t(rhythmHelpKey, { n: cadence.weekly.toFixed(1).replace(".", ",") });

  return (
    <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <KpiCard
        icon={<Activity className="h-4 w-4" aria-hidden="true" />}
        label={t("kpi.engagement.label")}
        value={`${k.engagementRate.toFixed(2)}%`}
        sourceBadge={<ReportSourceLabel type="auto" detail={t("kpi.engagement.source")} />}
        help={
          k.engagementBenchmark > 0
            ? t("kpi.engagement.help", { value: k.engagementBenchmark.toFixed(2).replace(".", ",") })
            : undefined
        }
      />

      <KpiCard
        icon={<CalendarDays className="h-4 w-4" aria-hidden="true" />}
        label={t("kpi.rhythm.label")}
        value={
          k.postingFrequencyWeekly > 0
            ? k.postingFrequencyWeekly.toFixed(1).replace(".", ",")
            : "—"
        }
        help={rhythmHelp}
        sourceBadge={<ReportSourceLabel type="auto" detail={t("kpi.rhythm.source")} />}
      />

      <KpiCard
        icon={<Film className="h-4 w-4" aria-hidden="true" />}
        label={t("kpi.format.label")}
        value={<FormatChip label={formatLabel} tone={formatTone} />}
        sourceBadge={<ReportSourceLabel type="auto" detail={t("kpi.format.source")} />}
        help={
          k.dominantFormatShare > 0
            ? t("kpi.format.help", { share: k.dominantFormatShare })
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
  sourceBadge,
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

function formatChipTone(labelPt: string): FormatTone {
  if (labelPt === "Reels") return "primary";
  if (labelPt === "Carrosséis") return "success";
  if (labelPt === "Imagens") return "warning";
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
          : "bg-surface-muted text-content-secondary ring-border-default";
  const dot =
    tone === "primary"
      ? "bg-blue-500"
      : tone === "success"
        ? "bg-emerald-500"
        : tone === "warning"
          ? "bg-amber-500"
          : "bg-content-tertiary";
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
