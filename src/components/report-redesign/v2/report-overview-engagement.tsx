/**
 * Zona C — Card de Taxa de Envolvimento refinado.
 * Header com label + source badge, hero numbers, gráfico de benchmark.
 */
import type { AdapterResult } from "@/lib/report/snapshot-to-report-data";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";
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
  const activeSourceRefs = INSTAGRAM_BENCHMARK_CONTEXT.sources
    .filter((s) => s.visibility === "active")
    .map((s) => ({ name: s.name, url: s.url }));

  const gap = k.engagementRate - k.engagementBenchmark;
  const gapColor = gap >= 0 ? "text-signal-success" : "text-signal-danger";
  const gapBg = gap >= 0 ? "bg-tint-success" : "bg-tint-danger";

  return (
    <article className="rounded-2xl border border-border-default bg-surface-secondary shadow-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 md:px-6 pt-5 md:pt-6 pb-0">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center size-8 rounded-lg bg-tint-primary text-accent-primary">
            <Activity className="size-4" strokeWidth={2.2} aria-hidden="true" />
          </div>
          <span className="text-sm font-semibold text-content-primary">
            Taxa de envolvimento
          </span>
        </div>
        <span className="text-[10px] text-content-secondary tracking-[0.05em] bg-surface-muted border border-border-subtle px-2.5 py-1 rounded-full whitespace-nowrap font-medium">
          MERCADO · SOCIALINSIDER
        </span>
      </div>

      {/* Hero numbers */}
      <div className="flex items-end gap-3 sm:gap-4 flex-wrap px-5 md:px-6 pt-4 pb-5">
        <span className="font-display text-[2rem] md:text-[2.25rem] font-bold text-content-primary tabular-nums leading-none tracking-tight">
          {formatPct(k.engagementRate)}
        </span>
        <div className="flex items-center gap-2 pb-1">
          <span className="text-xs text-content-tertiary font-medium">
            ref. {formatPct(k.engagementBenchmark)}
          </span>
          <span className={cn(
            "text-xs tabular-nums inline-flex items-center gap-1 font-semibold rounded-full px-2 py-0.5",
            gapColor, gapBg,
          )}>
            {gap >= 0 ? (
              <TrendingUp className="size-3" aria-hidden="true" />
            ) : (
              <TrendingDown className="size-3" aria-hidden="true" />
            )}
            {fmtPp(gap)} p.p.
          </span>
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
          activeTierLabel={benchmarkSeries[activeTierIdx]?.tierLabel}
        />
      </div>
    </article>
  );
}

function formatPct(n: number): string {
  if (!Number.isFinite(n)) return "0,00%";
  return `${n.toFixed(2).replace(".", ",")}%`;
}

function fmtPp(n: number): string {
  const abs = Math.abs(n);
  const s = abs.toFixed(1).replace(".", ",");
  return n < 0 ? `−${s}` : `+${s}`;
}
