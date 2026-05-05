/**
 * Zona C — Card de Taxa de Envolvimento.
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
import { Activity, MessageCircle } from "lucide-react";
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
  const isPositive = gapPp >= 0;

  // Multiplier: how many times further from benchmark
  let multiplierLabel = "—";
  let multiplierDirection = "";
  if (k.engagementRate > 0 && benchmarkVal > 0) {
    const raw = isPositive
      ? k.engagementRate / benchmarkVal
      : benchmarkVal / k.engagementRate;
    multiplierLabel = raw >= 10
      ? `${Math.round(raw)}×`
      : `${raw.toFixed(1).replace(".", ",")}×`;
    multiplierDirection = isPositive ? "maior" : "menor";
  } else if (k.engagementRate === 0 && benchmarkVal > 0) {
    multiplierLabel = "—";
    multiplierDirection = "menor";
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
    readingText = `Mesmo perfis com ${highestTierLabel} seguidores têm ${highMultLabel} mais envolvimento do que este perfil — o problema não é a dimensão da audiência, é como ela reage.`;
  } else if (isPositive && benchmarkVal > 0 && k.engagementRate > 0) {
    const aboveMult = k.engagementRate / benchmarkVal;
    const aboveMultLabel = aboveMult >= 10
      ? `${Math.round(aboveMult)}×`
      : `${aboveMult.toFixed(1).replace(".", ",")}×`;
    readingText = `Este perfil supera a média do seu escalão em ${aboveMultLabel} — há sinais de envolvimento acima da referência.`;
  }

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

      {/* Hero row — 3 KPI cards */}
      <div className="px-5 md:px-6 pt-5 pb-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

          {/* KPI 1 — Profile engagement */}
          <div
            className="rounded-xl border px-4 py-4"
            style={{
              borderColor: isBelowBenchmark ? "rgba(163,45,45,0.15)" : "rgba(37,99,217,0.12)",
              borderLeftWidth: 3,
              borderLeftColor: isBelowBenchmark ? "rgba(163,45,45,0.50)" : "rgba(37,99,217,0.40)",
              background: isBelowBenchmark ? "rgba(163,45,45,0.04)" : "rgba(37,99,217,0.03)",
            }}
          >
            <div className="flex items-center gap-1.5 mb-2">
              <span
                className="size-2 rounded-full shrink-0"
                aria-hidden="true"
                style={{
                  background: isBelowBenchmark ? "rgba(163,45,45,0.70)" : "rgba(37,99,217,0.50)",
                }}
              />
              <span className="text-eyebrow-sm text-content-secondary">
                Deste perfil
              </span>
            </div>
            <div className="flex items-baseline">
              <span className="font-mono text-[1.75rem] sm:text-[2rem] font-bold text-content-primary tabular-nums leading-none tracking-tight">
                {fmtPctHero(k.engagementRate)}
              </span>
              <span className="font-mono text-[1.75rem] sm:text-[2rem] font-light text-content-secondary/50 ml-0.5">
                %
              </span>
            </div>
            <span className="block text-[11px] text-content-secondary mt-1.5 leading-snug">
              média de gostos + comentários por seguidor
            </span>
          </div>

          {/* KPI 2 — Tier benchmark */}
          <div
            className="rounded-xl border px-4 py-4"
            style={{
              borderColor: "rgba(37,99,217,0.10)",
              borderLeftWidth: 3,
              borderLeftColor: "rgba(37,99,217,0.30)",
              background: "rgba(37,99,217,0.03)",
            }}
          >
            <div className="flex items-center gap-1.5 mb-2">
              <span
                className="size-2 rounded-full shrink-0"
                aria-hidden="true"
                style={{ background: "rgba(37,99,217,0.45)" }}
              />
              <span className="text-eyebrow-sm text-content-secondary">
                Referência tier
              </span>
            </div>
            <div className="flex items-baseline">
              <span className="font-mono text-[1.75rem] sm:text-[2rem] font-bold text-content-primary tabular-nums leading-none tracking-tight">
                {fmtPctHero(benchmarkVal)}
              </span>
              <span className="font-mono text-[1.75rem] sm:text-[2rem] font-light text-content-secondary/50 ml-0.5">
                %
              </span>
            </div>
            <span className="block text-[11px] text-content-secondary mt-1.5 leading-snug">
              média de perfis {tierShort} seguidores
            </span>
          </div>

          {/* KPI 3 — Distance to benchmark */}
          <div
            className="rounded-xl border px-4 py-4"
            style={{
              borderColor: isPositive ? "rgba(29,158,117,0.15)" : "rgba(163,45,45,0.15)",
              borderLeftWidth: 3,
              borderLeftColor: isPositive ? "rgba(29,158,117,0.50)" : "rgba(163,45,45,0.50)",
              background: isPositive ? "rgba(29,158,117,0.04)" : "rgba(163,45,45,0.04)",
            }}
          >
            <div className="flex items-center gap-1.5 mb-2">
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
                  "font-mono text-[1.75rem] sm:text-[2rem] font-bold tabular-nums leading-none tracking-tight",
                  isPositive ? "text-signal-success" : "text-signal-danger"
                )}
              >
                {multiplierLabel}
              </span>
              {multiplierDirection && (
                <span
                  className={cn(
                    "text-sm font-medium",
                    isPositive ? "text-signal-success" : "text-signal-danger"
                  )}
                >
                  {multiplierDirection}
                </span>
              )}
            </div>
            <span
              className={cn(
                "block text-[11px] mt-1.5 leading-snug",
                isPositive ? "text-signal-success/70" : "text-signal-danger/70"
              )}
            >
              {fmtPpSigned(gapPp)} p.p. {isPositive ? "acima" : "abaixo"} da
              referência
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
          <div
            className="rounded-xl px-4 py-4 flex items-start gap-3"
            style={{
              borderLeft: `3px solid ${isBelowBenchmark ? "rgba(163,45,45,0.45)" : "rgba(29,158,117,0.45)"}`,
              background: isBelowBenchmark ? "rgba(163,45,45,0.04)" : "rgba(29,158,117,0.04)",
            }}
          >
            <span
              className="flex items-center justify-center size-7 rounded-full shrink-0 mt-0.5"
              aria-hidden="true"
              style={{
                background: isBelowBenchmark ? "rgba(163,45,45,0.08)" : "rgba(29,158,117,0.08)",
              }}
            >
              <MessageCircle
                className={cn(
                  "size-3.5",
                  isBelowBenchmark ? "text-signal-danger" : "text-signal-success"
                )}
                strokeWidth={2}
              />
            </span>
            <div className="min-w-0">
              <span
                className={cn(
                  "text-eyebrow-sm block mb-1",
                  isBelowBenchmark ? "text-signal-danger" : "text-signal-success"
                )}
              >
                Leitura
              </span>
              <p className="text-[13px] leading-relaxed text-content-primary">
                {readingText}
              </p>
            </div>
          </div>
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

function fmtPpSigned(n: number): string {
  const abs = Math.abs(n);
  const s = abs.toFixed(2).replace(".", ",");
  return n < 0 ? `−${s}` : `+${s}`;
}
