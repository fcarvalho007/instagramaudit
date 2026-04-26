/**
 * Stat card — large numeric value with label and optional sublabel.
 * Used as the header summary in cockpit panels.
 *
 * Densidade consistente entre painéis: altura mínima fixa para evitar
 * desalinhamento em grids 2/4 colunas quando alguns cards têm sublabel
 * e outros não.
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
    <div className="flex min-h-[6.5rem] flex-col rounded-lg border border-border-subtle bg-surface-elevated p-4 sm:p-5">
      <p className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-content-tertiary">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 break-words font-display text-2xl tabular-nums sm:text-3xl",
          toneText[tone],
        )}
      >
        {value}
      </p>
      {sublabel ? (
        <p className="mt-auto pt-1 text-xs text-content-secondary">{sublabel}</p>
      ) : null}
    </div>
  );
}
