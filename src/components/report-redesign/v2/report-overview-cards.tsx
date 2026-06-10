import { Activity, CalendarDays, Layers, Info, ArrowUp, ArrowDown, Minus } from "lucide-react";
import type { ReactNode } from "react";

import type { AdapterResult } from "@/lib/report/snapshot-to-report-data";
import type { CadenceResult } from "@/lib/report/cadence";
import { cn } from "@/lib/utils";
import {
  INSTAGRAM_BENCHMARK_CONTEXT,
  getConsolidatedBenchmarkSeries,
  getActiveTierIndex,
} from "@/lib/knowledge/benchmark-context";
import { getTierForFollowers, getTierLabel } from "@/lib/benchmark/tiers";
import type { AccountTier } from "@/lib/benchmark/types";

import { REDESIGN_TOKENS } from "../report-tokens";
import { ReportSourceLabel } from "./report-source-label";
import { ReportEngagementBenchmarkChart } from "./report-engagement-benchmark-chart";

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
 * Overview cards (Phase 1B.1F) — três cartões cinematográficos que
 * resumem o estado geral do perfil:
 *
 *  1. Saúde do envolvimento  — ER vs. referência
 *  2. Ritmo de publicação     — frequência semanal + janela
 *  3. Motor de conteúdo       — formato dominante + distribuição
 *
 * Sem duplicação de seguidores / publicações totais (vivem no hero).
 */
export function ReportOverviewCards({ result }: Props) {
  const k = result.data.keyMetrics;
  const breakdown = result.data.formatBreakdown ?? [];
  const followers = result.data.profile.followers ?? 0;
  const cadence = result.enriched.cadence;

  return (
    <div className="grid grid-cols-1 gap-4 md:gap-5 lg:grid-cols-3">
      {/* Primary — engagement spans 2 cols on desktop */}
      <div className="lg:col-span-2">
        <EngagementRateCard
          engagement={k.engagementRate}
          benchmark={k.engagementBenchmark}
          deltaPct={k.engagementDeltaPct}
          followers={followers}
        />
      </div>
      {/* Secondary stack — rhythm + format */}
      <div className="lg:col-span-1 flex flex-col gap-4 md:gap-5">
        <PostingRhythmCard
          followers={followers}
          cadence={cadence}
        />
        <DominantFormatCard
          dominantFormat={k.dominantFormat}
          dominantShare={k.dominantFormatShare}
          breakdown={breakdown}
        />
      </div>
    </div>
  );
}

// ─── Card primitives ─────────────────────────────────────────────────

function PremiumCard({
  title,
  icon,
  children,
  interpretation,
  interpretationTone = "neutral",
  emphasis = "secondary",
  sourceSlot,
  titleExtra,
  accentTone,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  interpretation: string | null;
  interpretationTone?: "good" | "warn" | "bad" | "neutral";
  emphasis?: "primary" | "secondary";
  /** Chip de proveniência opcional, alinhado à direita do título. */
  sourceSlot?: ReactNode;
  /** Extra element rendered inline after the title (e.g. info tooltip). */
  titleExtra?: ReactNode;
  /** Subtle 2px top border accent. */
  accentTone?: "blue" | "green" | "rose" | "gold" | "slate";
}) {
  const chipCls =
    interpretationTone === "good"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
      : interpretationTone === "warn"
        ? "bg-amber-50 text-amber-700 ring-amber-100"
        : interpretationTone === "bad"
          ? "bg-rose-50 text-rose-700 ring-rose-100"
          : "bg-surface-muted text-content-secondary ring-border-default";
  const dotCls =
    interpretationTone === "good"
      ? "bg-emerald-500"
      : interpretationTone === "warn"
        ? "bg-amber-500"
        : interpretationTone === "bad"
          ? "bg-rose-500"
          : "bg-content-tertiary";

  const accentCls = accentTone
    ? ({
        blue: "border-t-2 border-t-blue-400/60",
        green: "border-t-2 border-t-emerald-400/60",
        rose: "border-t-2 border-t-rose-400/60",
        gold: "border-t-2 border-t-amber-400/60",
        slate: "border-t-2 border-t-border-default",
      })[accentTone]
    : "";

  const padding =
    emphasis === "primary"
      ? "p-6 md:p-7 lg:p-8"
      : "p-4 md:p-5";
  const titleCls =
    emphasis === "primary"
      ? "font-display text-[1.15rem] md:text-[1.3rem] font-semibold tracking-tight text-content-primary leading-tight"
      : "font-display text-[1rem] md:text-[1.05rem] font-semibold tracking-tight text-content-primary leading-tight";

  return (
    <article
      className={cn(
        REDESIGN_TOKENS.kpiCardV2,
        padding,
        "flex flex-col gap-4 min-w-0 h-full",
        accentCls,
      )}
    >
      <header>
        <div className="space-y-2 min-w-0">
          <span className={REDESIGN_TOKENS.kpiIconBoxV2} aria-hidden="true">
            {icon}
          </span>
          <h3 className={cn(titleCls, "inline-flex items-center gap-1.5")}>
            {title}
            {titleExtra ?? null}
          </h3>
        </div>
      </header>

      <div className="flex-1 flex flex-col gap-3.5 min-w-0">{children}</div>

      {interpretation ? (
        <span
          className={cn(
            "self-start inline-flex items-center gap-1.5 rounded-full ring-1 px-2.5 py-1",
            "text-[12px] font-medium",
            chipCls,
          )}
        >
          <span
            aria-hidden="true"
            className={cn("size-1.5 rounded-full shrink-0", dotCls)}
          />
          <span>{interpretation}</span>
        </span>
      ) : null}

      {sourceSlot ? (
        <div className="pt-3 mt-1 border-t border-border-subtle">{sourceSlot}</div>
      ) : null}
    </article>
  );
}

