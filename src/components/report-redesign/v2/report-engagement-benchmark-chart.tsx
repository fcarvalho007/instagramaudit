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

const VB_W = 400;
const VB_H = 260;
const PAD_L = 40;
const PAD_R = 12;
const PAD_T = 28;
const PAD_B = 36;
const BAR_RADIUS = 6;
const GRID_LINES = 5;

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
  const innerW = VB_W - PAD_L - PAD_R;
  const innerH = VB_H - PAD_T - PAD_B;
  const barGap = innerW / n;
  const barW = barGap * 0.52;
  const activeBarW = barGap * 0.68;

  function yForVal(v: number): number {
    return PAD_T + innerH - (v / scaleMax) * innerH;
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
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="w-full"
        style={{ maxHeight: "300px" }}
        role="img"
        aria-label="Gráfico de comparação de taxa de envolvimento por escalão de seguidores"
      >
        {/* Y-axis labels */}
        {Array.from({ length: GRID_LINES + 1 }, (_, i) => {
          const frac = i / GRID_LINES;
          const val = scaleMax * frac;
          const gy = PAD_T + innerH * (1 - frac);
          return (
            <text
              key={`y-${i}`}
              x={PAD_L - 6}
              y={gy + 3}
              textAnchor="end"
              fill="#94a3b8"
              style={{ fontSize: "9px", fontFamily: "var(--font-mono)" }}
            >
              {val.toFixed(1)}%
            </text>
          );
        })}

        {/* Grid lines */}
        {Array.from({ length: GRID_LINES + 1 }, (_, i) => {
          const frac = i / GRID_LINES;
          const gy = PAD_T + innerH * (1 - frac);
          return (
            <line
              key={i}
              x1={PAD_L}
              x2={VB_W - PAD_R}
              y1={gy}
              y2={gy}
              stroke="#e2e8f0"
              strokeWidth={0.5}
            />
          );
        })}

        {/* Benchmark bars */}
        {benchmarkSeries.map((tier, i) => {
          const isActive = i === activeTierIndex;
          const cx = PAD_L + barGap * i + barGap / 2;
          const w = isActive ? activeBarW : barW;
          const h = Math.max(4, (tier.engagementRatePct / scaleMax) * innerH);
          const y = PAD_T + innerH - h;
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
                opacity={isActive ? 1 : 0.6}
              />
              {/* Value label above bar */}
              <text
                x={cx}
                y={y - 5}
                textAnchor="middle"
                fill={isActive ? "#2563D9" : "#94a3b8"}
                style={{
                  fontSize: isActive ? "10px" : "8.5px",
                  fontFamily: "var(--font-mono)",
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {fmtRate(tier.engagementRatePct)}
              </text>
              {/* X-axis label */}
              <text
                x={cx}
                y={VB_H - 8}
                textAnchor="middle"
                fill={isActive ? "#334155" : "#94a3b8"}
                style={{
                  fontSize: isActive ? "10px" : "9px",
                  fontFamily: "var(--font-sans)",
                  fontWeight: isActive ? 600 : 400,
                  letterSpacing: "0.03em",
                }}
              >
                {tier.tierLabel}
              </text>
            </g>
          );
        })}

        {/* Reference dashed line */}
        <line
          x1={PAD_L}
          x2={VB_W - PAD_R}
          y1={refY}
          y2={refY}
          stroke="#2563D9"
          strokeWidth={0.7}
          strokeDasharray="4 3"
          opacity={0.45}
        />

        {/* Profile marker on active bar */}
        {(() => {
          const cx = PAD_L + barGap * activeTierIndex + barGap / 2;
          const markerH = Math.max(6, (profileVal / scaleMax) * innerH);
          const markerY = PAD_T + innerH - markerH;
          const markerW = activeBarW * 0.38;
          // Position profile bar slightly to the right of center
          const mx = cx + activeBarW * 0.18;
          return (
            <g>
              <rect
                x={mx - markerW / 2}
                y={markerY}
                width={markerW}
                height={markerH}
                rx={BAR_RADIUS - 2}
                ry={BAR_RADIUS - 2}
                fill="#E11D48"
                opacity={0.85}
              />
              {/* Profile value label */}
              <text
                x={mx}
                y={markerY - 5}
                textAnchor="middle"
                fill="#E11D48"
                style={{ fontSize: "9px", fontFamily: "var(--font-mono)", fontWeight: 600 }}
              >
                {fmtRate(profileVal)}
              </text>
            </g>
          );
        })()}

        {/* Competitor marker (future) */}
        {competitor ? (() => {
          const cx = PAD_L + barGap * activeTierIndex + barGap / 2;
          const cH = Math.max(6, (competitor.engagementRatePct / scaleMax) * innerH);
          const cY = PAD_T + innerH - cH;
          const cW = activeBarW * 0.3;
          const cmx = cx - activeBarW * 0.18;
          return (
            <g>
              <rect
                x={cmx - cW / 2}
                y={cY}
                width={cW}
                height={cH}
                rx={BAR_RADIUS - 2}
                ry={BAR_RADIUS - 2}
                fill="#BA7517"
                opacity={0.8}
              />
              <text
                x={cmx}
                y={cY - 5}
                textAnchor="middle"
                fill="#BA7517"
                style={{ fontSize: "8px", fontFamily: "var(--font-mono)", fontWeight: 600 }}
              >
                {fmtRate(competitor.engagementRatePct)}
              </text>
            </g>
          );
        })() : null}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap text-[11.5px]">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-[#2563D9]" aria-hidden />
          <span className="text-slate-600">Referência do escalão</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-[#E11D48] opacity-85" aria-hidden />
          <span className="text-slate-600">O teu perfil</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-[#CBD5E1]" aria-hidden />
          <span className="text-slate-500">Outros escalões</span>
        </span>
      </div>

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
                className="text-slate-500 hover:text-blue-600 hover:underline transition-colors"
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