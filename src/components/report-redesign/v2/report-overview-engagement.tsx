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
import {
  INSTAGRAM_BENCHMARK_CONTEXT,
  getConsolidatedBenchmarkSeries,
  getActiveTierIndex,
} from "@/lib/knowledge/benchmark-context";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/hooks/use-language";
import { formatNumber } from "@/lib/i18n/format";
import { ReportEngagementBenchmarkChart } from "./report-engagement-benchmark-chart";
import { InsightCallout } from "./overview/insight-callout";

interface Props {
  result: AdapterResult;
}

export function EngagementCardRefined({ result }: Props) {
  const { t } = useTranslation("report");
  const { language } = useLanguage();
  const k = result.data.keyMetrics;
  const followers = result.data.profile.followers ?? 0;
  const benchmarkSeries = getConsolidatedBenchmarkSeries();
  const activeTierIdx = getActiveTierIndex(followers, benchmarkSeries);
  const activeTier = benchmarkSeries[activeTierIdx];
  const activeSourceRefs = INSTAGRAM_BENCHMARK_CONTEXT.sources
    .filter((s) => s.visibility === "active")
    .map((s) => ({ name: s.name, url: s.url }));

  const benchmarkVal = k.engagementBenchmark;
  // Use the consolidated series value (same source as the chart) so KPIs
  // and the chart benchmark line are visually consistent.
  const chartBenchmarkVal = activeTier?.engagementRatePct ?? benchmarkVal;
  const gapPp = k.engagementRate - chartBenchmarkVal;
  const isPositive = gapPp >= 0;

  // Dynamic engagement status word
  const engagementStatus: string = (() => {
    if (chartBenchmarkVal <= 0) return t("engagement.status.low");
    const pctDiff = ((k.engagementRate - chartBenchmarkVal) / chartBenchmarkVal) * 100;
    if (pctDiff >= 0) return t("engagement.status.high");
    if (pctDiff >= -30) return t("engagement.status.medium");
    return t("engagement.status.low");
  })();

  // KPI 3: percentage difference vs benchmark
  let pctDiffLabel = "—";
  let pctDiffDirection = "";
  if (chartBenchmarkVal > 0 && Number.isFinite(k.engagementRate)) {
    const pctDiff = ((k.engagementRate - chartBenchmarkVal) / chartBenchmarkVal) * 100;
    if (Number.isFinite(pctDiff)) {
      const absPct = Math.abs(Math.round(pctDiff));
      pctDiffLabel = `${absPct}%`;
      pctDiffDirection = pctDiff >= 0 ? t("engagement.kpi.direction_above") : t("engagement.kpi.direction_below");
    }
  } else if (k.engagementRate === 0 && chartBenchmarkVal > 0) {
    pctDiffLabel = "100%";
    pctDiffDirection = t("engagement.kpi.direction_below");
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
    readingText = t("engagement.reading.zero");
  } else if (isBelowBenchmark && highestTierBenchmark > 0 && k.engagementRate > 0) {
    const highMult = highestTierBenchmark / k.engagementRate;
    const highMultLabel = highMult >= 10
      ? `${formatNumber(Math.round(highMult), language)}×`
      : `${formatNumber(highMult, language, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}×`;
    readingText = t("engagement.reading.below", { tier: highestTierLabel, mult: highMultLabel });
  } else if (isPositive && chartBenchmarkVal > 0 && k.engagementRate > 0) {
    const aboveMult = k.engagementRate / chartBenchmarkVal;
    const aboveMultLabel = aboveMult >= 10
      ? `${formatNumber(Math.round(aboveMult), language)}×`
      : `${formatNumber(aboveMult, language, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}×`;
    readingText = t("engagement.reading.above", { mult: aboveMultLabel });
  }

  // Inline status underline colour — mirrors the pattern used in
  // FrequencyCard / FormatCard so the three Block-1 cards share the
  // same header treatment (no pill, no uppercase).
  const statusUnderline =
    engagementStatus === t("engagement.status.high")
      ? "rgba(29,158,117,0.50)"
      : engagementStatus === t("engagement.status.medium")
        ? "rgba(217,119,6,0.50)"
        : "rgba(163,45,45,0.50)";

  return (
    <article className="rounded-2xl border border-border-default bg-surface-secondary shadow-card overflow-hidden">
      {/* Header */}
      <div className="px-4 sm:px-5 md:px-6 pt-6 sm:pt-8 md:pt-10 pb-4 sm:pb-5 space-y-3">
        <p className="text-eyebrow-sm text-content-secondary">{t("engagement.eyebrow")}</p>
        <div className="flex items-start gap-3">
          <h3 className="font-display text-[1.25rem] sm:text-[1.5rem] md:text-[2rem] font-semibold tracking-tight text-content-primary leading-tight break-words">
            {t("engagement.title")}{" "}
            <span
              className="font-semibold"
              style={{
                borderBottom: `2px solid ${statusUnderline}`,
                paddingBottom: "1px",
              }}
            >
              {engagementStatus}
            </span>
          </h3>
        </div>
        <p className="text-[15px] text-content-secondary leading-relaxed">
          {t("engagement.subtitle")}
        </p>
      </div>

      {/* Hero row — 3 KPI cards */}
      <div className="px-4 sm:px-5 md:px-6 pt-5 sm:pt-6 border-t border-border-default pb-6 sm:pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">

          <div className="rounded-xl border border-border-default bg-surface-muted/50 px-4 py-4 sm:px-5 sm:py-5">
            <span className="text-eyebrow-sm text-content-secondary block mb-2">
              <span className="hidden sm:inline">{t("engagement.kpi.profile_full")}</span>
              <span className="sm:hidden">{t("engagement.kpi.profile_short")}</span>
            </span>
            <div className="flex items-baseline">
              <span className="tabular-nums text-[1.6rem] sm:text-[2.25rem] font-bold text-content-primary leading-none tracking-tight">
                {fmtPctHero(k.engagementRate, language)}
              </span>
              <span className="tabular-nums text-[1.6rem] sm:text-[2.25rem] font-light text-content-secondary/50 ml-0.5">
                %
              </span>
            </div>
            <span className="block text-sm text-content-secondary mt-1.5 leading-snug">
              <span className="hidden sm:inline">{t("engagement.kpi.profile_caption_full")}</span>
              <span className="sm:hidden">{t("engagement.kpi.profile_caption_short")}</span>
            </span>
          </div>

          {/* KPI 2 — Tier benchmark */}
          <div className="rounded-xl border border-border-default bg-surface-muted/50 px-4 py-4 sm:px-5 sm:py-5">
            <span className="text-eyebrow-sm text-content-secondary block mb-2">
              <span className="hidden sm:inline">{t("engagement.kpi.tier_full")}</span>
              <span className="sm:hidden">{t("engagement.kpi.tier_short")}</span>
            </span>
            <div className="flex items-baseline">
              <span className="tabular-nums text-[1.6rem] sm:text-[2.25rem] font-bold text-content-primary leading-none tracking-tight">
                {fmtPctHero(chartBenchmarkVal, language)}
              </span>
              <span className="tabular-nums text-[1.6rem] sm:text-[2.25rem] font-light text-content-secondary/50 ml-0.5">
                %
              </span>
            </div>
            <span className="block text-sm text-content-secondary mt-1.5 leading-snug">
              <span className="hidden sm:inline">{t("engagement.kpi.tier_caption_full")}</span>
              <span className="sm:hidden">{t("engagement.kpi.tier_caption_short")}</span>
            </span>
          </div>

          {/* KPI 3 — Distance to benchmark */}
          <div
            className={cn(
              "rounded-xl border px-4 py-4 sm:px-5 sm:py-5",
              isPositive
                ? "border-signal-success/12 bg-signal-success/3"
                : "border-signal-danger/12 bg-signal-danger/3",
            )}
          >
            <span className="text-eyebrow-sm text-content-secondary block mb-2">
              <span className="hidden sm:inline">{t("engagement.kpi.gap_full")}</span>
              <span className="sm:hidden">{t("engagement.kpi.gap_short")}</span>
            </span>
            <div className="flex items-baseline gap-1.5">
              <span
                className={cn(
                  "tabular-nums text-[1.6rem] sm:text-[2.25rem] font-bold leading-none tracking-tight",
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
            <span className="block text-sm text-content-secondary mt-1.5 leading-snug">
              {t("engagement.kpi.gap_caption")}
            </span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="px-4 sm:px-5 md:px-6 mt-4 sm:mt-6 pb-5 sm:pb-6 md:pb-8">
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
        <div className="px-4 sm:px-5 md:px-6 pb-6 sm:pb-7 md:pb-8">
          <InsightCallout
            tone={isBelowBenchmark ? "danger" : "positive"}
            label={t("engagement.callout_label")}
          >
            <p>{readingText}</p>
          </InsightCallout>
        </div>
      )}
    </article>
  );
}

// ─── Formatters ─────────────────────────────────────────────────────

function fmtPctHero(n: number, lang: "pt" | "en"): string {
  if (!Number.isFinite(n)) return lang === "pt" ? "0,00" : "0.00";
  return formatNumber(n, lang, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

