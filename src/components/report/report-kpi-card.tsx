import { ArrowUpRight, ArrowDownRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sparkline } from "./sparkline";

export type KpiTint =
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "neutral"
  | "indigo"
  | "cyan";

const tintMap: Record<KpiTint, { bg: string; fg: string }> = {
  primary: { bg: "bg-tint-primary", fg: "text-accent-primary" },
  success: { bg: "bg-tint-success", fg: "text-signal-success" },
  warning: { bg: "bg-tint-warning", fg: "text-signal-warning" },
  danger: { bg: "bg-tint-danger", fg: "text-signal-danger" },
  neutral: { bg: "bg-tint-neutral", fg: "text-content-secondary" },
  indigo: { bg: "bg-tint-indigo", fg: "text-accent-secondary" },
  cyan: { bg: "bg-tint-cyan", fg: "text-accent-tertiary" },
};

interface ReportKpiCardProps {
  icon: LucideIcon;
  tint: KpiTint;
  label: string;
  value: string;
  valueSuffix?: string;
  trend?: { value: string; direction: "up" | "down" };
  trendVariant?: "success" | "danger" | "neutral";
  subtitle?: string;
  /** Mini-trend rendered to the right of the value. Empty array → no chart. */
  sparklineData?: number[];
  /** Highlighted card gets a thin top border in --accent-primary. */
  highlighted?: boolean;
  /** Static badge replacing the value, used by the "Estado" KPI. */
  badge?: { label: string; tone: "positive" | "neutral" };
}

export function ReportKpiCard({
  icon: Icon,
  tint,
  label,
  value,
  valueSuffix,
  trend,
  trendVariant = "neutral",
  subtitle,
  sparklineData,
  highlighted = false,
  badge,
}: ReportKpiCardProps) {
  const t = tintMap[tint];
  const trendColor =
    trendVariant === "success"
      ? "text-signal-success"
      : trendVariant === "danger"
        ? "text-signal-danger"
        : "text-content-secondary";
  const TrendArrow = trend?.direction === "up" ? ArrowUpRight : ArrowDownRight;
  const sparkTone =
    trendVariant === "success"
      ? ("positive" as const)
      : trendVariant === "danger"
        ? ("negative" as const)
        : ("accent" as const);
  const hasSparkline = Array.isArray(sparklineData) && sparklineData.length >= 2;

  return (
    <div
      className={cn(
        "relative bg-surface-secondary border border-border-default rounded-2xl shadow-card p-6 md:p-7 flex flex-col gap-4 overflow-hidden",
        highlighted && "ring-1 ring-accent-primary/20",
      )}
    >
      {highlighted && (
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-[2px] bg-accent-primary"
        />
      )}

      <div className="flex items-center gap-2">
        <div
          className={cn(
            "h-7 w-7 rounded-full flex items-center justify-center",
            t.bg,
          )}
        >
          <Icon className={cn("size-3.5", t.fg)} />
        </div>
        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-content-secondary">
          {label}
        </p>
      </div>

      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          {badge ? (
            <span
              className={cn(
                "inline-flex items-center gap-2 px-2.5 py-1 rounded-full border text-[11px] font-medium",
                badge.tone === "positive"
                  ? "border-signal-success/30 text-signal-success"
                  : "border-border-default text-content-secondary",
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  badge.tone === "positive"
                    ? "bg-signal-success"
                    : "bg-content-tertiary",
                )}
              />
              {badge.label}
            </span>
          ) : (
            <div className="flex items-baseline gap-1.5">
              <span className="font-sans text-[28px] md:text-[32px] font-medium tracking-[-0.02em] text-content-primary leading-none">
                {value}
              </span>
              {valueSuffix && (
                <span className="font-mono text-sm text-content-tertiary">
                  {valueSuffix}
                </span>
              )}
            </div>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            {trend && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-[11px] font-medium",
                  trendColor,
                )}
              >
                <TrendArrow className="size-3" />
                <span className="font-mono">{trend.value}</span>
              </span>
            )}
            {subtitle && (
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-content-tertiary">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {hasSparkline && (
          <div className="shrink-0 self-end pb-0.5">
            <Sparkline data={sparklineData!} tone={sparkTone} />
          </div>
        )}
      </div>
    </div>
  );
}
