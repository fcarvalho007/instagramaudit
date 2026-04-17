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
  featured?: boolean;
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
  featured = false,
}: MockupMetricCardProps) {
  const TrendIcon = trendDirection === "up" ? TrendingUp : TrendingDown;

  return (
    <Card
      variant="default"
      padding="md"
      className={cn(
        "flex flex-col gap-1.5",
        featured &&
          "border-accent-violet/40 shadow-[0_0_24px_-8px_rgb(139_92_246_/_0.4)]",
      )}
    >
      <span
        className={cn(
          "font-mono uppercase tracking-wide text-content-tertiary",
          featured ? "text-[0.6875rem]" : "text-[0.6875rem]",
        )}
      >
        {label}
      </span>
      <div className="flex items-baseline gap-2 flex-wrap">
        <span
          className={cn(
            "font-display font-medium tracking-tight text-content-primary leading-none",
            featured
              ? "text-3xl md:text-4xl"
              : "text-2xl md:text-3xl",
          )}
        >
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