// ─── Card 1 — Taxa de engagement ─────────────────────────────────────

function EngagementRateCard({
  engagement,
  benchmark,
  deltaPct,
  followers,
}: {
  engagement: number;
  benchmark: number;
  deltaPct: number;
  followers: number;
}) {
  const status = computeEngagementStatus(engagement, benchmark, deltaPct);
  const benchmarkSeries = getConsolidatedBenchmarkSeries();
  const activeTierIdx = getActiveTierIndex(followers, benchmarkSeries);
  const activeSourceRefs = INSTAGRAM_BENCHMARK_CONTEXT.sources
    .filter((s) => s.visibility === "active")
    .map((s) => ({ name: s.name, url: s.url }));

  return (
    <PremiumCard
      title="Taxa de engagement deste perfil"
      icon={<Activity className="h-4 w-4" aria-hidden="true" />}
      interpretation={null}
      emphasis="primary"
      accentTone="blue"
      titleExtra={<EngagementInfoTooltip />}
      sourceSlot={
        <ReportSourceLabel type="auto" detail="Gostos + comentários" />
      }
    >
      <EngagementComparison engagement={engagement} benchmark={benchmark} />
      <ReportEngagementBenchmarkChart
        profileEngagementRatePct={engagement}
        followersCount={followers}
        benchmarkSeries={benchmarkSeries}
        activeTierIndex={activeTierIdx}
        sourceReferences={activeSourceRefs}
        activeTierLabel={benchmarkSeries[activeTierIdx]?.tierLabel}
        showProSlot
      />
    </PremiumCard>
  );
}

function computeEngagementStatus(
  engagement: number,
  benchmark: number,
  deltaPct: number,
): { label: string; tone: "good" | "warn" | "bad" | "neutral" } {
  if (benchmark <= 0) {
    return { label: "Sem referência para comparar", tone: "neutral" };
  }
  // ±10% banda neutra (alinha com regra do motor de benchmark).
  if (deltaPct >= 10) return { label: "Acima da referência", tone: "good" };
  if (deltaPct <= -10) return { label: "Abaixo da referência", tone: "bad" };
  return { label: "Dentro da referência", tone: "neutral" };
}

// ─── Comparison headline ─────────────────────────────────────────────

function EngagementComparison({
  engagement,
  benchmark,
}: {
  engagement: number;
  benchmark: number;
}) {
  const gapPp = engagement - benchmark;
  const gapTone: "good" | "bad" | "neutral" =
    Math.abs(gapPp) < 0.15 ? "neutral" : gapPp > 0 ? "good" : "bad";
  const gapColor =
    gapTone === "good"
      ? "text-emerald-600"
      : gapTone === "bad"
        ? "text-rose-600"
        : "text-content-secondary";

  return (
    <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
      <div className="flex flex-col">
        <span className="text-eyebrow-sm text-content-tertiary">Este perfil</span>
        <span className="tabular-nums text-[2.25rem] md:text-[2.5rem] font-semibold tracking-[-0.02em] text-content-primary leading-none tabular-nums">
          {formatPct(engagement)}
        </span>
      </div>
      <div className="flex flex-col">
        <span className="text-eyebrow-sm text-content-tertiary">% Média de perfis semelhantes</span>
        <span className="tabular-nums text-[1.1rem] md:text-[1.25rem] font-medium tracking-[-0.01em] text-content-secondary leading-none tabular-nums">
          {formatPct(benchmark)}
        </span>
      </div>
      <div className="flex flex-col">
        <span className="text-eyebrow-sm text-content-tertiary">Gap</span>
        <span className={cn("tabular-nums text-[1.1rem] md:text-[1.25rem] font-medium tracking-[-0.01em] leading-none tabular-nums", gapColor)}>
          {fmtPpCard(gapPp)} p.p.
        </span>
      </div>
    </div>
  );
}

