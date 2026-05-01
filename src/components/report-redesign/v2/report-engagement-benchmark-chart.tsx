import { useState, useRef, useCallback } from "react";
import { Lock } from "lucide-react";

import { cn } from "@/lib/utils";
import type { BenchmarkTierPoint } from "@/lib/knowledge/benchmark-context";

export interface BenchmarkChartProps {
  profileEngagementRatePct: number;
  followersCount: number;
  benchmarkSeries: readonly BenchmarkTierPoint[];
  activeTierIndex: number;
  sourceReferences: ReadonlyArray<{ name: string; url: string }>;
  /** Active tier label for the context line (e.g. "5–10K"). */
  activeTierLabel?: string;
  showProSlot?: boolean;
  competitor?: { handle: string; engagementRatePct: number } | null;
  onProSlotClick?: () => void;
}

// ─── Constants ──────────────────────────────────────────────────────

const VB_W = 400;
const VB_H = 340;
const PAD_L = 42;
const PAD_R = 14;
const PAD_T = 32;
const PAD_B = 46;
const BAR_RADIUS = 5;
const GRID_LINES = 5;
const MARKER_R = 5;

// Dynamic label offset when reference line and profile marker collide
const LABEL_COLLISION_THRESHOLD = 18;

// ─── Main component ────────────────────────────────────────────────

