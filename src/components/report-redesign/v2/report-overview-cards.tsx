import { Activity, CalendarDays, Layers } from "lucide-react";
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

  return (
    <div className="grid grid-cols-1 gap-4 md:gap-5 md:grid-cols-2 lg:grid-cols-3">
      <EngagementHealthCard
        engagement={k.engagementRate}
        benchmark={k.engagementBenchmark}
        deltaPct={k.engagementDeltaPct}
      />
      <PostingRhythmCard
        weekly={k.postingFrequencyWeekly}
        postsAnalyzed={k.postsAnalyzed}
        windowDays={windowDays}
      />
      <ContentEngineCard
        dominantFormat={k.dominantFormat}
        dominantShare={k.dominantFormatShare}
        breakdown={breakdown}
      />
    </div>
  );
}

// ─── Card primitives ─────────────────────────────────────────────────

function PremiumCard({
  eyebrow,
  title,
  icon,
  children,
  interpretation,
  interpretationTone = "neutral",
}: {
  eyebrow: string;
  title: string;
  icon: ReactNode;
  children: ReactNode;
  interpretation: string;
  interpretationTone?: "good" | "warn" | "bad" | "neutral";
}) {
  const toneCls =
    interpretationTone === "good"
      ? "text-emerald-700"
      : interpretationTone === "warn"
        ? "text-amber-700"
        : interpretationTone === "bad"
          ? "text-rose-700"
          : "text-slate-600";
  const dotCls =
    interpretationTone === "good"
      ? "bg-emerald-500"
      : interpretationTone === "warn"
        ? "bg-amber-500"
        : interpretationTone === "bad"
          ? "bg-rose-500"
          : "bg-slate-400";

  return (
    <article
      className={cn(
        REDESIGN_TOKENS.kpiCardV2,
        "p-5 md:p-6 lg:p-7 flex flex-col gap-5 min-w-0 h-full",
      )}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-2 min-w-0">
          <div className="flex items-center gap-2">
            <span className={REDESIGN_TOKENS.kpiIconBoxV2} aria-hidden="true">
              {icon}
            </span>
            <p className={REDESIGN_TOKENS.eyebrow}>{eyebrow}</p>
          </div>
          <h3 className="font-display text-[1.05rem] md:text-[1.15rem] font-semibold tracking-tight text-slate-900 leading-tight">
            {title}
          </h3>
        </div>
      </header>

      <div className="flex-1 flex flex-col gap-4 min-w-0">{children}</div>

      <p
        className={cn(
          "flex items-center gap-2 text-[13px] font-medium leading-snug",
          toneCls,
        )}
      >
        <span
          aria-hidden="true"
          className={cn("size-1.5 rounded-full shrink-0", dotCls)}
        />
        <span>{interpretation}</span>
      </p>
    </article>
  );
}

// ─── Card 1 — Saúde do envolvimento ──────────────────────────────────

