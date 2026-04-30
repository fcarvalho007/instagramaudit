import { Activity, BarChart3, CalendarDays, Film, Target } from "lucide-react";
import type { ReactNode } from "react";

import type { AdapterResult } from "@/lib/report/snapshot-to-report-data";
import { cn } from "@/lib/utils";

import { REDESIGN_TOKENS } from "../report-tokens";

interface Props {
  result: AdapterResult;
}

type BenchTone = "positive" | "warning" | "neutral";

/**
 * KPI grid v2 (Phase 1B.1) — versão evoluída do grid v1 (locked).
 * Cards maiores, mais respiração, valor display proeminente, ícone num
 * quadrado arredondado azul claro com gradient. Card de "Estado do
 * benchmark" tem tratamento visual distinto (fundo blue-50/40).
 */
export function ReportKpiGridV2({ result }: Props) {
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
          windowDays > 0 ? `nos últimos ${windowDays} dias` : undefined
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
  spanLast?: boolean;
  isStatus?: boolean;
}) {
  return (
    <div
      className={cn(
        isStatus ? REDESIGN_TOKENS.kpiCardV2Status : REDESIGN_TOKENS.kpiCardV2,
        "p-5 md:p-6 lg:p-7 flex flex-col gap-4 min-w-0",
        spanLast ? "col-span-2 sm:col-span-3 lg:col-span-1" : "",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={REDESIGN_TOKENS.kpiIconBoxV2} aria-hidden="true">
          {icon}
        </span>
      </div>
      <p className={REDESIGN_TOKENS.kpiLabel}>{label}</p>
      <div
        className={cn(
          REDESIGN_TOKENS.kpiValueV2,
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
        "font-mono text-[12px] uppercase tracking-[0.08em]",
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