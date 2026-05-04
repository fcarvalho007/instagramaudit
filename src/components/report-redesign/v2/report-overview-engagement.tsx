/**
 * Zona C — Card de Taxa de Envolvimento com hero row 3-colunas
 * e gráfico horizontal de comparação entre escalões.
 */
import type { AdapterResult } from "@/lib/report/snapshot-to-report-data";
import { Activity } from "lucide-react";
import {
  INSTAGRAM_BENCHMARK_CONTEXT,
  getConsolidatedBenchmarkSeries,
  getActiveTierIndex,
} from "@/lib/knowledge/benchmark-context";
import { cn } from "@/lib/utils";
import { ReportEngagementBenchmarkChart } from "./report-engagement-benchmark-chart";

interface Props {
  result: AdapterResult;
}

export function EngagementCardRefined({ result }: Props) {
  const k = result.data.keyMetrics;
  const followers = result.data.profile.followers ?? 0;
  const benchmarkSeries = getConsolidatedBenchmarkSeries();
  const activeTierIdx = getActiveTierIndex(followers, benchmarkSeries);
  const activeTier = benchmarkSeries[activeTierIdx];
  const activeSourceRefs = INSTAGRAM_BENCHMARK_CONTEXT.sources
    .filter((s) => s.visibility === "active")
    .map((s) => ({ name: s.name, url: s.url }));

  const benchmarkVal = k.engagementBenchmark;
  const gapPp = k.engagementRate - benchmarkVal;
  const gapPct = benchmarkVal > 0
    ? ((k.engagementRate / benchmarkVal) - 1) * 100
    : 0;
  const isPositive = gapPp >= 0;

  return (
    <article className="rounded-2xl border border-border-default bg-surface-secondary shadow-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 md:px-6 pt-5 md:pt-6 pb-0">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center size-9 rounded-xl bg-tint-primary text-accent-primary">
            <Activity className="size-4" strokeWidth={2.2} aria-hidden="true" />
          </div>
          <div>
            <span className="font-display text-lg sm:text-xl font-semibold text-content-primary block tracking-tight">
              Taxa de envolvimento
            </span>
            <span className="text-[11px] text-content-secondary">
              posição face ao mercado por escalão
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-accent-primary font-semibold tracking-[0.04em]">
            ✦ MERCADO
          </span>
        </div>
      </div>

      {/* Hero row — 3 columns */}
      <div className="px-5 md:px-6 pt-5 pb-5">
        <div className="rounded-xl border border-accent-primary/15 bg-gradient-to-r from-surface-secondary via-tint-primary/30 to-surface-secondary grid grid-cols-1 sm:grid-cols-[2fr_1.5fr_1.5fr]">
        {/* Column 1: Profile engagement */}
        <div className="px-4 py-3 border-b sm:border-b-0 sm:border-r border-border-subtle">
          <span className="text-eyebrow-sm text-accent-primary block mb-1">
            Taxa de engagement deste perfil
          </span>
          <div className="flex items-baseline">
            <span className="font-sans text-[1.75rem] sm:text-[2.25rem] font-bold text-content-primary tabular-nums leading-none tracking-tight">
              {fmtPctHero(k.engagementRate)}
            </span>
            <span className="font-sans text-[1.75rem] sm:text-[2.25rem] font-light text-content-secondary/60 ml-0.5">
              %
            </span>
          </div>
          <span className="block text-[11px] text-content-secondary mt-1">
            média de gostos, comentários e partilhas a dividir por seguidores
          </span>
        </div>

        {/* Column 2: Tier benchmark */}
        <div className="px-4 py-3 flex flex-col justify-center border-b sm:border-b-0 sm:border-r border-border-subtle">
          <span className="text-eyebrow-sm text-content-secondary block mb-1">
            % Média de perfis semelhantes
          </span>
          <div className="flex items-baseline">
            <span className="font-sans text-[1.5rem] sm:text-[2rem] font-bold text-content-primary tabular-nums leading-none tracking-tight">
              {fmtPctHero(benchmarkVal)}
            </span>
            <span className="font-sans text-[1.5rem] sm:text-[2rem] font-light text-content-secondary/50 ml-0.5">
              %
            </span>
          </div>
          <span className="block text-[11px] text-content-secondary mt-1">
            Escalão de {activeTier?.tierLabel?.match(/\(([^)]+)\)/)?.[1] ?? activeTier?.tierLabel ?? "—"}
          </span>
        </div>

        {/* Column 3: Gap */}
        <div className="px-4 py-3 flex flex-col justify-center">
          <span className={cn(
            "text-eyebrow-sm block mb-1",
            isPositive ? "text-signal-success" : "text-signal-danger",
          )}>
            Gap
          </span>
          <div className="flex items-baseline gap-1">
            <span className={cn(
              "font-sans text-[1.5rem] sm:text-[1.75rem] font-bold tabular-nums leading-none tracking-tight",
              isPositive ? "text-signal-success" : "text-signal-danger",
            )}>
              {fmtPpSigned(gapPp)}
            </span>
            <span className={cn(
              "text-base font-medium ml-1",
              isPositive ? "text-signal-success" : "text-signal-danger",
            )}>
              p.p.
            </span>
          </div>
          {benchmarkVal > 0 && (
            <span className={cn(
              "block text-xs mt-1",
              isPositive ? "text-signal-success" : "text-signal-danger",
            )}>
              {Math.round(Math.abs(gapPct))}%{" "}
              {isPositive ? "acima da média" : "abaixo da média"}
            </span>
          )}
        </div>
      </div>
      </div>

      {/* Chart */}
      <div className="px-5 md:px-6 pb-5 md:pb-6">
        <ReportEngagementBenchmarkChart
          profileEngagementRatePct={k.engagementRate}
          followersCount={followers}
          benchmarkSeries={benchmarkSeries}
          activeTierIndex={activeTierIdx}
          sourceReferences={activeSourceRefs}
          activeTierLabel={activeTier?.tierLabel}
        />
      </div>
    </article>
  );
}

// ─── Formatters ─────────────────────────────────────────────────────

function fmtPctHero(n: number): string {
  if (!Number.isFinite(n)) return "0,00";
  return n.toFixed(2).replace(".", ",");
}

function fmtPpSigned(n: number): string {
  const abs = Math.abs(n);
  const s = abs.toFixed(2).replace(".", ",");
  return n < 0 ? `−${s}` : `+${s}`;
}
