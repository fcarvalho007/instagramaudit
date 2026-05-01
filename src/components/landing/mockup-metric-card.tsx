import { TrendingUp, TrendingDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type MetricVariant = "default" | "success" | "warning" | "danger";
type MetricTone = "dark" | "light";

interface MockupMetricCardProps {
  label: string;
  value: string;
  suffix?: string;
  trend?: string;
  trendDirection?: "up" | "down";
  variant?: MetricVariant;
  badge?: string;
  featured?: boolean;
  tone?: MetricTone;
}

const trendColorMapDark: Record<MetricVariant, string> = {
  default: "text-content-secondary",
  success: "text-signal-success",
  warning: "text-signal-warning",
  danger: "text-signal-danger",
};

const trendColorMapLight: Record<MetricVariant, string> = {
  default: "text-on-light-secondary",
  success: "text-emerald-600",
  warning: "text-amber-600",
  danger: "text-rose-600",
};

export function MockupMetricCard({
  label,
  value,
  suffix,
  trend,
  trendDirection = "up",
  variant = "default",
  badge,
  featured = false,
  tone = "dark",
}: MockupMetricCardProps) {
  const TrendIcon = trendDirection === "up" ? TrendingUp : TrendingDown;
  const isLight = tone === "light";

  return (
    <Card
      variant="default"
      padding="md"
      className={cn(
        "flex flex-col gap-1.5",
        isLight && "bg-white border-slate-200 shadow-none",
        featured && !isLight &&
          "border-accent-violet/40 shadow-[0_0_32px_-12px_rgb(139_92_246_/_0.5)]",
        featured && isLight &&
          "border-accent-violet/50 shadow-[0_0_24px_-8px_rgb(139_92_246_/_0.35)]",
      )}
    >
      <span
        className={cn(
          "text-eyebrow-sm text-[0.6875rem]",
          isLight ? "text-on-light-tertiary" : "text-content-tertiary",
        )}
      >
        {label}
      </span>
      <div className="flex items-baseline gap-2 flex-wrap">
        <span
          className={cn(
            "font-display font-medium tracking-tight leading-none",
            isLight ? "text-on-light-primary" : "text-content-primary",
            featured ? "text-3xl md:text-4xl" : "text-2xl md:text-3xl",
          )}
        >
          {value}
        </span>
        {suffix ? (
          <span
            className={cn(
              "font-mono text-xs",
              isLight ? "text-on-light-tertiary" : "text-content-tertiary",
            )}
          >
            {suffix}
          </span>
        ) : null}
        {badge ? (
          <Badge variant="default" size="sm">
            {badge}
          </Badge>
        ) : null}
      </div>
      {trend ? (
        <div
          className={cn(
            "flex items-center gap-1 font-mono text-[0.6875rem]",
            isLight ? trendColorMapLight[variant] : trendColorMapDark[variant],
          )}
        >
          <TrendIcon className="h-3 w-3" aria-hidden="true" />
          <span>{trend}</span>
        </div>
      ) : null}
    </Card>
  );
}
