/**
 * Zona C — Card de Taxa de Envolvimento refinado.
 * Mantém o gráfico de benchmark por escalão, com 3 refinamentos:
 *  1. Header com label + source badge à direita
 *  2. Linha hero: valor real + ref. tier + gap
 *  3. Gráfico a 130px, sem grid verticais, 3 horizontais a 4% opac
 */
import type { AdapterResult } from "@/lib/report/snapshot-to-report-data";
import {
  INSTAGRAM_BENCHMARK_CONTEXT,
  getConsolidatedBenchmarkSeries,
  getActiveTierIndex,
} from "@/lib/knowledge/benchmark-context";
import { cn } from "@/lib/utils";
import { REDESIGN_TOKENS } from "../report-tokens";
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
  const gapColor = gap >= 0 ? "text-emerald-600" : "text-rose-600";

  return (
    <article className={cn(REDESIGN_TOKENS.card, "p-5 md:p-6")}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-[13px] font-medium text-slate-900">
          Taxa de envolvimento
        </span>
        <span className="text-[10px] text-slate-400 tracking-[0.06em]">
          ◈ MERCADO · SOCIALINSIDER
        </span>
      </div>

      {/* Hero numbers */}
      <div className="flex items-baseline gap-4 flex-wrap mb-5">
        <span className="font-display text-[22px] font-medium text-slate-900 tabular-nums leading-none">
          {formatPct(k.engagementRate)}
        </span>
        <span className="text-xs text-slate-500">
          ref. tier {formatPct(k.engagementBenchmark)}
        </span>
        <span className={cn("text-xs tabular-nums", gapColor)}>
          {fmtPp(gap)} p.p.
        </span>
      </div>

      {/* Chart */}
      <div style={{ maxHeight: 130 }}>
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