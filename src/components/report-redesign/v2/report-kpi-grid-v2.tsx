import {
  Activity,
  CalendarDays,
  Film,
  Images as ImagesIcon,
  Users,
  UsersRound,
} from "lucide-react";
import type { ReactNode } from "react";

import type { AdapterResult } from "@/lib/report/snapshot-to-report-data";
import { cn } from "@/lib/utils";

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
 * KPI grid v2 (Phase 1B.1D) — métricas focadas no utilizador.
 * Sem cartão "Estado do benchmark" e sem delta de seguidores: apenas
 * contagem atual de seguidores + publicações totais. Format passa a
 * chip compacto; sem overflow a 375/768/1366.
 */
export function ReportKpiGridV2({ result }: Props) {
  const k = result.data.keyMetrics;
  const profile = result.data.profile;
  const windowDays = result.coverage.windowDays;

  const followers = profile.followers ?? 0;
  const postsCount = profile.postsCount ?? 0;

  const formatLabel = FORMAT_PT[k.dominantFormat] ?? k.dominantFormat;
  const formatTone = formatChipTone(formatLabel);

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6">
      {followers > 0 ? (
        <KpiCard
          icon={<Users className="h-4 w-4" aria-hidden="true" />}
          label="Seguidores"
          value={formatCompact(followers)}
          help="perfil público"
        />
      ) : null}

      {postsCount > 0 ? (
        <KpiCard
          icon={<ImagesIcon className="h-4 w-4" aria-hidden="true" />}
          label="Publicações no perfil"
          value={formatCompact(postsCount)}
          help="total público"
        />
      ) : null}

      <KpiCard
        icon={<UsersRound className="h-4 w-4" aria-hidden="true" />}
        label="Publicações analisadas"
        value={String(k.postsAnalyzed)}
        help={
          windowDays > 0
            ? `últimos ${windowDays} dias`
            : "amostra desta análise"
        }
      />

      <KpiCard
        icon={<Activity className="h-4 w-4" aria-hidden="true" />}
        label="Envolvimento médio"
        value={`${k.engagementRate.toFixed(2)}%`}
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
      />

      <KpiCard
        icon={<Film className="h-4 w-4" aria-hidden="true" />}
        label="Formato dominante"
        value={<FormatChip label={formatLabel} tone={formatTone} />}
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
        "font-mono text-[12px] uppercase tracking-[0.08em]",
        toneCls,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", dot)} aria-hidden="true" />
      {label}
    </span>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────

function formatCompact(n: number): string {
  if (!Number.isFinite(n)) return "0";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return trimZero((n / 1_000_000).toFixed(1)) + "M";
  if (abs >= 10_000) return trimZero((n / 1_000).toFixed(0)) + "K";
  if (abs >= 1_000) return trimZero((n / 1_000).toFixed(1)) + "K";
  return new Intl.NumberFormat("pt-PT").format(n);
}

function trimZero(s: string): string {
  return s.replace(/\.0$/, "");
}
