import { Activity, BarChart3, CalendarDays, Film, Target } from "lucide-react";
import type { ReactNode } from "react";

import type { AdapterResult } from "@/lib/report/snapshot-to-report-data";
import { cn } from "@/lib/utils";

import { REDESIGN_TOKENS } from "./report-tokens";

interface Props {
  result: AdapterResult;
}

type BenchTone = "positive" | "warning" | "neutral";

/**
 * 5 KPI cards individuais, estilo Iconosquare. Substitui a linha
 * com dividers do `ReportExecutiveSummary` antigo. Hierarquia clara:
 * ícone azul + label mono pequeno + valor display grande + help.
 *
 * Responsivo:
 *   - <640: 2 colunas, 5º card full-width
 *   - 640–1023: 3 colunas
 *   - ≥1024: 5 colunas
 */
export function ReportKpiGrid({ result }: Props) {
  const k = result.data.keyMetrics;
  const meta = result.data.meta;
  const windowDays = result.coverage.windowDays;

  const benchmarkLabel =
    meta.benchmarkStatus === "real"
      ? "Ligado"
      : meta.benchmarkStatus === "partial"
        ? "Parcial"
        : "Em afinação";

  const benchmarkTone: BenchTone =
    meta.benchmarkStatus === "real"
      ? "positive"
      : meta.benchmarkStatus === "partial"
        ? "warning"
        : "neutral";

  return (
    <section
      aria-label="Indicadores principais"
      className={cn(REDESIGN_TOKENS.bandWhite, "border-y border-slate-200/70")}
    >
      <div className="mx-auto max-w-7xl px-5 md:px-6 py-8 md:py-12">
        <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <KpiCard
            icon={<Activity className="h-4 w-4" aria-hidden="true" />}
            label="Envolvimento médio"
            value={`${k.engagementRate.toFixed(2)}%`}
            help={`vs. ${k.engagementBenchmark.toFixed(2)}% de referência`}
          />
          <KpiCard
            icon={<BarChart3 className="h-4 w-4" aria-hidden="true" />}
            label="Publicações analisadas"
            value={String(k.postsAnalyzed)}
            help={
              windowDays > 0
                ? `nos últimos ${windowDays} dias`
                : undefined
            }
          />
          <KpiCard
            icon={<CalendarDays className="h-4 w-4" aria-hidden="true" />}
            label="Ritmo semanal"
            value={k.postingFrequencyWeekly.toFixed(1)}
            help="publicações por semana"
          />
          <KpiCard
            icon={<Film className="h-4 w-4" aria-hidden="true" />}
            label="Formato dominante"
            value={k.dominantFormat}
            help={`${k.dominantFormatShare}% da amostra`}
          />
          <KpiCard
            icon={<Target className="h-4 w-4" aria-hidden="true" />}
            label="Estado do benchmark"
            value={<BenchPill label={benchmarkLabel} tone={benchmarkTone} />}
            help="estado atual"
            isStatus
            spanLast
          />
        </div>
      </div>
    </section>
  );
}

function KpiCard({
  icon,
  label,
  value,
  help,
  spanLast,
  isStatus,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  help?: string;
  /** Em mobile (<640) o último card ocupa as 2 colunas. */
  spanLast?: boolean;
  /**
   * Quando `true`, sinaliza que o card é um estado (chip), não uma
   * métrica numérica. Centra o chip e suaviza o ring para distinguir
   * visualmente da grelha de KPIs sem quebrar o alinhamento.
   */
  isStatus?: boolean;
}) {
  return (
    <div
      className={cn(
        REDESIGN_TOKENS.cardKpi,
        "p-4 md:p-5 flex flex-col gap-3 min-w-0",
        spanLast ? "col-span-2 sm:col-span-3 lg:col-span-1" : "",
        isStatus ? "ring-1 ring-blue-100/70" : "",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600 ring-1 ring-blue-100"
          aria-hidden="true"
        >
          {icon}
        </span>
      </div>
      <p className={REDESIGN_TOKENS.kpiLabel}>{label}</p>
      <div
        className={cn(
          REDESIGN_TOKENS.kpiValue,
          "break-normal [overflow-wrap:normal] [hyphens:none]",
          isStatus ? "flex items-center" : "",
        )}
      >
        {value}
      </div>
      {help ? <p className={REDESIGN_TOKENS.kpiHelp}>{help}</p> : null}
    </div>
  );
}

function BenchPill({ label, tone }: { label: string; tone: BenchTone }) {
  const toneCls =
    tone === "positive"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : tone === "warning"
        ? "bg-amber-50 text-amber-700 ring-amber-200"
        : "bg-slate-100 text-slate-600 ring-slate-200";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 ring-1",
        "text-eyebrow",
        toneCls,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          tone === "positive"
            ? "bg-emerald-500"
            : tone === "warning"
              ? "bg-amber-500"
              : "bg-slate-400",
        )}
      />
      {label}
    </span>
  );
}