function fmtPpCard(n: number): string {
  const abs = Math.abs(n);
  const s = abs.toFixed(1).replace(".", ",");
  return n < 0 ? `−${s}` : `+${s}`;
}

// ─── Info tooltip for engagement title ───────────────────────────────

function EngagementInfoTooltip() {
  return (
    // Touch-friendly: button toggles via :focus (click on touch devices),
    // and hover on pointer devices. Width clamped to viewport on mobile.
    <span className="relative group/info inline-flex">
      <button
        type="button"
        tabIndex={0}
        aria-label="Como é calculada a taxa de engagement"
        className="inline-flex items-center justify-center size-6 -m-1 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40"
      >
        <Info className="size-3.5 text-content-tertiary cursor-help" aria-hidden />
      </button>
      <span
        role="tooltip"
        className={cn(
          "absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20",
          "w-[260px] max-w-[calc(100vw-2rem)] rounded-lg bg-white shadow-lg ring-1 ring-border-default/60",
          "px-3 py-2.5 text-xs text-content-secondary leading-relaxed font-normal tracking-normal",
          "pointer-events-none opacity-0 scale-95",
          "group-hover/info:opacity-100 group-hover/info:scale-100",
          "group-focus-within/info:opacity-100 group-focus-within/info:scale-100",
          "transition-all duration-150",
        )}
      >
        A taxa de engagement compara gostos e comentários com a dimensão da
        audiência. É uma referência direcional e pode variar por setor,
        dimensão da conta e método de cálculo.
      </span>
    </span>
  );
}

// ─── Posting frequency benchmark data ────────────────────────────────
// Source: Later.com (19M posts, March 2025) + Buffer.com (2M+ posts, 2025)

const POSTING_FREQ_BENCHMARK: Record<AccountTier, number> = {
  nano: 2,
  micro: 3,
  mid: 5,
  macro: 5,
  mega: 7,
};

/** Buffer general recommended range (posts/week), 2025 data. */
const BUFFER_GENERAL_RANGE = { min: 3, max: 5 };

// ─── Cadence copy helpers (pure, exported for tests) ────────────────

export function getCadenceHeaderPt(method: CadenceResult["method"]): string {
  if (method === "window_30d") return "Ritmo observado nos últimos 30 dias";
  if (method === "window_90d") return "Ritmo observado nos últimos 90 dias";
  if (method === "sample_span") return "Ritmo observado na amostra recente";
  return "Ritmo de publicação";
}

export function getCadenceSummaryPt(
  method: CadenceResult["method"],
  sampleSize: number,
  windowDays: number,
): string | null {
  if (method === "window_30d") return `${sampleSize} publicações nos últimos 30 dias`;
  if (method === "window_90d") return `${sampleSize} publicações nos últimos 90 dias`;
  if (method === "sample_span") return `${sampleSize} publicações em ${windowDays} dias (amostra reduzida)`;
  return null;
}

export function getCadenceFormulaNotePt(method: CadenceResult["method"]): string | null {
  if (method === "window_30d") return "Cadência estimada = publicações na janela ÷ 4,345 semanas";
  if (method === "window_90d") return "Cadência estimada = publicações na janela ÷ 12,857 semanas";
  if (method === "sample_span") return "Cadência estimada = publicações na amostra ÷ semanas da amostra";
  return null;
}

// ─── Card 2 — Ritmo de publicação ────────────────────────────────────

