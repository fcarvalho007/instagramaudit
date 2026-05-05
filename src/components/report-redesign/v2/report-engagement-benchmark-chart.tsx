/**
 * Horizontal benchmark comparison chart — tier rows with profile overlay.
 *
 * Active row decorative colours (local to this component):
 *   Below benchmark (danger):
 *     border: rgba(163,45,45,0.35)  bg: rgba(163,45,45,0.05)
 *     hatch:  rgba(163,45,45,0.08)  bar: rgba(163,45,45,0.75)
 *     pill:   rgba(163,45,45,0.12)  text: signal-danger token
 *   Above benchmark (success):
 *     border: rgba(29,158,117,0.35)  bg: rgba(29,158,117,0.05)
 *     hatch:  rgba(29,158,117,0.08)  bar: rgba(29,158,117,0.75)
 *     pill:   rgba(29,158,117,0.12)  text: signal-success token
 */
import { cn } from "@/lib/utils";
import type { BenchmarkTierPoint } from "@/lib/knowledge/benchmark-context";
import { PremiumCallout } from "./premium-callout";

export interface BenchmarkChartProps {
  profileEngagementRatePct: number;
  followersCount: number;
  benchmarkSeries: readonly BenchmarkTierPoint[];
  activeTierIndex: number;
  sourceReferences: ReadonlyArray<{ name: string; url: string }>;
  activeTierLabel?: string;
  showProSlot?: boolean;
  competitor?: { handle: string; engagementRatePct: number } | null;
  onProSlotClick?: () => void;
}

// ─── Tier sub-labels ────────────────────────────────────────────────

const TIER_SUBLABELS: Record<string, string> = {
  "1K–5K": "NANO",
  "5K–20K": "MICRO",
  "20K–100K": "MID",
  "100K–1M": "MACRO",
  "+1M": "MEGA",
};

// ─── Main component ────────────────────────────────────────────────

