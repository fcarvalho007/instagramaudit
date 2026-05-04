import { useState, useRef, useCallback } from "react";

import { cn } from "@/lib/utils";
import type { BenchmarkTierPoint } from "@/lib/knowledge/benchmark-context";
import { PremiumCallout } from "./premium-callout";

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

const VB_W = 420;
const VB_H = 320;
const PAD_L = 44;
const PAD_R = 16;
const PAD_T = 28;
const PAD_B = 56;
const BAR_RADIUS = 6;
const GRID_LINES = 3;
const MARKER_R = 6;

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

  // Scale: max of all values + 20% headroom
  const allVals = benchmarkSeries.map((t) => t.engagementRatePct);
  if (profileVal > 0) allVals.push(profileVal);
  if (competitor?.engagementRatePct) allVals.push(competitor.engagementRatePct);
  const rawMax = Math.max(...allVals) * 1.2 || 1;
  const niceStep = rawMax <= 3 ? 0.5 : rawMax <= 8 ? 1 : rawMax <= 15 ? 2 : 5;
  const scaleMax = Math.ceil(rawMax / niceStep) * niceStep;

  // Gap for tooltip
  const gapPp = profileVal - benchmarkVal;

  // SVG layout
  const innerW = VB_W - PAD_L - PAD_R;
  const innerH = VB_H - PAD_T - PAD_B;
  const barGap = innerW / n;
  const barW = barGap * 0.42;
  const activeBarW = barGap * 0.5;

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
  const labelFlipRight = activeCx + MARKER_R + 5 + 60 > VB_W;

  // Tooltip position in percentage for CSS positioning
  function tooltipPctX(i: number): number {
    const cx = PAD_L + barGap * i + barGap / 2;
    return (cx / VB_W) * 100;
  }

  return (
    <div className="flex flex-col gap-4" ref={containerRef}>
      {/* Chart container with tooltip layer */}
      <div className="relative">
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className="w-full"
          role="img"
          aria-label="Gráfico de comparação de taxa de envolvimento por escalão de seguidores"
        >
          <defs>
            {/* Gradient for active bar */}
            <linearGradient id="activeBarGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#2563EB" />
            </linearGradient>
            {/* Gradient for inactive bars */}
            <linearGradient id="inactiveBarGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E2E8F0" />
              <stop offset="100%" stopColor="#CBD5E1" />
            </linearGradient>
            {/* Subtle glow for active bar */}
            <filter id="activeBarGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#3B82F6" floodOpacity="0.2" />
            </filter>
            {/* Profile marker glow */}
            <filter id="markerGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#E11D48" floodOpacity="0.35" />
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
                x={PAD_L - 8}
                y={gy + 3}
                textAnchor="end"
                fill="#94a3b8"
                style={{ fontSize: "9px", fontFamily: "var(--font-mono)" }}
              >
                {val % 1 === 0 ? `${val.toFixed(0)}%` : `${val.toFixed(1)}%`}
              </text>
            );
          })}

          {/* Grid lines — subtle */}
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
                opacity={i === 0 ? 0.6 : 0.35}
              />
            );
          })}

          {/* Reference dashed line at benchmark value */}
          <line
            x1={PAD_L}
            x2={VB_W - PAD_R}
            y1={refY}
            y2={refY}
            stroke="#3B82F6"
            strokeWidth={0.8}
            strokeDasharray="5 3"
            opacity={0.35}
          />
          {/* Reference line label — pill style */}
          <text
            x={PAD_L + 4}
            y={adjustedRefLabelY}
            textAnchor="start"
            fill="#3B82F6"
            opacity={0.6}
            style={{ fontSize: "7.5px", fontFamily: "var(--font-sans)", fontWeight: 500 }}
          >
            Ref. escalão {fmtRate(benchmarkVal)}
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
                {/* Hover hit area */}
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
                  fill={isActive ? "url(#activeBarGrad)" : "url(#inactiveBarGrad)"}
                  filter={isActive ? "url(#activeBarGlow)" : undefined}
                  opacity={
                    isActive
                      ? 1
                      : hovered !== null
                        ? isHovered ? 0.8 : 0.3
                        : 0.6
                  }
                  className="transition-all duration-200"
                />
                {/* Value label above bar */}
                <text
                  x={cx}
                  y={y - 8}
                  textAnchor="middle"
                  fill={isActive ? "#1D4ED8" : "#94a3b8"}
                  style={{
                    fontSize: isActive ? "10.5px" : "8.5px",
                    fontFamily: "var(--font-mono)",
                    fontWeight: isActive ? 700 : 400,
                  }}
                >
                  {fmtRate(tier.engagementRatePct)}
                </text>
                {/* X-axis label */}
                <text
                  x={cx}
                  y={VB_H - 14}
                  textAnchor="middle"
                  fill={isActive ? "#1E293B" : "#94a3b8"}
                  style={{
                    fontSize: isActive ? "10.5px" : "9px",
                    fontFamily: "var(--font-sans)",
                    fontWeight: isActive ? 700 : 400,
                    letterSpacing: "0.02em",
                  }}
                >
                  {tier.tierLabel}
                </text>
                {/* Active tier underline accent */}
                {isActive ? (
                  <rect
                    x={cx - 14}
                    y={VB_H - 9}
                    width={28}
                    height={2}
                    rx={1}
                    fill="#3B82F6"
                    opacity={0.5}
                  />
                ) : null}
              </g>
            );
          })}

          {/* Profile marker — prominent with glow */}
          {(() => {
            const cx = activeCx;
            const my = profileMarkerY;
            const labelAnchor = labelFlipRight ? "end" : "start";
            const labelX = labelFlipRight ? cx - MARKER_R - 6 : cx + MARKER_R + 6;
            return (
              <g>
                {/* Horizontal indicator line */}
                <line
                  x1={PAD_L}
                  x2={cx - MARKER_R - 4}
                  y1={my}
                  y2={my}
                  stroke="#E11D48"
                  strokeWidth={0.8}
                  strokeDasharray="3 3"
                  opacity={0.4}
                />
                {/* Marker outer ring */}
                <circle
                  cx={cx}
                  cy={my}
                  r={MARKER_R + 2}
                  fill="none"
                  stroke="#E11D48"
                  strokeWidth={1}
                  opacity={0.15}
                />
                {/* Marker circle with glow */}
                <circle
                  cx={cx}
                  cy={my}
                  r={MARKER_R}
                  fill="#E11D48"
                  stroke="#fff"
                  strokeWidth={2}
                  filter="url(#markerGlow)"
                />
                {/* Profile value label */}
                <text
                  x={labelX}
                  y={my + 4}
                  textAnchor={labelAnchor}
                  fill="#E11D48"
                  style={{ fontSize: "11px", fontFamily: "var(--font-mono)", fontWeight: 700 }}
                >
                  {fmtRate(profileVal)}
                </text>
                {/* "Este perfil" label */}
                <text
                  x={labelX}
                  y={my - 8}
                  textAnchor={labelAnchor}
                  fill="#E11D48"
                  opacity={0.6}
                  style={{ fontSize: "8px", fontFamily: "var(--font-sans)", fontWeight: 600 }}
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
                  r={4.5}
                  fill="#BA7517"
                  stroke="#fff"
                  strokeWidth={1.5}
                />
                <text
                  x={cx - MARKER_R - 5}
                  y={cy + 3}
                  textAnchor="end"
                  fill="#BA7517"
                  style={{ fontSize: "9px", fontFamily: "var(--font-mono)", fontWeight: 600 }}
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

      {/* Legend — cleaner horizontal layout */}
      <div className="flex items-center gap-5 flex-wrap text-[11px]">
        <span className="inline-flex items-center gap-2">
          <span className="size-2.5 rounded-[3px] bg-gradient-to-b from-blue-400 to-blue-600" aria-hidden />
          <span className="text-content-secondary font-medium">Referência do escalão</span>
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-rose-500" aria-hidden />
          <span className="text-content-secondary font-medium">Este perfil</span>
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="size-2.5 rounded-[3px] bg-surface-muted" aria-hidden />
          <span className="text-content-tertiary">Outros escalões</span>
        </span>
      </div>

      {/* Source references */}
      {sourceReferences.length > 0 ? (
        <div className="space-y-0.5 pt-1 border-t border-border-subtle">
          <p className="text-eyebrow-sm text-content-tertiary leading-snug">
            <span className="text-content-secondary">Referências de mercado</span>{" "}
            {sourceReferences.map((ref, i) => (
              <span key={ref.url}>
                <a
                  href={ref.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-content-secondary hover:text-accent-primary hover:underline transition-colors"
                  aria-label={`Fonte ${i + 1}: ${ref.name}`}
                >
                  [{i + 1}]
                </a>
                {i < sourceReferences.length - 1 ? " " : null}
              </span>
            ))}
          </p>
          <p className="text-[10px] text-content-tertiary leading-snug">
            {sourceReferences.map((ref, i) => (
              <span key={ref.url}>
                {i > 0 ? <span className="text-content-tertiary mx-1">·</span> : null}
                <span>[{i + 1}] {SOURCE_DESCRIPTOR[ref.name as keyof typeof SOURCE_DESCRIPTOR] ?? ref.name}</span>
              </span>
            ))}
          </p>
        </div>
      ) : null}

      {/* Pro competitor slot */}
      {showProSlot && !competitor ? (
        <PremiumCallout
          title="Comparar com concorrente direto"
          description="Vê se o teu perfil está abaixo do mercado ou apenas abaixo dos teus concorrentes."
        />
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
  const clampedPct = Math.max(28, Math.min(72, pctX));

  return (
    <div
      className="absolute top-0 z-10 pointer-events-none"
      style={{ left: `${clampedPct}%`, transform: "translateX(-50%)" }}
    >
      <div
        className={cn(
          "rounded-xl shadow-lg ring-1 px-3.5 py-3 text-[11.5px] leading-relaxed",
          "bg-surface-secondary/95 backdrop-blur-sm ring-slate-200/80 max-w-[200px] sm:max-w-[220px]",
        )}
      >
        <p className="font-semibold text-content-primary mb-1.5">Escalão {tier.tierLabel}</p>
        <p className="text-content-secondary">
          Referência: <span className="font-mono tabular-nums font-medium">{fmtRate(tier.engagementRatePct)}</span>
        </p>

        {isActive ? (
          <>
            <div className="border-t border-border-subtle my-2" />
            <p className="text-content-primary">
              Este perfil: <span className="font-mono tabular-nums text-signal-danger font-semibold">{fmtRate(profileVal)}</span>
            </p>
            <p className="text-content-secondary">
              Gap: <span className={cn("font-mono tabular-nums font-medium", gapPp >= 0 ? "text-signal-success" : "text-signal-danger")}>{fmtPp(gapPp)} p.p.</span>
            </p>
            {competitor ? (
              <p className="text-content-secondary mt-1.5">
                @{competitor.handle}: <span className="font-mono tabular-nums">{fmtRate(competitor.engagementRatePct)}</span>
              </p>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}

// ─── Formatters ─────────────────────────────────────────────────────

const SOURCE_DESCRIPTOR: Record<string, string> = {
  Socialinsider: "Envolvimento por formato",
  Buffer: "Referência por dimensão da conta",
  Hootsuite: "Contexto de mercado",
};

function fmtRate(n: number): string {
  return `${n.toFixed(2).replace(".", ",")}%`;
}

function fmtPp(n: number): string {
  const abs = Math.abs(n);
  const s = abs.toFixed(1).replace(".", ",");
  return n < 0 ? `−${s}` : `+${s}`;
}