export function ReportEngagementBenchmarkChart({
  profileEngagementRatePct,
  benchmarkSeries,
  activeTierIndex,
  sourceReferences,
  activeTierLabel,
  showProSlot = false,
  competitor,
  onProSlotClick,
}: BenchmarkChartProps) {
  const n = benchmarkSeries.length;
  const containerRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<number | null>(null);

  const handleBarEnter = useCallback((i: number) => setHovered(i), []);
  const handleBarLeave = useCallback(() => setHovered(null), []);

  if (n === 0) return null;

  const activeTier = benchmarkSeries[activeTierIndex];
  const benchmarkVal = activeTier?.engagementRatePct ?? 0;
  const profileVal = profileEngagementRatePct;

  // Scale: max of all values + 25% headroom
  const allVals = benchmarkSeries.map((t) => t.engagementRatePct);
  if (profileVal > 0) allVals.push(profileVal);
  if (competitor?.engagementRatePct) allVals.push(competitor.engagementRatePct);
  const scaleMax = Math.max(...allVals) * 1.25 || 1;

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
  const barW = barGap * 0.48;
  const activeBarW = barGap * 0.62;

  function yForVal(v: number): number {
    return PAD_T + innerH - (v / scaleMax) * innerH;
  }

  const refY = yForVal(benchmarkVal);
  const profileMarkerY = Math.max(
    PAD_T + MARKER_R,
    Math.min(yForVal(profileVal), PAD_T + innerH - MARKER_R - 2),
  );

  // Detect collision between reference label and profile marker label
  const refLabelY = refY - 5;
  const profileLabelY = profileMarkerY - 7;
  const labelsCollide = Math.abs(refLabelY - profileLabelY) < LABEL_COLLISION_THRESHOLD;
  const adjustedRefLabelY = labelsCollide ? Math.min(refY - 18, profileLabelY - 14) : refLabelY;

  // Right-edge guard for profile marker labels
  const activeCx = PAD_L + barGap * activeTierIndex + barGap / 2;
  const labelFlipRight = activeCx + MARKER_R + 5 + 60 > VB_W; // 60 ≈ approx label width

  // Tooltip position in percentage for CSS positioning
  function tooltipPctX(i: number): number {
    const cx = PAD_L + barGap * i + barGap / 2;
    return (cx / VB_W) * 100;
  }

  return (
    <div className="flex flex-col gap-5" ref={containerRef}>
      {/* Gap pill */}
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

      {/* Chart container with tooltip layer */}
      <div className="relative">
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className="w-full"
          role="img"
          aria-label="Gráfico de comparação de taxa de envolvimento por escalão de seguidores"
        >
          {/* SVG filter for active bar glow */}
          <defs>
            <filter id="activeBarGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="1" stdDeviation="3" floodColor="#2563D9" floodOpacity="0.25" />
            </filter>
          </defs>

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
                strokeWidth={0.35}
                opacity={0.7}
              />
            );
          })}

          {/* Reference dashed line at benchmark value */}
          <line
            x1={PAD_L}
            x2={VB_W - PAD_R}
            y1={refY}
            y2={refY}
            stroke="#2563D9"
            strokeWidth={0.7}
            strokeDasharray="4 3"
            opacity={0.4}
          />
          {/* Reference line label */}
          <text
            x={PAD_L + 4}
            y={adjustedRefLabelY}
            textAnchor="start"
            fill="#2563D9"
            opacity={0.55}
            style={{ fontSize: "7.5px", fontFamily: "var(--font-sans)" }}
          >
            Referência do escalão
          </text>

          {/* Benchmark bars */}
          {benchmarkSeries.map((tier, i) => {
            const isActive = i === activeTierIndex;
            const isHovered = hovered === i;
            const cx = PAD_L + barGap * i + barGap / 2;
            const w = isActive ? activeBarW : barW;
            const h = Math.max(4, (tier.engagementRatePct / scaleMax) * innerH);
            const y = PAD_T + innerH - h;
            return (
              <g
                key={tier.tierLabel}
                tabIndex={0}
                role="button"
                aria-label={`Escalão ${tier.tierLabel}: referência de mercado ${fmtRate(tier.engagementRatePct)}${isActive ? `, este perfil ${fmtRate(profileVal)}` : ""}`}
                onMouseEnter={() => handleBarEnter(i)}
                onMouseLeave={handleBarLeave}
                onFocus={() => handleBarEnter(i)}
                onBlur={handleBarLeave}
                style={{ outline: "none", cursor: "default" }}
              >
                {/* Hover hit area (invisible wider rect) */}
                <rect
                  x={cx - barGap / 2}
                  y={PAD_T}
                  width={barGap}
                  height={innerH + PAD_B}
                  fill="transparent"
                />
                {/* Bar */}
                <rect
                  x={cx - w / 2}
                  y={y}
                  width={w}
                  height={h}
                  rx={BAR_RADIUS}
                  ry={BAR_RADIUS}
                  fill={isActive ? "#2563D9" : "#CBD5E1"}
                  filter={isActive ? "url(#activeBarGlow)" : undefined}
                  opacity={
                    isActive
                      ? 1
                      : hovered !== null
                        ? isHovered ? 0.75 : 0.3
                        : 0.55
                  }
                  className="transition-all duration-200"
                />
                {/* Value label above bar */}
                <text
                  x={cx}
                  y={y - 7}
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
                  y={VB_H - 10}
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

          {/* Profile marker — prominent pill on active tier */}
          {(() => {
            const cx = activeCx;
            const my = profileMarkerY;
            const labelAnchor = labelFlipRight ? "end" : "start";
            const labelX = labelFlipRight ? cx - MARKER_R - 5 : cx + MARKER_R + 5;
            return (
              <g>
                {/* Horizontal indicator line from left edge to marker */}
                <line
                  x1={PAD_L}
                  x2={cx - MARKER_R - 3}
                  y1={my}
                  y2={my}
                  stroke="#E11D48"
                  strokeWidth={0.7}
                  strokeDasharray="3 2"
                  opacity={0.5}
                />
                {/* Marker circle */}
                <circle
                  cx={cx}
                  cy={my}
                  r={MARKER_R}
                  fill="#E11D48"
                  stroke="#fff"
                  strokeWidth={1.5}
                />
                {/* Profile value label */}
                <text
                  x={labelX}
                  y={my + 3.5}
                  textAnchor={labelAnchor}
                  fill="#E11D48"
                  style={{ fontSize: "10px", fontFamily: "var(--font-mono)", fontWeight: 700 }}
                >
                  {fmtRate(profileVal)}
                </text>
                {/* "Este perfil" label */}
                <text
                  x={labelX}
                  y={my - 7}
                  textAnchor={labelAnchor}
                  fill="#E11D48"
                  opacity={0.7}
                  style={{ fontSize: "7.5px", fontFamily: "var(--font-sans)", fontWeight: 500 }}
                >
                  Este perfil
                </text>
              </g>
            );
          })()}

          {/* Competitor marker */}
          {competitor ? (() => {
            const cx = PAD_L + barGap * activeTierIndex + barGap / 2;
            const cy = Math.max(
              PAD_T + 4,
              Math.min(yForVal(competitor.engagementRatePct), PAD_T + innerH - 4 - 2),
            );
            return (
              <g>
                <circle
                  cx={cx}
                  cy={cy}
                  r={4}
                  fill="#BA7517"
                  stroke="#fff"
                  strokeWidth={1.2}
                />
                <text
                  x={cx - MARKER_R - 5}
                  y={cy + 3}
                  textAnchor="end"
                  fill="#BA7517"
                  style={{ fontSize: "8.5px", fontFamily: "var(--font-mono)", fontWeight: 600 }}
                >
                  {fmtRate(competitor.engagementRatePct)}
                </text>
              </g>
            );
          })() : null}
        </svg>

        {/* Tooltip (HTML overlay) */}
        {hovered !== null ? (
          <ChartTooltip
            tierIndex={hovered}
            benchmarkSeries={benchmarkSeries}
            activeTierIndex={activeTierIndex}
            profileVal={profileVal}
            gapPp={gapPp}
            competitor={competitor}
            pctX={tooltipPctX(hovered)}
          />
        ) : null}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap text-[11.5px]">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-[#2563D9]" aria-hidden />
          <span className="text-slate-600">Referência do escalão</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-[#E11D48]" aria-hidden />
          <span className="text-slate-600">Este perfil</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-[#CBD5E1]" aria-hidden />
          <span className="text-slate-500">Outros escalões</span>
        </span>
      </div>

      {/* Source references — numeric only, no brand names */}
      {sourceReferences.length > 0 ? (
        <p className="text-eyebrow-sm text-slate-400 leading-snug">
          <span className="text-slate-500">Referências de mercado:</span>{" "}
          {sourceReferences.map((ref, i) => (
            <span key={ref.url}>
              {i > 0 ? <span className="text-slate-300 mx-0.5">·</span> : null}
              <a
                href={ref.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-500 hover:text-blue-600 hover:underline transition-colors"
                aria-label={`Fonte ${i + 1}: ${ref.name}`}
              >
                [{i + 1}]
              </a>
            </span>
          ))}
        </p>
      ) : null}

      {/* Source context line */}
      <p className="text-[10px] text-slate-400 opacity-50 leading-snug">
        ◈ MERCADO · Instagram
        {activeTierLabel ? ` · contas ${activeTierLabel}` : ""}
        {" "}· referência por dimensão e formato
      </p>

      {/* Pro competitor slot — quiet */}
      {showProSlot && !competitor ? (
        <button
          type="button"
          onClick={onProSlotClick}
          className={cn(
            "flex items-center gap-2.5 rounded-lg ring-1 ring-slate-200/50 px-3 py-2.5",
            "bg-slate-50/40 w-full text-left",
            !onProSlotClick && "cursor-default opacity-70",
          )}
        >
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 ring-1 ring-slate-200/60 shrink-0">
            <Lock className="size-3 text-slate-400" aria-hidden />
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[12px] font-medium text-slate-600">
                Comparar com concorrente direto
              </span>
              <span className="text-eyebrow-sm rounded-full px-1.5 py-0.5 ring-1 bg-amber-50 text-amber-700 ring-amber-200 text-[10px]">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Adiciona um perfil concorrente para ver o resultado lado a lado.
            </p>
          </div>
        </button>
      ) : null}
    </div>
  );
}

// ─── Tooltip ────────────────────────────────────────────────────────

function ChartTooltip({
  tierIndex,
  benchmarkSeries,
  activeTierIndex,
  profileVal,
  gapPp,
  competitor,
  pctX,
}: {
  tierIndex: number;
  benchmarkSeries: readonly BenchmarkTierPoint[];
  activeTierIndex: number;
  profileVal: number;
  gapPp: number;
  competitor?: { handle: string; engagementRatePct: number } | null;
  pctX: number;
}) {
  const tier = benchmarkSeries[tierIndex];
  if (!tier) return null;

  const isActive = tierIndex === activeTierIndex;
  // Clamp tooltip position to avoid overflow
  const clampedPct = Math.max(28, Math.min(72, pctX));

  return (
    <div
      className="absolute top-0 z-10 pointer-events-none"
      style={{ left: `${clampedPct}%`, transform: "translateX(-50%)" }}
    >
      <div
        className={cn(
          "rounded-lg shadow-lg ring-1 px-3 py-2.5 text-[11.5px] leading-relaxed",
          "bg-white ring-slate-200/80 max-w-[180px] sm:max-w-[220px]",
        )}
      >
        <p className="font-medium text-slate-800 mb-1">Escalão: {tier.tierLabel}</p>
        <p className="text-slate-600">
          Referência: <span className="font-mono tabular-nums">{fmtRate(tier.engagementRatePct)}</span>
        </p>

        {isActive ? (
          <>
            <div className="border-t border-slate-100 my-1.5" />
            <p className="text-slate-700">
              Este perfil: <span className="font-mono tabular-nums text-[#E11D48] font-semibold">{fmtRate(profileVal)}</span>
            </p>
            <p className="text-slate-600">
              Gap: <span className="font-mono tabular-nums">{fmtPp(gapPp)} p.p.</span>
            </p>
            {competitor ? (
              <p className="text-slate-500 mt-1">
                @{competitor.handle}: <span className="font-mono tabular-nums">{fmtRate(competitor.engagementRatePct)}</span>
              </p>
            ) : null}
            <p className="text-slate-400 text-[10px] mt-1.5 italic">
              Este é o teu escalão. A referência é {fmtRate(tier.engagementRatePct)}; o perfil está em {fmtRate(profileVal)}.
            </p>
          </>
        ) : (
          <p className="text-slate-400 text-[10px] mt-1 italic">
            Referência de mercado para contas {tier.tierLabel}.
          </p>
        )}
      </div>
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