export function ReportEngagementBenchmarkChart({
  profileEngagementRatePct,
  benchmarkSeries,
  activeTierIndex,
  sourceReferences,
  showProSlot = false,
  competitor,
}: BenchmarkChartProps) {
  const n = benchmarkSeries.length;
  if (n === 0) return null;

  const activeTier = benchmarkSeries[activeTierIndex];
  const benchmarkVal = activeTier?.engagementRatePct ?? 0;
  const profileVal = profileEngagementRatePct;
  const isPositive = profileVal >= benchmarkVal;

  // Dynamic axis: max of all values + headroom, rounded to nice step
  const allVals = benchmarkSeries.map((t) => t.engagementRatePct);
  if (profileVal > 0) allVals.push(profileVal);
  if (competitor?.engagementRatePct) allVals.push(competitor.engagementRatePct);
  const rawMax = Math.max(...allVals) * 1.15 || 1;
  const niceStep = rawMax <= 3 ? 0.5 : rawMax <= 8 ? 1 : rawMax <= 15 ? 2 : 5;
  const scaleMax = Math.ceil(rawMax / niceStep) * niceStep;

  const pct = (v: number) => Math.min((v / scaleMax) * 100, 100);
  const benchmarkPct = pct(benchmarkVal);

  // X-axis ticks
  const axisSteps: number[] = [];
  for (let v = 0; v <= scaleMax; v += niceStep) {
    axisSteps.push(v);
  }

  // Colour helpers for active row
  const dangerBorder = "rgba(163,45,45,0.35)";
  const dangerBg = "rgba(163,45,45,0.05)";
  const dangerHatch = "rgba(163,45,45,0.08)";
  const dangerBar = "rgba(163,45,45,0.75)";
  const dangerPill = "rgba(163,45,45,0.12)";
  const successBorder = "rgba(29,158,117,0.35)";
  const successBg = "rgba(29,158,117,0.05)";
  const successHatch = "rgba(29,158,117,0.08)";
  const successBar = "rgba(29,158,117,0.75)";
  const successPill = "rgba(29,158,117,0.12)";

  return (
    <div className="flex flex-col gap-4">
      {/* Chart header */}
      <div className="flex items-baseline justify-between flex-wrap gap-1">
        <span className="text-eyebrow-sm text-content-secondary">
          Comparação por escalão de seguidores
        </span>
      </div>

      {/* Tier rows */}
      <div
        className="relative flex flex-col gap-2"
        role="list"
        aria-label="Comparação de taxa de engagement por escalão"
      >
        {/* Full-height benchmark reference line + label */}
        {benchmarkVal > 0 && (
          <>
            {/* Label above bars */}
            <div className="relative h-5 ml-[calc(12px+70px+12px)] sm:ml-[calc(16px+110px+16px)] mr-[calc(12px+48px+12px)] sm:mr-[calc(16px+48px+16px)]">
              <span
                className="absolute bottom-0 text-[10px] text-content-secondary font-medium whitespace-nowrap -translate-x-1/2 bg-surface-secondary px-1 rounded"
                style={{ left: `max(${benchmarkPct}%, 28px)` }}
              >
                benchmark {fmtRate(benchmarkVal)}
              </span>
            </div>
            {/* Full-height vertical dashed line */}
            <div
              className="absolute inset-0 top-[20px] ml-[calc(12px+70px+12px)] sm:ml-[calc(16px+110px+16px)] mr-[calc(12px+48px+12px)] sm:mr-[calc(16px+48px+16px)] pointer-events-none z-10"
              aria-hidden="true"
            >
              <div
                className="absolute top-0 bottom-0 w-px border-l border-dashed border-content-secondary/25"
                style={{ left: `${benchmarkPct}%` }}
              />
            </div>
          </>
        )}

        {benchmarkSeries.map((tier, i) => {
          const isActive = i === activeTierIndex;
          const tierPct = pct(tier.engagementRatePct);
          const profilePctVal = pct(profileVal);
          const sub = TIER_SUBLABELS[tier.tierLabel] ?? "";

          if (isActive) {
            // Enforce minimum visible width for very low profile values
            const profileBarPct = profileVal > 0 ? Math.max(profilePctVal, 1.5) : 0;
            const targetZonePct = Math.max(tierPct, 1);

            return (
              <div
                key={tier.tierLabel}
                role="listitem"
                aria-label={`Escalão ${tier.tierLabel}: referência ${fmtRate(tier.engagementRatePct)}, este perfil ${fmtRate(profileVal)}`}
                className="relative rounded-xl px-3 py-3 sm:px-4 sm:py-4"
                style={{
                  border: `2px solid ${isPositive ? successBorder : dangerBorder}`,
                  background: isPositive ? successBg : dangerBg,
                }}
              >
                {/* Badge: ESTÁS AQUI */}
                <span
                  className="absolute -top-2.5 left-3 sm:left-4 text-[9px] font-bold tracking-[0.08em] bg-surface-secondary rounded px-1.5 py-0.5 uppercase"
                  style={{
                    color: isPositive ? "rgb(29,158,117)" : "rgb(163,45,45)",
                    border: `1px solid ${isPositive ? successBorder : dangerBorder}`,
                  }}
                >
                  Estás aqui
                </span>

                <div className="flex items-center gap-3 sm:gap-4 mt-1">
                  {/* Label */}
                  <div className="flex items-baseline gap-1.5 min-w-[70px] sm:min-w-[110px] shrink-0">
                    <span className="text-[11px] tabular-nums text-content-secondary font-medium">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="flex flex-col leading-tight">
                      <span className="text-[13px] font-semibold text-content-primary">
                        {tier.tierLabel}
                      </span>
                      {sub && (
                        <span className="text-[10px] text-content-secondary font-semibold tracking-[0.06em]">
                          {sub} · TEU TIER
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bar area */}
                  <div className="relative flex-1 h-8 sm:h-9">
                    {/* Base track */}
                    <div className="absolute inset-y-0 left-0 right-0 rounded-md bg-content-secondary/5" />

                    {/* Target/reference zone — hatched area from 0 to benchmark */}
                    <div
                      className="absolute inset-y-0 left-0 rounded-md"
                      style={{
                        width: `${targetZonePct}%`,
                        background: `repeating-linear-gradient(
                          -45deg,
                          ${isPositive ? successHatch : dangerHatch},
                          ${isPositive ? successHatch : dangerHatch} 2px,
                          transparent 2px,
                          transparent 6px
                        )`,
                      }}
                    />

                    {/* Real profile bar — thin solid bar */}
                    {profileVal > 0 && (
                      <div
                        className="absolute left-0 rounded-md"
                        style={{
                          width: `${profileBarPct}%`,
                          top: "20%",
                          bottom: "20%",
                          background: isPositive ? successBar : dangerBar,
                          minWidth: "4px",
                        }}
                      />
                    )}

                    {/* Floating pill label above profile marker */}
                    {profileVal > 0 && (
                      <span
                        className="absolute -top-1 text-[10px] font-bold tabular-nums whitespace-nowrap rounded-full px-1.5 py-px z-20"
                        style={{
                          left: `${Math.max(profileBarPct, 2)}%`,
                          transform: "translateX(-50%) translateY(-100%)",
                          background: isPositive ? successPill : dangerPill,
                          color: isPositive ? "rgb(29,158,117)" : "rgb(163,45,45)",
                        }}
                      >
                        {fmtRate(profileVal)}
                      </span>
                    )}
                  </div>

                  {/* Value — benchmark of this tier */}
                  <span className="text-[13px] tabular-nums font-semibold shrink-0 min-w-[48px] text-right text-content-primary">
                    {fmtRate(tier.engagementRatePct)}
                  </span>
                </div>
              </div>
            );
          }

          // ── Inactive tier row ──────────────────────────────────
          return (
            <div
              key={tier.tierLabel}
              role="listitem"
              aria-label={`Escalão ${tier.tierLabel}: referência ${fmtRate(tier.engagementRatePct)}`}
              className="relative rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 border border-transparent"
            >
              <div className="flex items-center gap-3 sm:gap-4">
                {/* Label */}
                <div className="flex items-baseline gap-1.5 min-w-[70px] sm:min-w-[110px] shrink-0">
                  <span className="text-[11px] tabular-nums text-content-secondary/50 font-medium">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="flex flex-col leading-tight">
                    <span className="text-[13px] font-semibold text-content-secondary">
                      {tier.tierLabel}
                    </span>
                    {sub && (
                      <span className="text-[10px] text-content-secondary/50 font-semibold tracking-[0.06em]">
                        {sub}
                      </span>
                    )}
                  </div>
                </div>

                {/* Bar area */}
                <div className="relative flex-1 h-6 sm:h-7">
                  <div
                    className="absolute inset-y-0 left-0 rounded-md bg-content-secondary/8"
                    style={{ width: `${Math.max(tierPct, 1)}%` }}
                  />
                </div>

                {/* Value */}
                <span className="text-[13px] tabular-nums font-semibold shrink-0 min-w-[48px] text-right text-content-secondary">
                  {fmtRate(tier.engagementRatePct)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* X-axis footer */}
      <div
        className="flex justify-between ml-[calc(12px+70px+12px)] sm:ml-[calc(16px+110px+16px)] mr-[calc(12px+48px+12px)] sm:mr-[calc(16px+48px+16px)]"
        aria-hidden="true"
      >
        {axisSteps.map((v) => (
          <span key={v} className="text-[9px] tabular-nums text-content-secondary/40 font-medium">
            {v % 1 === 0 ? `${v}%` : `${v.toFixed(1)}%`}
          </span>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between flex-wrap gap-3 text-[11px] border-t border-border-subtle pt-3">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="w-3 h-2 rounded-sm"
              aria-hidden="true"
              style={{ background: isPositive ? successBar : dangerBar }}
            />
            <span className="text-content-secondary font-medium">O teu perfil</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-content-secondary/8" aria-hidden="true" />
            <span className="text-content-secondary">Outros escalões</span>
          </span>
          <span className="text-content-secondary/50">|</span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-3 w-px border-l border-dashed border-content-secondary/40"
              aria-hidden="true"
            />
            <span className="text-content-secondary">Benchmark do tier</span>
          </span>
        </div>

        {/* Sources */}
        {sourceReferences.length > 0 && (
          <div className="text-[10px] text-content-secondary">
            Fontes:{" "}
            {sourceReferences.map((ref, i) => (
              <span key={ref.url}>
                {i > 0 && " · "}
                <a
                  href={ref.url}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-accent-primary hover:underline transition-colors"
                  aria-label={`Fonte ${i + 1}: ${ref.name}`}
                >
                  [{i + 1}] {ref.name}
                </a>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Pro competitor slot */}
      {showProSlot && !competitor ? (
        <PremiumCallout
          title="Comparar com concorrente direto"
          description="Vê se este perfil está abaixo do mercado ou apenas abaixo dos concorrentes diretos."
        />
      ) : null}
    </div>
  );
}

// ─── Formatters ─────────────────────────────────────────────────────

function fmtRate(n: number): string {
  if (!Number.isFinite(n)) return "0,00%";
  return `${n.toFixed(2).replace(".", ",")}%`;
}