function PostingRhythmCard({
  followers,
  cadence,
}: {
  followers: number;
  cadence: CadenceResult;
}) {
  const method = cadence.method;
  const sufficient = cadence.sufficient;
  const sampleSize = cadence.sampleSize;
  const windowDays = cadence.windowDays;
  const weekly = cadence.weekly;
  const provisional = sufficient && cadence.reliability === "low";

  const header = getCadenceHeaderPt(method);
  const summaryLine = sufficient ? getCadenceSummaryPt(method, sampleSize, windowDays) : null;
  const formulaNote = getCadenceFormulaNotePt(method);

  const tier = getTierForFollowers(followers);
  const tierLabel = getTierLabel(tier);
  const benchmarkWeekly = POSTING_FREQ_BENCHMARK[tier];
  const gap = weekly - benchmarkWeekly;
  const gapStatus = computeFreqGapStatus(gap);
  const tierRange = extractTierRange(tierLabel);

  return (
    <PremiumCard
      title={header}
      icon={<CalendarDays className="h-4 w-4" aria-hidden="true" />}
      interpretation={
        !sufficient
          ? "Dados insuficientes"
          : provisional
            ? "Leitura provisória"
            : gapStatus.label
      }
      interpretationTone={!sufficient ? "neutral" : provisional ? "warn" : gapStatus.tone}
      accentTone={gapStatus.tone === "good" ? "green" : gapStatus.tone === "warn" ? "rose" : gapStatus.tone === "bad" ? "rose" : undefined}
      sourceSlot={
        <div className="space-y-1.5">
          {formulaNote ? (
            <p className="text-xs text-content-tertiary leading-relaxed">{formulaNote}</p>
          ) : null}
          <p className="text-xs text-content-tertiary leading-relaxed">
            <a href="https://later.com/blog/how-often-post-to-instagram" target="_blank" rel="noopener noreferrer" aria-label="Later — referência por escalão" className="underline decoration-content-tertiary hover:text-content-secondary transition-colors">[1]</a>{" "}
            referência por escalão{" · "}
            <a href="https://buffer.com/resources/how-often-to-post-on-instagram" target="_blank" rel="noopener noreferrer" aria-label="Buffer — intervalo geral" className="underline decoration-content-tertiary hover:text-content-secondary transition-colors">[2]</a>{" "}
            intervalo geral
          </p>
        </div>
      }
    >
      {/* Main metric */}
      <div className="flex items-end gap-3 flex-wrap">
        {sufficient ? (
          <span className="text-eyebrow text-content-tertiary pb-1">≈</span>
        ) : null}
        <span className="tabular-nums text-[1.85rem] md:text-[2.1rem] font-semibold tracking-[-0.015em] text-content-primary leading-none tabular-nums">
          {sufficient ? weekly.toFixed(1).replace(".", ",") : "—"}
        </span>
        <span className="text-eyebrow text-content-tertiary pb-1">
          /semana
        </span>
      </div>
      {!sufficient ? (
        <p className="text-[13px] text-content-secondary leading-relaxed">
          Dados recentes insuficientes para estimar ritmo.
        </p>
      ) : null}

      {/* Window context */}
      {summaryLine ? (
        <p className="text-[13px] text-content-secondary leading-relaxed">
          {summaryLine}
        </p>
      ) : null}

      {/* Format transparency note */}
      {sufficient && (
        <p className="text-xs text-content-tertiary leading-relaxed">
          Inclui imagens, carrosséis e Reels publicados no feed.
        </p>
      )}

      {/* Benchmark bar chart */}
      {sufficient && (
        <FrequencyBenchmarkBars
          profileValue={weekly}
          benchmarkValue={benchmarkWeekly}
          tierRange={tierRange}
          gapTone={gapStatus.tone}
          bufferRange={BUFFER_GENERAL_RANGE}
        />
      )}
    </PremiumCard>
  );
}

/** Extract "0–10K" from "Nano (0–10K)". */
function extractTierRange(label: string): string {
  const match = label.match(/\(([^)]+)\)/);
  return match?.[1] ?? label;
}

// ─── Frequency benchmark bar chart ───────────────────────────────────

