import { Activity, CalendarDays, Layers } from "lucide-react";
import type { ReactNode } from "react";

import type { AdapterResult } from "@/lib/report/snapshot-to-report-data";
import { cn } from "@/lib/utils";
import {
  INSTAGRAM_BENCHMARK_CONTEXT,
  getBufferTierForFollowers,
} from "@/lib/knowledge/benchmark-context";

import { REDESIGN_TOKENS } from "../report-tokens";
import { ReportSourceLabel } from "./report-source-label";
import { ReportBenchmarkEvidence } from "./report-benchmark-evidence";

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
  const windowDays = result.coverage.windowDays ?? 0;
  const breakdown = result.data.formatBreakdown ?? [];
  const followers = result.data.profile.followers ?? 0;

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
          weekly={k.postingFrequencyWeekly}
          postsAnalyzed={k.postsAnalyzed}
          windowDays={windowDays}
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
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  interpretation: string | null;
  interpretationTone?: "good" | "warn" | "bad" | "neutral";
  emphasis?: "primary" | "secondary";
  /** Chip de proveniência opcional, alinhado à direita do título. */
  sourceSlot?: ReactNode;
}) {
  const chipCls =
    interpretationTone === "good"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
      : interpretationTone === "warn"
        ? "bg-amber-50 text-amber-700 ring-amber-100"
        : interpretationTone === "bad"
          ? "bg-rose-50 text-rose-700 ring-rose-100"
          : "bg-slate-50 text-slate-700 ring-slate-200";
  const dotCls =
    interpretationTone === "good"
      ? "bg-emerald-500"
      : interpretationTone === "warn"
        ? "bg-amber-500"
        : interpretationTone === "bad"
          ? "bg-rose-500"
          : "bg-slate-400";

  const padding =
    emphasis === "primary"
      ? "p-6 md:p-7 lg:p-8"
      : "p-4 md:p-5";
  const titleCls =
    emphasis === "primary"
      ? "font-display text-[1.15rem] md:text-[1.3rem] font-semibold tracking-tight text-slate-900 leading-tight"
      : "font-display text-[1rem] md:text-[1.05rem] font-semibold tracking-tight text-slate-900 leading-tight";

  return (
    <article
      className={cn(
        REDESIGN_TOKENS.kpiCardV2,
        padding,
        "flex flex-col gap-4 min-w-0 h-full",
      )}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-2 min-w-0">
          <span className={REDESIGN_TOKENS.kpiIconBoxV2} aria-hidden="true">
            {icon}
          </span>
          <h3 className={titleCls}>{title}</h3>
        </div>
        {sourceSlot ? (
          <div className="shrink-0 max-w-[55%]">{sourceSlot}</div>
        ) : null}
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
  const hasBenchmark = benchmark > 0;
  const status = computeEngagementStatus(engagement, benchmark, deltaPct);
  const bufferTier = getBufferTierForFollowers(followers);
  const followerTierLabel = bufferTier
    ? bufferTier.tier.replace("-", "–")
    : null;
  const isAboveBufferRange = Number.isFinite(followers) && followers >= 1_000_000;
  const aboveRangeHint = isAboveBufferRange
    ? INSTAGRAM_BENCHMARK_CONTEXT.visibleCopyRulesPt.aboveBufferRangeHint
    : null;

  return (
    <PremiumCard
      title="Taxa de envolvimento"
      icon={<Activity className="h-4 w-4" aria-hidden="true" />}
      interpretation={status.label}
      interpretationTone={status.tone}
      emphasis="primary"
      sourceSlot={
        <ReportSourceLabel type="calculation" detail="Gostos + comentários" />
      }
    >
      <div className="flex items-end gap-3 flex-wrap">
        <span className="font-display text-[3rem] md:text-[3.5rem] font-semibold tracking-[-0.025em] text-slate-900 leading-none tabular-nums">
          {formatPct(engagement)}
        </span>
        {hasBenchmark && deltaPct !== 0 ? (
          <span
            className={cn(
              "font-mono text-[11px] uppercase tracking-[0.1em] pb-1.5",
              status.tone === "good"
                ? "text-emerald-700"
                : status.tone === "bad"
                  ? "text-rose-700"
                  : "text-slate-500",
            )}
          >
            {deltaPct > 0 ? "+" : ""}
            {deltaPct.toFixed(1).replace(".", ",")}%
          </span>
        ) : null}
      </div>

      <p className="text-[13px] text-slate-600 leading-relaxed">
        gostos e comentários face à dimensão do perfil
      </p>

      {hasBenchmark ? (
        <div className="space-y-2">
          <p className="text-[12px] text-slate-500 leading-relaxed">
            vs.{" "}
            <span className="font-medium text-slate-700 tabular-nums">
              {formatPct(benchmark)}
            </span>{" "}
            de referência
          </p>
          <ReportBenchmarkEvidence
            platform="instagram"
            followerTier={isAboveBufferRange ? null : followerTierLabel}
            industry={null}
            sourceNames={["Socialinsider", "Buffer"]}
            aboveBufferRangeHint={aboveRangeHint}
          />
        </div>
      ) : (
        <p className="text-[12px] text-slate-500 leading-relaxed">
          Sem referência disponível para esta categoria.
        </p>
      )}

      <p className="text-[11.5px] text-slate-500 leading-relaxed italic">
        {INSTAGRAM_BENCHMARK_CONTEXT.visibleCopyRulesPt.engagementExplanation}
      </p>

      {hasBenchmark ? (
        <EngagementDistanceBar
          engagement={engagement}
          benchmark={benchmark}
          tone={status.tone}
        />
      ) : null}
    </PremiumCard>
  );
}

function EngagementDistanceBar({
  engagement,
  benchmark,
  tone,
}: {
  engagement: number;
  benchmark: number;
  tone: "good" | "warn" | "bad" | "neutral";
}) {
  // Escala: 0 → 2× referência. Posiciona barra do perfil e marca de referência.
  const max = Math.max(benchmark * 2, engagement * 1.1, 0.01);
  const erPct = clamp((engagement / max) * 100, 0, 100);
  const refPct = clamp((benchmark / max) * 100, 0, 100);

  const barCls =
    tone === "bad"
      ? "bg-rose-400"
      : tone === "good"
        ? "bg-emerald-500"
        : "bg-blue-500";

  return (
    <div className="space-y-1.5" aria-hidden="true">
      <div className="relative h-2.5 w-full rounded-full bg-slate-100 overflow-visible">
        <div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full transition-all duration-500",
            barCls,
          )}
          style={{ width: `${erPct}%` }}
        />
        {/* Marca da referência */}
        <div
          className="absolute -top-1 -bottom-1 w-px bg-blue-400"
          style={{ left: `${refPct}%` }}
        />
        <div
          className="absolute -top-2 size-2 rounded-full bg-white ring-1 ring-blue-500"
          style={{ left: `calc(${refPct}% - 4px)` }}
        />
      </div>
      <div className="relative font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400">
        <span>0%</span>
        <span
          className="absolute -translate-x-1/2 text-blue-600"
          style={{ left: `${refPct}%` }}
        >
          referência
        </span>
      </div>
    </div>
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

// ─── Card 2 — Ritmo de publicação ────────────────────────────────────

function PostingRhythmCard({
  weekly,
  postsAnalyzed,
  windowDays,
}: {
  weekly: number;
  postsAnalyzed: number;
  windowDays: number;
}) {
  const status = computeRhythmStatus(weekly);

  return (
    <PremiumCard
      title="Ritmo de publicação"
      icon={<CalendarDays className="h-4 w-4" aria-hidden="true" />}
      interpretation={null}
      interpretationTone={status.tone}
      sourceSlot={<ReportSourceLabel type="calculation" detail="Posts ÷ janela" />}
    >
      <div className="flex items-end gap-3 flex-wrap">
        <span className="font-display text-[2rem] md:text-[2.25rem] font-semibold tracking-[-0.02em] text-slate-900 leading-none tabular-nums">
          {weekly.toFixed(1).replace(".", ",")}
        </span>
        <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-slate-500 pb-1">
          /semana
        </span>
      </div>

      {postsAnalyzed > 0 || windowDays > 0 ? (
        <p className="text-[12.5px] text-slate-600 leading-relaxed">
          {postsAnalyzed > 0 ? (
            <>
              <span className="font-medium text-slate-800 tabular-nums">
                {postsAnalyzed}
              </span>{" "}
              publicações
            </>
          ) : null}
          {postsAnalyzed > 0 && windowDays > 0 ? " em " : null}
          {windowDays > 0 ? (
            <>
              <span className="font-medium text-slate-800 tabular-nums">
                {windowDays}
              </span>{" "}
              dias analisados
            </>
          ) : null}
        </p>
      ) : null}

      <p className="text-[11.5px] text-slate-500 leading-relaxed italic">
        Volume não garante desempenho — é o equilíbrio entre cadência e qualidade que sustenta o envolvimento.
      </p>

      <RhythmDots weekly={weekly} tone={status.tone} />
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400">
        escala · 0 → 7+ por semana
      </p>
    </PremiumCard>
  );
}

function RhythmDots({
  weekly,
  tone,
}: {
  weekly: number;
  tone: "good" | "warn" | "bad" | "neutral";
}) {
  // Escala visual 0 → 7+ que reflecte a intensidade do ritmo semanal.
  // Os segmentos NÃO representam dias específicos da semana — apenas
  // posições numa escala contínua.
  const filled = Math.round(clamp(weekly, 0, 7));
  const partial = clamp(weekly - filled, 0, 1);
  const onCls =
    tone === "good"
      ? "bg-emerald-500"
      : tone === "warn"
        ? "bg-amber-500"
        : tone === "bad"
          ? "bg-rose-400"
          : "bg-slate-400";
  return (
    <div
      className="flex items-center gap-1.5"
      role="presentation"
      aria-label={`Escala de ritmo semanal: ${weekly.toFixed(1).replace(".", ",")} de 7+`}
    >
      {Array.from({ length: 7 }, (_, i) => {
        const isOn = i < filled;
        const isPartial = !isOn && i === filled && partial > 0;
        return (
          <span
            key={i}
            className={cn(
              "h-2.5 w-6 rounded-full",
              isOn
                ? onCls
                : isPartial
                  ? cn(onCls, "opacity-40")
                  : "bg-slate-200",
            )}
          />
        );
      })}
    </div>
  );
}

function computeRhythmStatus(weekly: number): {
  label: string;
  tone: "good" | "warn" | "bad" | "neutral";
} {
  if (weekly <= 0) return { label: "Sem publicações na amostra", tone: "neutral" };
  if (weekly >= 5) return { label: "Ritmo elevado", tone: "good" };
  if (weekly >= 2) return { label: "Ritmo moderado", tone: "warn" };
  return { label: "Ritmo baixo", tone: "bad" };
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
      sourceSlot={
        <ReportSourceLabel type="calculation" detail="Distribuição de formatos" />
      }
    >
      <div className="flex items-end gap-3 flex-wrap min-w-0">
        <span className="font-display text-[2rem] md:text-[2.25rem] font-semibold tracking-[-0.02em] text-slate-900 leading-none tabular-nums">
          {dominantShare > 0 ? `${dominantShare}%` : "—"}
        </span>
        {dominantLabel ? (
          <FormatChipContextual label={dominantLabel} tone={tone} />
        ) : null}
      </div>

      <p className="text-[12.5px] text-slate-600 leading-relaxed">
        formato mais frequente na amostra
      </p>
      <p className="text-[11.5px] text-slate-500 leading-relaxed italic">
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
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        {items.map((b) => {
          const tone = formatChipTone(FORMAT_PT[b.format] ?? b.format);
          const cls =
            tone === "primary"
              ? "bg-blue-500"
              : tone === "success"
                ? "bg-emerald-500"
                : tone === "warning"
                  ? "bg-amber-500"
                  : "bg-slate-400";
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
      <ul className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500">
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
                  : "bg-slate-400";
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

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

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
