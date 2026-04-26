/**
 * Stat card — large numeric value with label and optional sublabel.
 * Used as the header summary in cockpit panels.
 */

import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  sublabel?: string;
  tone?: "default" | "success" | "warning" | "danger" | "accent";
}

const toneText: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "text-content-primary",
  success: "text-signal-success",
  warning: "text-signal-warning",
  danger: "text-signal-danger",
  accent: "text-accent-luminous",
};

export function StatCard({ label, value, sublabel, tone = "default" }: StatCardProps) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-elevated p-4 sm:p-5">
      <p className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-content-tertiary">
        {label}
      </p>
      <p className={cn("mt-2 font-display text-2xl sm:text-3xl", toneText[tone])}>
        {value}
      </p>
      {sublabel ? (
        <p className="mt-1 text-xs text-content-secondary">{sublabel}</p>
      ) : null}
    </div>
  );
}