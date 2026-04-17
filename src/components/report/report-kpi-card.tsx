import { ArrowUpRight, ArrowDownRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

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
}: ReportKpiCardProps) {
  const t = tintMap[tint];
  const trendColor =
    trendVariant === "success"
      ? "text-signal-success bg-tint-success"
      : trendVariant === "danger"
        ? "text-signal-danger bg-tint-danger"
        : "text-content-secondary bg-tint-neutral";
  const TrendArrow = trend?.direction === "up" ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="bg-surface-secondary border border-border-default/40 rounded-xl shadow-card p-6 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div
          className={cn(
            "h-10 w-10 rounded-full flex items-center justify-center",
            t.bg,
          )}
        >
          <Icon className={cn("size-5", t.fg)} />
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-sm text-content-secondary">{label}</p>
        <div className="flex items-baseline gap-1.5">
          <span className="font-display text-3xl md:text-[34px] font-medium text-content-primary leading-none">
            {value}
          </span>
          {valueSuffix && (
            <span className="font-mono text-sm text-content-tertiary">
              {valueSuffix}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="font-mono text-[11px] uppercase tracking-wide text-content-tertiary pt-1">
            {subtitle}
          </p>
        )}
      </div>

      {trend && (
        <div
          className={cn(
            "inline-flex items-center gap-1 px-2 py-1 rounded-md w-fit text-xs font-medium",
            trendColor,
          )}
        >
          <TrendArrow className="size-3" />
          <span className="font-mono">{trend.value}</span>
        </div>
      )}
    </div>
  );
}
