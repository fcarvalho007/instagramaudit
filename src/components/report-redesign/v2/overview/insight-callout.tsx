/**
 * Unified insight / verdict / reading callout for Block 1 cards.
 *
 * Five tone variants share identical layout, padding and typography.
 * Only colour changes between tones.
 *
 * Local decorative values for the "ai" tone (teal/emerald) are scoped
 * here because tokens-light.css doesn't ship a dedicated tint-ai family.
 */
import type { ReactNode } from "react";
import {
  Check,
  AlertTriangle,
  Sparkles,
  Info,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type InsightTone = "positive" | "warning" | "danger" | "ai" | "neutral";

export interface InsightCalloutProps {
  tone: InsightTone;
  label?: string;
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}

/* ── Tone config ───────────────────────────────────────────────── */

interface ToneCfg {
  bg: string;
  border: string;
  iconBg: string;
  iconColor: string;
  labelColor: string;
  DefaultIcon: LucideIcon;
  defaultLabel: string;
}

const TONE: Record<InsightTone, ToneCfg> = {
  positive: {
    bg: "bg-[rgb(var(--tint-success))]",
    border: "border-signal-success/20",
    iconBg: "bg-signal-success/10",
    iconColor: "text-signal-success",
    labelColor: "text-signal-success",
    DefaultIcon: Check,
    defaultLabel: "PONTO FORTE",
  },
  warning: {
    bg: "bg-[rgb(var(--tint-warning))]",
    border: "border-signal-warning/20",
    iconBg: "bg-signal-warning/10",
    iconColor: "text-signal-warning",
    labelColor: "text-signal-warning",
    DefaultIcon: AlertTriangle,
    defaultLabel: "A MELHORAR",
  },
  danger: {
    bg: "bg-[rgb(var(--tint-danger))]",
    border: "border-signal-danger/20",
    iconBg: "bg-signal-danger/10",
    iconColor: "text-signal-danger",
    labelColor: "text-signal-danger",
    DefaultIcon: AlertTriangle,
    defaultLabel: "ALERTA",
  },
  ai: {
    /* Teal / emerald — no dedicated tint token exists, so local rgba */
    bg: "bg-[rgba(29,158,117,0.06)]",
    border: "border-[rgba(29,158,117,0.18)]",
    iconBg: "bg-[rgba(29,158,117,0.10)]",
    iconColor: "text-signal-success",
    labelColor: "text-signal-success",
    DefaultIcon: Sparkles,
    defaultLabel: "DIAGNÓSTICO",
  },
  neutral: {
    bg: "bg-[rgb(var(--tint-primary))]",
    border: "border-accent-primary/15",
    iconBg: "bg-accent-primary/10",
    iconColor: "text-accent-primary",
    labelColor: "text-accent-primary",
    DefaultIcon: Info,
    defaultLabel: "DIAGNÓSTICO",
  },
};

/* ── Component ─────────────────────────────────────────────────── */

export function InsightCallout({
  tone,
  label,
  children,
  icon,
  className,
}: InsightCalloutProps) {
  const cfg = TONE[tone];
  const displayLabel = label ?? cfg.defaultLabel;
  const DefaultIcon = cfg.DefaultIcon;

  return (
    <div
      className={cn(
        "rounded-2xl border p-4 md:p-5 flex items-start gap-3",
        cfg.bg,
        cfg.border,
        className,
      )}
    >
      {/* Icon circle */}
      <span
        className={cn(
          "flex items-center justify-center size-9 md:size-10 rounded-full shrink-0",
          cfg.iconBg,
        )}
        aria-hidden="true"
      >
        {icon ?? (
          <DefaultIcon className={cn("size-4", cfg.iconColor)} strokeWidth={2} />
        )}
      </span>

      <div className="min-w-0 flex-1 space-y-1">
        <p className={cn("text-eyebrow-sm", cfg.labelColor)}>
          {displayLabel}
        </p>
        <div className="text-[15px] text-content-primary leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  );
}