function FrequencyBenchmarkBars({
  profileValue,
  benchmarkValue,
  tierRange,
  gapTone,
  bufferRange,
}: {
  profileValue: number;
  benchmarkValue: number;
  tierRange: string;
  gapTone: "good" | "warn" | "bad" | "neutral";
  bufferRange: { min: number; max: number };
}) {
  const max = Math.max(profileValue, benchmarkValue, bufferRange.max, 1) * 1.25;
  const profilePct = Math.min((profileValue / max) * 100, 100);
  const benchPct = Math.min((benchmarkValue / max) * 100, 100);
  const bufMinPct = Math.min((bufferRange.min / max) * 100, 100);
  const bufMaxPct = Math.min((bufferRange.max / max) * 100, 100);

  const barColor =
    gapTone === "good"
      ? "bg-emerald-500/80"
      : gapTone === "warn"
        ? "bg-amber-500/80"
        : gapTone === "bad"
          ? "bg-rose-400/80"
          : "bg-content-tertiary/80";

  const gap = profileValue - benchmarkValue;
  const GapIcon = gap > 0 ? ArrowUp : gap < 0 ? ArrowDown : Minus;
  const gapLabel = gap > 0
    ? `+${gap.toFixed(1).replace(".", ",")}`
    : gap < 0
      ? gap.toFixed(1).replace(".", ",")
      : "0";

  const bufferStatus = profileValue >= bufferRange.min && profileValue <= bufferRange.max
    ? "Dentro do intervalo geral"
    : profileValue > bufferRange.max
      ? "Acima do intervalo geral"
      : "Abaixo do intervalo geral";

  return (
    <div className="space-y-2.5"
      role="img"
      aria-label={`Frequência do perfil: ${profileValue.toFixed(1)} posts/semana vs escalão ${tierRange}: ${benchmarkValue}/semana`}
    >
      {/* Buffer general range band */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-content-tertiary">Intervalo geral</span>
          <span className="tabular-nums text-xs text-content-tertiary tabular-nums">
            {bufferRange.min}–{bufferRange.max}/sem
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-surface-muted overflow-hidden relative">
          <div
            className="absolute h-full rounded-full bg-blue-100/70"
            style={{ left: `${bufMinPct}%`, width: `${bufMaxPct - bufMinPct}%` }}
            aria-hidden
          />
        </div>
      </div>

      {/* Profile bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-content-secondary">Perfil</span>
          <span className="tabular-nums text-xs text-content-secondary tabular-nums">
            {profileValue.toFixed(1).replace(".", ",")}/sem
          </span>
        </div>
        <div className="h-2.5 w-full rounded-full bg-surface-muted overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", barColor)}
            style={{ width: `${profilePct}%` }}
          />
        </div>
      </div>

      {/* Benchmark bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-content-tertiary">
            Escalão {tierRange}
          </span>
          <span className="tabular-nums text-xs text-content-tertiary tabular-nums">
            {benchmarkValue}/sem
          </span>
        </div>
        <div className="h-2.5 w-full rounded-full bg-surface-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-content-tertiary/70 transition-all"
            style={{ width: `${benchPct}%` }}
          />
        </div>
      </div>

      {/* Gap indicator */}
      <div className="flex items-center gap-1.5 pt-0.5">
        <GapIcon className={cn(
          "size-3",
          gapTone === "good" ? "text-emerald-600" :
          gapTone === "warn" ? "text-amber-600" :
          gapTone === "bad" ? "text-rose-500" :
          "text-content-tertiary"
        )} />
        <span className={cn(
          "tabular-nums text-xs tabular-nums",
          gapTone === "good" ? "text-emerald-600" :
          gapTone === "warn" ? "text-amber-600" :
          gapTone === "bad" ? "text-rose-500" :
          "text-content-tertiary"
        )}>
          {gapLabel} posts/sem vs escalão
        </span>
      </div>
      <p className="text-xs text-content-tertiary italic">
        {bufferStatus}
      </p>
    </div>
  );
}

function computeFreqGapStatus(gap: number): {
  label: string;
  tone: "good" | "warn" | "bad" | "neutral";
} {
  if (gap >= 1) return { label: "Acima da referência", tone: "good" };
  if (gap >= -0.5) return { label: "Dentro da referência", tone: "neutral" };
  if (gap >= -2) return { label: "Abaixo da referência", tone: "warn" };
  return { label: "Muito abaixo da referência", tone: "bad" };
}

// ─── Card 3 — Formato mais regular ───────────────────────────────────

interface BreakdownItem {
  format: string;
  sharePct: number;
}

function DominantFormatCard({
  dominantFormat,
  dominantShare,
  breakdown,
}: {
  dominantFormat: string;
  dominantShare: number;
  breakdown: ReadonlyArray<BreakdownItem>;
}) {
  const dominantLabel = FORMAT_PT[dominantFormat] ?? dominantFormat;
  const status = computeMixStatus(dominantShare, breakdown);
  const tone = formatChipTone(dominantLabel);

  return (
    <PremiumCard
      title="Formato mais regular"
      icon={<Layers className="h-4 w-4" aria-hidden="true" />}
      interpretation={null}
      interpretationTone={status.tone}
      accentTone="slate"
      sourceSlot={
        <ReportSourceLabel type="auto" detail="Distribuição de formatos" />
      }
    >
      <div className="flex items-end gap-3 flex-wrap min-w-0">
        <span className="tabular-nums text-[1.85rem] md:text-[2.1rem] font-semibold tracking-[-0.015em] text-content-primary leading-none tabular-nums">
          {dominantShare > 0 ? `${dominantShare}%` : "—"}
        </span>
        {dominantLabel ? (
          <FormatChipContextual label={dominantLabel} tone={tone} />
        ) : null}
      </div>

      <p className="text-[13px] text-content-secondary leading-relaxed">
        formato mais frequente na amostra
      </p>
      <p className="text-[12px] text-content-tertiary leading-relaxed italic">
        {formatStrategicNote(dominantLabel)}
      </p>

      {breakdown.length > 0 ? (
        <FormatStackedBar breakdown={breakdown} />
      ) : null}
    </PremiumCard>
  );
}

function FormatStackedBar({
  breakdown,
}: {
  breakdown: ReadonlyArray<BreakdownItem>;
}) {
  const total = breakdown.reduce((sum, b) => sum + (b.sharePct || 0), 0);
  if (total <= 0) return null;
  const items = breakdown.filter((b) => (b.sharePct || 0) > 0);
  return (
    <div className="space-y-2">
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-surface-muted">
        {items.map((b) => {
          const tone = formatChipTone(FORMAT_PT[b.format] ?? b.format);
          const cls =
            tone === "primary"
              ? "bg-blue-500"
              : tone === "success"
                ? "bg-emerald-500"
                : tone === "warning"
                  ? "bg-amber-500"
                  : "bg-content-tertiary";
          return (
            <div
              key={b.format}
              className={cn("h-full", cls)}
              style={{ width: `${(b.sharePct / total) * 100}%` }}
              aria-label={`${FORMAT_PT[b.format] ?? b.format}: ${b.sharePct}%`}
            />
          );
        })}
      </div>
      <ul className="text-eyebrow-sm flex flex-wrap gap-x-3 gap-y-1 text-content-tertiary">
        {items.map((b) => {
          const label = FORMAT_PT[b.format] ?? b.format;
          const tone = formatChipTone(label);
          const dot =
            tone === "primary"
              ? "bg-blue-500"
              : tone === "success"
                ? "bg-emerald-500"
                : tone === "warning"
                  ? "bg-amber-500"
                  : "bg-content-tertiary";
          return (
            <li key={b.format} className="inline-flex items-center gap-1.5">
              <span className={cn("size-1.5 rounded-full", dot)} aria-hidden="true" />
              {label} {b.sharePct}%
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function computeMixStatus(
  dominantShare: number,
  breakdown: ReadonlyArray<BreakdownItem>,
): { label: string; tone: "good" | "warn" | "bad" | "neutral" } {
  const nonZero = breakdown.filter((b) => (b.sharePct || 0) > 0).length;
  if (dominantShare === 0 && nonZero === 0) {
    return { label: "Sem dados de formato", tone: "neutral" };
  }
  if (nonZero <= 1) {
    return { label: "Pouca diversidade de formatos", tone: "bad" };
  }
  if (dominantShare >= 65) {
    return { label: "Formato dominante claro", tone: "warn" };
  }
  return { label: "Mistura equilibrada", tone: "good" };
}

// ─── Format chip ─────────────────────────────────────────────────────

type FormatTone = "primary" | "success" | "warning" | "neutral";

function formatChipTone(label: string): FormatTone {
  if (label === "Reels") return "primary";
  if (label === "Carrosséis") return "success";
  if (label === "Imagens") return "warning";
  return "neutral";
}

function FormatChipContextual({
  label,
  tone,
}: {
  label: string;
  tone: FormatTone;
}) {
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
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ring-1 mb-1.5",
        "text-[13px] font-medium tracking-tight",
        toneCls,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", dot)} aria-hidden="true" />
      {label}
    </span>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────

function formatPct(n: number): string {
  if (!Number.isFinite(n)) return "0,00%";
  return `${n.toFixed(2).replace(".", ",")}%`;
}

function formatStrategicNote(label: string): string {
  const copy = INSTAGRAM_BENCHMARK_CONTEXT.visibleCopyRulesPt;
  if (label === "Reels") return copy.reelsExplanation;
  if (label === "Carrosséis") return copy.carouselExplanation;
  if (label === "Imagens") return copy.imageExplanation;
  return "Cada formato cumpre uma função distinta — o equilíbrio depende da intenção editorial.";
}
