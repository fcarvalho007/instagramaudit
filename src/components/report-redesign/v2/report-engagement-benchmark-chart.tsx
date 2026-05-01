import { Lock } from "lucide-react";

import { cn } from "@/lib/utils";
import type { BenchmarkTierPoint } from "@/lib/knowledge/benchmark-context";

export interface BenchmarkChartProps {
  profileEngagementRatePct: number;
  followersCount: number;
  benchmarkSeries: readonly BenchmarkTierPoint[];
  activeTierIndex: number;
  sourceReferences: ReadonlyArray<{ name: string; url: string }>;
  showProSlot?: boolean;
  competitor?: { handle: string; engagementRatePct: number } | null;
  onProSlotClick?: () => void;
}

// ─── Constants ──────────────────────────────────────────────────────

const CHART_H = 170;
const BAR_RADIUS = 4;
const GRID_LINES = 3;
const MIN_PROFILE_PX = 4;

// ─── Main component ────────────────────────────────────────────────

export function ReportEngagementBenchmarkChart({
  profileEngagementRatePct,
  benchmarkSeries,
  activeTierIndex,
  sourceReferences,
  showProSlot = false,
  competitor,
  onProSlotClick,
}: BenchmarkChartProps) {
  const n = benchmarkSeries.length;
  if (n === 0) return null;

  const activeTier = benchmarkSeries[activeTierIndex];
  const benchmarkVal = activeTier?.engagementRatePct ?? 0;
  const profileVal = profileEngagementRatePct;

  // Scale: max of all values + 20% headroom
  const allVals = benchmarkSeries.map((t) => t.engagementRatePct);
  if (profileVal > 0) allVals.push(profileVal);
  if (competitor?.engagementRatePct) allVals.push(competitor.engagementRatePct);
  const scaleMax = Math.max(...allVals) * 1.2 || 1;

  // Gap calculation
  const gapPp = profileVal - benchmarkVal;
  const gapLabel =
    Math.abs(gapPp) < 0.15
      ? "Em linha com a referência"
      : gapPp > 0
        ? `Acima da referência: +${fmtPp(gapPp)} p.p.`
        : `Gap face à referência: ${fmtPp(gapPp)} p.p.`;
  const gapTone: "good" | "bad" | "neutral" =
    Math.abs(gapPp) < 0.15 ? "neutral" : gapPp > 0 ? "good" : "bad";

  // SVG layout
  const padL = 0;
  const padR = 0;
  const padT = 28;
  const padB = 22;
  const chartW = 100; // percentage-based viewBox
  const innerW = chartW - padL - padR;
  const innerH = CHART_H - padT - padB;
  const barGap = innerW / n;
  const barW = barGap * 0.45;
  const activeBarW = barGap * 0.55;

  function yForVal(v: number): number {
    return padT + innerH - (v / scaleMax) * innerH;
  }

  const refY = yForVal(benchmarkVal);

  return (
    <div className="flex flex-col gap-4">
      {/* Gap message */}
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full ring-1 px-2.5 py-1",
            "text-[12px] font-medium",
            gapTone === "good"
              ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
              : gapTone === "bad"
                ? "bg-rose-50 text-rose-700 ring-rose-100"
                : "bg-slate-50 text-slate-600 ring-slate-200",
          )}
        >
          <span
            className={cn(
              "size-1.5 rounded-full shrink-0",
              gapTone === "good"
                ? "bg-emerald-500"
                : gapTone === "bad"
                  ? "bg-rose-500"
                  : "bg-slate-400",
            )}
            aria-hidden
          />
          {gapLabel}
        </span>
      </div>

      {/* SVG Chart */}
      <svg
        viewBox={`0 0 ${chartW} ${CHART_H}`}
        className="w-full"
        style={{ height: `${CHART_H}px`, maxHeight: `${CHART_H}px` }}
        role="img"
        aria-label="Gráfico de comparação de taxa de envolvimento por escalão de seguidores"
      >
        {/* Grid lines */}
        {Array.from({ length: GRID_LINES }, (_, i) => {
          const frac = (i + 1) / (GRID_LINES + 1);
          const gy = padT + innerH * (1 - frac);
          return (
            <line
              key={i}
              x1={padL}
              x2={chartW - padR}
              y1={gy}
              y2={gy}
              stroke="#e2e8f0"
              strokeWidth={0.3}
            />
          );
        })}

        {/* Benchmark bars */}
        {benchmarkSeries.map((tier, i) => {
          const isActive = i === activeTierIndex;
          const cx = padL + barGap * i + barGap / 2;
          const w = isActive ? activeBarW : barW;
          const h = Math.max(2, (tier.engagementRatePct / scaleMax) * innerH);
          const y = padT + innerH - h;
          return (
            <g key={tier.tierLabel}>
              <rect
                x={cx - w / 2}
                y={y}
                width={w}
                height={h}
                rx={BAR_RADIUS}
                ry={BAR_RADIUS}
                fill={isActive ? "#2563D9" : "#CBD5E1"}
                opacity={isActive ? 1 : 0.4}
              />
              {/* X-axis label */}
              <text
                x={cx}
                y={CHART_H - 4}
                textAnchor="middle"
                className="fill-slate-400"
                style={{ fontSize: "3.2px", fontFamily: "var(--font-sans)", letterSpacing: "0.04em" }}
              >
                {tier.tierLabel}
              </text>
            </g>
          );
        })}

        {/* Reference dashed line */}
        <line
          x1={padL}
          x2={chartW - padR}
          y1={refY}
          y2={refY}
          stroke="#2563D9"
          strokeWidth={0.35}
          strokeDasharray="1.5 1"
          opacity={0.5}
        />

        {/* Reference label */}
        <text
          x={chartW - padR - 1}
          y={refY - 2.5}
          textAnchor="end"
          className="fill-blue-600"
          style={{ fontSize: "2.8px", fontFamily: "var(--font-sans)", letterSpacing: "0.02em" }}
        >
          ◈ Referência do escalão · {fmtRate(benchmarkVal)}
        </text>

        {/* Profile marker on active bar */}
        {(() => {
          const cx = padL + barGap * activeTierIndex + barGap / 2;
          const rawH = (profileVal / scaleMax) * innerH;
          const markerH = Math.max(MIN_PROFILE_PX, rawH);
          const markerY = padT + innerH - markerH;
          const markerW = activeBarW * 0.5;
          return (
            <g>
              <rect
                x={cx - markerW / 2}
                y={markerY}
                width={markerW}
                height={markerH}
                rx={2}
                ry={2}
                fill="#E11D48"
                opacity={0.85}
              />
              <text
                x={cx + markerW / 2 + 1.5}
                y={Math.min(markerY + 3, padT + innerH - 2)}
                textAnchor="start"
                className="fill-rose-600"
                style={{ fontSize: "2.8px", fontFamily: "var(--font-sans)", letterSpacing: "0.02em" }}
              >
                ⬡ O teu perfil · {fmtRate(profileVal)}
              </text>
            </g>
          );
        })()}

        {/* Competitor marker (future) */}
        {competitor ? (() => {
          const cx = padL + barGap * activeTierIndex + barGap / 2;
          const rawH = (competitor.engagementRatePct / scaleMax) * innerH;
          const cH = Math.max(MIN_PROFILE_PX, rawH);
          const cY = padT + innerH - cH;
          const cW = activeBarW * 0.35;
          return (
            <g>
              <rect
                x={cx + activeBarW / 2 - cW}
                y={cY}
                width={cW}
                height={cH}
                rx={2}
                ry={2}
                fill="#BA7517"
                opacity={0.8}
              />
              <text
                x={cx + activeBarW / 2 + 1}
                y={cY + 3}
                textAnchor="start"
                className="fill-amber-700"
                style={{ fontSize: "2.5px", fontFamily: "var(--font-sans)" }}
              >
                @{competitor.handle} · {fmtRate(competitor.engagementRatePct)}
              </text>
            </g>
          );
        })() : null}
      </svg>

      {/* Source references footer */}
      {sourceReferences.length > 0 ? (
        <p className="text-eyebrow-sm text-slate-400 leading-snug">
          <span className="text-slate-500">◈ Referências de mercado</span>
          <span className="mx-1 text-slate-300">·</span>
          {sourceReferences.map((ref, i) => (
            <span key={ref.name}>
              {i > 0 ? <span className="text-slate-300">, </span> : null}
              <a
                href={ref.url}
                target="_blank"
                rel="noreferrer noopener"
                className="text-slate-500 hover:text-slate-700 transition-colors"
                title={`Fonte: ${ref.name}`}
              >
                {ref.name}{" "}
                <span className="text-slate-400">[{i + 1}]</span>
              </a>
            </span>
          ))}
        </p>
      ) : null}

      {/* Pro competitor slot */}
      {showProSlot && !competitor ? (
        <button
          type="button"
          onClick={onProSlotClick}
          className={cn(
            "flex items-center gap-3 rounded-xl ring-1 ring-slate-200/70 px-4 py-3",
            "bg-slate-50/60 hover:bg-slate-100/80 transition-colors",
            "w-full text-left group",
            !onProSlotClick && "cursor-default",
          )}
        >
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 ring-1 ring-slate-200 shrink-0">
            <Lock className="size-3.5 text-slate-400" aria-hidden />
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[13px] font-medium text-slate-700">
                Comparar com concorrente direto
              </span>
              <span className="text-eyebrow-sm rounded-full px-1.5 py-0.5 ring-1 bg-amber-50 text-amber-700 ring-amber-200">
                PRO
              </span>
            </div>
            <p className="text-[11.5px] text-slate-500 mt-0.5">
              Adiciona um perfil concorrente para ver o teu resultado lado a lado.
            </p>
          </div>
        </button>
      ) : null}
    </div>
  );
}

// ─── Formatters ─────────────────────────────────────────────────────

function fmtRate(n: number): string {
  return `${n.toFixed(2).replace(".", ",")}%`;
}

function fmtPp(n: number): string {
  const abs = Math.abs(n);
  const s = abs.toFixed(1).replace(".", ",");
  return n < 0 ? `−${s}` : `+${s}`;
}