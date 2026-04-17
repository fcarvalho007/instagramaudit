import { TrendingUp, TrendingDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type MetricVariant = "default" | "success" | "warning" | "danger";

interface MockupMetricCardProps {
  label: string;
  value: string;
  suffix?: string;
  trend?: string;
  trendDirection?: "up" | "down";
  variant?: MetricVariant;
  badge?: string;
}

const trendColorMap: Record<MetricVariant, string> = {
  default: "text-content-secondary",
  success: "text-signal-success",
  warning: "text-signal-warning",
  danger: "text-signal-danger",
};

export function MockupMetricCard({
  label,
  value,
  suffix,
  trend,
  trendDirection = "up",
  variant = "default",
  badge,
}: MockupMetricCardProps) {
  const TrendIcon = trendDirection === "up" ? TrendingUp : TrendingDown;

  return (
    <Card variant="default" padding="md" className="flex flex-col gap-2">
      <span className="font-mono text-[0.625rem] uppercase tracking-wide text-content-tertiary">
        {label}
      </span>
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="font-display text-2xl md:text-3xl font-medium tracking-tight text-content-primary leading-none">
          {value}
        </span>
        {suffix ? (
          <span className="font-mono text-xs text-content-tertiary">
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
            trendColorMap[variant],
          )}
        >
          <TrendIcon className="h-3 w-3" aria-hidden="true" />
          <span>{trend}</span>
        </div>
      ) : null}
    </Card>
  );
}