function EngagementHealthCard({
  engagement,
  benchmark,
  deltaPct,
}: {
  engagement: number;
  benchmark: number;
  deltaPct: number;
}) {
  const hasBenchmark = benchmark > 0;
  const status = computeEngagementStatus(engagement, benchmark, deltaPct);

  return (
    <PremiumCard
      eyebrow="Visão geral"
      title="Saúde do envolvimento"
      icon={<Activity className="h-4 w-4" aria-hidden="true" />}
      interpretation={status.label}
      interpretationTone={status.tone}
    >
      <div className="flex items-end gap-3 flex-wrap">
        <span className="font-display text-[2.5rem] md:text-[2.75rem] font-semibold tracking-[-0.02em] text-slate-900 leading-none tabular-nums">
          {formatPct(engagement)}
        </span>
        {hasBenchmark && deltaPct !== 0 ? (
          <span
            className={cn(
              "font-mono text-[11px] uppercase tracking-[0.1em] pb-1",
              status.tone === "good"
                ? "text-emerald-700"
                : status.tone === "bad"
                  ? "text-rose-700"
                  : "text-amber-700",
            )}
          >
            {deltaPct > 0 ? "+" : ""}
            {deltaPct.toFixed(1).replace(".", ",")}%
          </span>
        ) : null}
      </div>

      {hasBenchmark ? (
        <p className="text-[13px] text-slate-600 leading-relaxed">
          vs.{" "}
          <span className="font-medium text-slate-800 tabular-nums">
            {formatPct(benchmark)}
          </span>{" "}
          de referência
        </p>
      ) : (
        <p className="text-[13px] text-slate-500 leading-relaxed">
          Sem referência disponível para esta categoria.
        </p>
      )}

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
    tone === "good"
      ? "bg-emerald-500"
      : tone === "warn"
        ? "bg-amber-500"
        : tone === "bad"
          ? "bg-rose-500"
          : "bg-slate-400";

  return (
    <div className="space-y-1.5" aria-hidden="true">
      <div className="relative h-2 w-full rounded-full bg-slate-100 overflow-visible">
        <div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full transition-all duration-500",
            barCls,
          )}
          style={{ width: `${erPct}%` }}
        />
        {/* Marca da referência */}
        <div
          className="absolute -top-1 -bottom-1 w-px bg-slate-400"
          style={{ left: `${refPct}%` }}
        />
        <div
          className="absolute -top-2 size-2 rounded-full bg-white ring-1 ring-slate-400"
          style={{ left: `calc(${refPct}% - 4px)` }}
        />
      </div>
      <div className="flex justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400">
        <span>0%</span>
        <span>referência</span>
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
  return { label: "Dentro da referência", tone: "warn" };
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
      eyebrow="Visão geral"
      title="Ritmo de publicação"
      icon={<CalendarDays className="h-4 w-4" aria-hidden="true" />}
      interpretation={status.label}
      interpretationTone={status.tone}
    >
      <div className="flex items-end gap-3 flex-wrap">
        <span className="font-display text-[2.5rem] md:text-[2.75rem] font-semibold tracking-[-0.02em] text-slate-900 leading-none tabular-nums">
          {weekly.toFixed(1).replace(".", ",")}
        </span>
        <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-slate-500 pb-1">
          publicações por semana
        </span>
      </div>

      {postsAnalyzed > 0 || windowDays > 0 ? (
        <p className="text-[13px] text-slate-600 leading-relaxed">
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
              dias de amostra analisada
            </>
          ) : null}
        </p>
      ) : null}

      <RhythmDots weekly={weekly} tone={status.tone} />
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
  // Mapa: cada dot representa um dia da semana. Acende-se em proporção
  // ao ritmo (até 7). Tons tone-coloridos para reforçar leitura.
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
      aria-hidden="true"
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

// ─── Card 3 — Motor de conteúdo ──────────────────────────────────────

interface BreakdownItem {
  format: string;
  sharePct: number;
}

function ContentEngineCard({
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
      eyebrow="Visão geral"
      title="Motor de conteúdo"
      icon={<Layers className="h-4 w-4" aria-hidden="true" />}
      interpretation={status.label}
      interpretationTone={status.tone}
    >
      <div className="flex items-end gap-3 flex-wrap">
        <FormatChipLarge label={dominantLabel} tone={tone} />
        {dominantShare > 0 ? (
          <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-slate-500 pb-1">
            {dominantShare}% da amostra
          </span>
        ) : null}
      </div>

      <p className="text-[13px] text-slate-600 leading-relaxed">
        Formato dominante na{" "}
        <span className="font-medium text-slate-800">amostra analisada</span>.
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

function FormatChipLarge({ label, tone }: { label: string; tone: FormatTone }) {
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
        "inline-flex items-center gap-2 rounded-full px-4 py-2 ring-1",
        "font-display text-[1.25rem] md:text-[1.375rem] font-semibold tracking-tight",
        toneCls,
      )}
    >
      <span className={cn("h-2 w-2 rounded-full", dot)} aria-hidden="true" />
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
