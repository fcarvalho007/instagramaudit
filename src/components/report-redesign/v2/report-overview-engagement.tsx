/**
 * Zona C — Card de Taxa de Engagement.
 * Premium Iconosquare-style KPI row + benchmark chart + diagnostic reading.
 *
 * KPI accent colours (local decorative values):
 *   Rose/danger:  bg rgba(163,45,45,0.04), border rgba(163,45,45,0.15), dot rgba(163,45,45,0.70)
 *   Blue/neutral: bg rgba(37,99,217,0.03), border rgba(37,99,217,0.10), dot rgba(37,99,217,0.45)
 *   Emerald/ok:   bg rgba(29,158,117,0.04), border rgba(29,158,117,0.15), dot rgba(29,158,117,0.70)
 *
 * Reading box accents (local decorative):
 *   Danger:  bg rgba(163,45,45,0.04), left-border rgba(163,45,45,0.45)
 *   Success: bg rgba(29,158,117,0.04), left-border rgba(29,158,117,0.45)
 */
import type { AdapterResult } from "@/lib/report/snapshot-to-report-data";
import { MessageCircle, AlertTriangle } from "lucide-react";
import {
  INSTAGRAM_BENCHMARK_CONTEXT,
  getConsolidatedBenchmarkSeries,
  getActiveTierIndex,
} from "@/lib/knowledge/benchmark-context";
import { cn } from "@/lib/utils";
import { ReportEngagementBenchmarkChart } from "./report-engagement-benchmark-chart";
import { InsightCallout } from "./overview/insight-callout";

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
  const isPositive = gapPp >= 0;

  // Dynamic engagement status word
  const engagementStatus: string = (() => {
    if (benchmarkVal <= 0) return "Baixa";
    const pctDiff = ((k.engagementRate - benchmarkVal) / benchmarkVal) * 100;
    if (pctDiff >= 0) return "Alta";
    if (pctDiff >= -30) return "Média";
    return "Baixa";
  })();

  // KPI 3: percentage difference vs benchmark
  let pctDiffLabel = "—";
  let pctDiffDirection = "";
  if (benchmarkVal > 0 && Number.isFinite(k.engagementRate)) {
    const pctDiff = ((k.engagementRate - benchmarkVal) / benchmarkVal) * 100;
    if (Number.isFinite(pctDiff)) {
      const absPct = Math.abs(Math.round(pctDiff));
      pctDiffLabel = `${absPct}%`;
      pctDiffDirection = pctDiff >= 0 ? "superior" : "inferior";
    }
  } else if (k.engagementRate === 0 && benchmarkVal > 0) {
    pctDiffLabel = "100%";
    pctDiffDirection = "inferior";
  }

  // Tier label — extract short form from parentheses
  const tierShort =
    activeTier?.tierLabel?.match(/\(([^)]+)\)/)?.[1] ??
    activeTier?.tierLabel ??
    "—";

  // Profile is below benchmark?
  const isBelowBenchmark = gapPp < 0;

  // ── Reading box data ──────────────────────────────────────────────
  // Find highest tier benchmark for the diagnostic reading
  const highestTier = benchmarkSeries[benchmarkSeries.length - 1];
  const highestTierLabel = highestTier?.tierLabel ?? "+1M";
  const highestTierBenchmark = highestTier?.engagementRatePct ?? 0;

  let readingText = "";
  if (k.engagementRate === 0) {
    readingText =
      "Mesmo os escalões maiores apresentam uma referência superior — o problema parece estar na reação da audiência.";
  } else if (isBelowBenchmark && highestTierBenchmark > 0 && k.engagementRate > 0) {
    const highMult = highestTierBenchmark / k.engagementRate;
    const highMultLabel = highMult >= 10
      ? `${Math.round(highMult)}×`
      : `${highMult.toFixed(1).replace(".", ",")}×`;
    readingText = `Mesmo perfis com ${highestTierLabel} seguidores têm ${highMultLabel} mais engagement do que este perfil — o problema não é a dimensão da audiência, é como ela reage.`;
  } else if (isPositive && benchmarkVal > 0 && k.engagementRate > 0) {
    const aboveMult = k.engagementRate / benchmarkVal;
    const aboveMultLabel = aboveMult >= 10
      ? `${Math.round(aboveMult)}×`
      : `${aboveMult.toFixed(1).replace(".", ",")}×`;
    readingText = `Este perfil supera a média do seu escalão em ${aboveMultLabel} — há sinais de engagement acima da referência.`;
  }

  return (
    <article className="rounded-2xl border border-border-default bg-surface-secondary shadow-card overflow-hidden">
      {/* Header */}
      <div className="px-5 md:px-6 pt-6 md:pt-8 pb-0 space-y-2.5">
        <div className="flex items-start gap-3">
          <h3 className="font-display text-[1.5rem] md:text-[2rem] font-semibold tracking-tight text-content-primary leading-tight">
            Taxa de Engagement{" "}
            <span
              className="font-semibold"
              style={{
                borderBottom: `2px solid ${
                  engagementStatus === "Alta"
                    ? "rgba(29,158,117,0.50)"
                    : engagementStatus === "Média"
                      ? "rgba(217,119,6,0.50)"
                      : "rgba(163,45,45,0.50)"
                }`,
                paddingBottom: "1px",
              }}
            >
              {engagementStatus}
            </span>
          </h3>
        </div>
        <p className="text-[13px] md:text-[14px] text-content-secondary leading-snug">
          Média de gostos + comentários + partilhas (÷) seguidores.
        </p>
      </div>

      {/* Hero row — 3 KPI cards */}
      <div className="px-5 md:px-6 pt-5 md:pt-6 pb-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

          {/* KPI 1 — Profile engagement */}
          <div
            className="rounded-xl border px-4 py-3.5"
            style={{
              borderColor: isBelowBenchmark ? "rgba(163,45,45,0.15)" : "rgba(37,99,217,0.12)",
              borderLeftWidth: 3,
              borderLeftColor: isBelowBenchmark ? "rgba(163,45,45,0.50)" : "rgba(37,99,217,0.40)",
              background: isBelowBenchmark ? "rgba(163,45,45,0.04)" : "rgba(37,99,217,0.03)",
            }}
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <span
                className="size-2 rounded-full shrink-0"
                aria-hidden="true"
                style={{
                  background: isBelowBenchmark ? "rgba(163,45,45,0.70)" : "rgba(37,99,217,0.50)",
                }}
              />
              <span className="text-eyebrow-sm text-content-secondary">
                Avaliação deste perfil
              </span>
            </div>
            <div className="flex items-baseline">
              <span className="font-mono text-[1.6rem] sm:text-[1.85rem] font-bold text-content-primary tabular-nums leading-none tracking-tight">
                {fmtPctHero(k.engagementRate)}
              </span>
              <span className="font-mono text-[1.6rem] sm:text-[1.85rem] font-light text-content-secondary/50 ml-0.5">
                %
              </span>
            </div>
            <span className="block text-[11px] text-content-secondary mt-1.5 leading-snug">
              interação com o conteúdo
            </span>
          </div>

          {/* KPI 2 — Tier benchmark */}
          <div
            className="rounded-xl border px-4 py-3.5"
            style={{
              borderColor: "rgba(37,99,217,0.10)",
              borderLeftWidth: 3,
              borderLeftColor: "rgba(37,99,217,0.30)",
              background: "rgba(37,99,217,0.03)",
            }}
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <span
                className="size-2 rounded-full shrink-0"
                aria-hidden="true"
                style={{ background: "rgba(37,99,217,0.45)" }}
              />
              <span className="text-eyebrow-sm text-content-secondary">
                Outros perfis semelhantes
              </span>
            </div>
            <div className="flex items-baseline">
              <span className="font-mono text-[1.6rem] sm:text-[1.85rem] font-bold text-content-primary tabular-nums leading-none tracking-tight">
                {fmtPctHero(benchmarkVal)}
              </span>
              <span className="font-mono text-[1.6rem] sm:text-[1.85rem] font-light text-content-secondary/50 ml-0.5">
                %
              </span>
            </div>
            <span className="block text-[11px] text-content-secondary mt-1.5 leading-snug">
              Média de perfis no mesmo escalão.
            </span>
          </div>

          {/* KPI 3 — Distance to benchmark */}
          <div
            className="rounded-xl border px-4 py-3.5"
            style={{
              borderColor: isPositive ? "rgba(29,158,117,0.15)" : "rgba(163,45,45,0.15)",
              borderLeftWidth: 3,
              borderLeftColor: isPositive ? "rgba(29,158,117,0.50)" : "rgba(163,45,45,0.50)",
              background: isPositive ? "rgba(29,158,117,0.04)" : "rgba(163,45,45,0.04)",
            }}
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <span
                className="size-2 rounded-full shrink-0"
                aria-hidden="true"
                style={{
                  background: isPositive ? "rgba(29,158,117,0.70)" : "rgba(163,45,45,0.70)",
                }}
              />
              <span className="text-eyebrow-sm text-content-secondary">
                Distância à média
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span
                className={cn(
                  "font-mono text-[1.6rem] sm:text-[1.85rem] font-bold tabular-nums leading-none tracking-tight",
                  isPositive ? "text-signal-success" : "text-signal-danger"
                )}
              >
                {pctDiffLabel}
              </span>
              {pctDiffDirection && (
                <span
                  className={cn(
                    "text-sm font-medium",
                    isPositive ? "text-signal-success" : "text-signal-danger"
                  )}
                >
                  {pctDiffDirection}
                </span>
              )}
            </div>
            <span className="block text-[11px] text-content-secondary mt-1.5 leading-snug">
              {gapPp >= 0 ? "+" : "−"}{Math.abs(gapPp).toFixed(2).replace(".", ",")} p.p. {gapPp >= 0 ? "acima" : "abaixo"} da referência
            </span>
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

      {/* Diagnostic reading box */}
      {readingText && (
        <div className="px-5 md:px-6 pb-5 md:pb-6">
          <InsightCallout
            tone={isBelowBenchmark ? "danger" : "positive"}
            label="DIAGNÓSTICO"
          >
            <p>{readingText}</p>
          </InsightCallout>
        </div>
      )}
    </article>
  );
}

// ─── Formatters ─────────────────────────────────────────────────────

function fmtPctHero(n: number): string {
  if (!Number.isFinite(n)) return "0,00";
  return n.toFixed(2).replace(".", ",");
}

