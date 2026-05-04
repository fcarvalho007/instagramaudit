import type { ReactNode } from "react";
import { AlertTriangle, Cpu, Lightbulb, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type InsightCalloutTone = "editorial" | "suggestion" | "warning";

interface Props {
  /** Short label above the body text. */
  label?: string;
  /** Override the default icon for this tone. */
  icon?: LucideIcon;
  /** Body text — max 2-3 lines recommended. */
  children: ReactNode;
  /** Visual tone. Default: "editorial". */
  tone?: InsightCalloutTone;
  className?: string;
}

const TONE_CONFIG: Record<
  InsightCalloutTone,
  { bg: string; ring: string; iconCls: string; labelCls: string; DefaultIcon: LucideIcon; defaultLabel: string }
> = {
  editorial: {
    bg: "bg-tint-primary",
    ring: "ring-border-subtle",
    iconCls: "text-accent-primary",
    labelCls: "text-accent-primary",
    DefaultIcon: Lightbulb,
    defaultLabel: "Leitura editorial",
  },
  suggestion: {
    bg: "bg-tint-primary/60",
    ring: "ring-border-subtle",
    iconCls: "text-accent-primary",
    labelCls: "text-accent-primary",
    DefaultIcon: Cpu,
    defaultLabel: "O que isto sugere",
  },
  warning: {
    bg: "bg-tint-warning",
    ring: "ring-signal-warning/20",
    iconCls: "text-signal-warning",
    labelCls: "text-signal-warning",
    DefaultIcon: AlertTriangle,
    defaultLabel: "Atenção",
  },
};

/**
 * Standardized editorial interpretation box for the report.
 *
 * Used for short editorial readings, suggestions, and warnings.
 * Soft background, subtle border, small icon, short label.
 */
export function InsightCallout({
  label,
  icon,
  children,
  tone = "editorial",
  className,
}: Props) {
  const cfg = TONE_CONFIG[tone];
  const Icon = icon ?? cfg.DefaultIcon;
  const displayLabel = label ?? cfg.defaultLabel;

  return (
    <div
      className={cn(
        "rounded-xl ring-1 px-4 py-3 flex items-start gap-3",
        cfg.bg,
        cfg.ring,
        className,
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn("size-4 mt-0.5 shrink-0", cfg.iconCls)}
      />
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className={cn("text-eyebrow-sm font-medium", cfg.labelCls)}>
          {displayLabel}
        </p>
        <div className="text-[13px] text-content-secondary leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  );
}
