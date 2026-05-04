/**
 * Horizontal benchmark comparison chart — tier rows with profile overlay.
 * Replaces the previous vertical SVG bar chart.
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
  "1K–5K": "nano",
  "5K–20K": "micro",
  "20K–100K": "mid",
  "100K–1M": "macro",
  "+1M": "mega",
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

  // Dynamic axis: max of all values + headroom, rounded to nice step
  const allVals = benchmarkSeries.map((t) => t.engagementRatePct);
  if (profileVal > 0) allVals.push(profileVal);
  if (competitor?.engagementRatePct) allVals.push(competitor.engagementRatePct);
  const rawMax = Math.max(...allVals) * 1.15 || 1;
  const niceStep = rawMax <= 3 ? 0.5 : rawMax <= 8 ? 1 : rawMax <= 15 ? 2 : 5;
  const scaleMax = Math.ceil(rawMax / niceStep) * niceStep;

  const pct = (v: number) => Math.min((v / scaleMax) * 100, 100);
  const benchmarkPct = pct(benchmarkVal);

  return (
    <div className="flex flex-col gap-4">
      {/* Chart header */}
      <div className="flex items-baseline justify-between flex-wrap gap-1">
        <span className="text-eyebrow-sm text-content-secondary">
          Comparação entre escalões de seguidores
        </span>
        <span className="text-[10px] text-content-secondary hidden sm:inline">
          eixo: 0% → {scaleMax % 1 === 0 ? `${scaleMax}` : scaleMax.toFixed(1)}%
        </span>
      </div>

      {/* Tier rows */}
      <div className="relative flex flex-col gap-2" role="list" aria-label="Comparação de taxa de envolvimento por escalão">
        {/* Full-height benchmark reference line + label */}
        {benchmarkVal > 0 && (
          <>
            {/* Label above bars */}
            <div className="relative h-5 ml-[calc(12px+70px+12px)] sm:ml-[calc(16px+110px+16px)] mr-[calc(12px+48px+12px)] sm:mr-[calc(16px+48px+16px)]">
              <span
                className="absolute bottom-0 text-[10px] text-content-secondary font-medium whitespace-nowrap -translate-x-1/2"
                style={{ left: `max(${benchmarkPct}%, 24px)` }}
              >
                benchmark {fmtRate(benchmarkVal)}
              </span>
            </div>
            {/* Full-height vertical dashed line spanning all rows — uses same margins as bar area */}
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

          return (
            <div
              key={tier.tierLabel}
              role="listitem"
              aria-label={`Escalão ${tier.tierLabel}: referência ${fmtRate(tier.engagementRatePct)}${isActive ? `, este perfil ${fmtRate(profileVal)}` : ""}`}
              className={cn(
                "relative rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 transition-colors",
                isActive
                  ? "border-2 border-accent-primary/30 bg-tint-primary"
                  : "border border-transparent",
              )}
            >
              {/* Active tier badge */}
              {isActive && (
                <span className="absolute -top-2.5 left-3 sm:left-4 text-[9px] font-bold tracking-[0.08em] text-accent-primary bg-surface-secondary border border-accent-primary/20 rounded px-1.5 py-0.5 uppercase">
                  O teu escalão
                </span>
              )}

              <div className="flex items-center gap-3 sm:gap-4">
                {/* Index + label */}
                <div className="flex items-baseline gap-1.5 min-w-[70px] sm:min-w-[110px] shrink-0">
                  <span className="text-[11px] tabular-nums text-content-secondary font-medium">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="flex flex-col leading-tight">
                    <span className={cn(
                      "text-[13px] font-semibold",
                      isActive ? "text-content-primary" : "text-content-secondary",
                    )}>
                      {tier.tierLabel}
                    </span>
                    {sub && (
                      <span className={cn(
                        "text-[10px]",
                        isActive ? "text-content-secondary" : "text-content-secondary/60",
                      )}>
                        {isActive ? `${sub} · onde estás` : sub}
                      </span>
                    )}
                  </div>
                </div>

                {/* Bar area */}
                <div className="relative flex-1 h-6 sm:h-7">
                  {isActive ? (
                    <>
                      {/* Segment 1: benchmark portion (solid blue) */}
                      <div
                        className={cn(
                          "absolute inset-y-0 left-0 bg-accent-primary rounded-l-md",
                          profileVal <= benchmarkVal && "rounded-r-md",
                        )}
                        style={{ width: `${Math.max(Math.min(tierPct, profilePctVal), 1)}%` }}
                      />
                      {/* Segment 2: gap above benchmark (green) — only when profile > benchmark */}
                      {profileVal > benchmarkVal && (
                        <div
                          className="absolute inset-y-0 rounded-r-md bg-signal-success/80"
                          style={{
                            left: `${tierPct}%`,
                            width: `${Math.max(profilePctVal - tierPct, 0)}%`,
                          }}
                        />
                      )}
                      {/* Inline profile value */}
                      {profileVal > 0 && (
                        <span
                          className="absolute text-[11px] font-bold text-content-inverse tabular-nums drop-shadow-sm z-20"
                          style={{ left: `${Math.max(profilePctVal - 1, 2)}%`, top: '50%', transform: `translate(-100%, -50%)` }}
                        >
                          {profilePctVal > 12 && fmtRate(profileVal)}
                        </span>
                      )}
                      {/* External label if bar too short */}
                      {profileVal > 0 && profilePctVal <= 14 && (
                        <span
                          className="absolute top-1/2 -translate-y-1/2 text-[11px] font-bold text-accent-primary tabular-nums z-20"
                          style={{ left: `${Math.max(profilePctVal + 1, 3)}%` }}
                        >
                          {fmtRate(profileVal)}
                        </span>
                      )}
                    </>
                  ) : (
                    /* Inactive tier: grey bar */
                    <div
                      className="absolute inset-y-0 left-0 rounded-md bg-content-secondary/12"
                      style={{ width: `${Math.max(tierPct, 1)}%` }}
                    />
                  )}
                </div>

                {/* Value */}
                <span className={cn(
                  "text-[13px] tabular-nums font-semibold shrink-0 min-w-[48px] text-right",
                  isActive ? "text-content-primary" : "text-content-secondary",
                )}>
                  {isActive ? fmtRate(profileVal) : fmtRate(tier.engagementRatePct)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between flex-wrap gap-3 text-[11px] pt-1">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span className="flex gap-px" aria-hidden="true">
              <span className="w-1.5 h-2.5 rounded-l-sm bg-accent-primary" />
              <span className="w-1 h-2.5 rounded-r-sm bg-signal-success" />
            </span>
            <span className="text-content-secondary font-medium">O teu escalão</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-surface-muted" aria-hidden="true" />
            <span className="text-content-secondary">Outros escalões</span>
          </span>
          <span className="text-content-secondary/50">|</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-px border-l border-dashed border-content-secondary/40" aria-hidden="true" />
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
          description="Vê se o teu perfil está abaixo do mercado ou apenas abaixo dos teus concorrentes."
        />
      ) : null}
    </div>
  );
}

// ─── Formatters ─────────────────────────────────────────────────────

function fmtRate(n: number): string {
  return `${n.toFixed(2).replace(".", ",")}%`;
}
