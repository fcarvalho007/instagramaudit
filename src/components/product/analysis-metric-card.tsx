import { cn } from "@/lib/utils";

interface AnalysisMetricCardProps {
  label: string;
  value: string;
  hint?: string;
  emphasis?: boolean;
}

export function AnalysisMetricCard({
  label,
  value,
  hint,
  emphasis = false,
}: AnalysisMetricCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-surface-secondary p-5 transition-colors",
        emphasis
          ? "border-accent-violet/30 shadow-[inset_0_1px_0_rgb(255_255_255_/_0.04),0_0_24px_-12px_rgb(139_92_246_/_0.4)]"
          : "border-border-subtle",
      )}
    >
      <span className="text-eyebrow-sm block text-[0.625rem] text-content-tertiary">
        {label}
      </span>
      <span
        className={cn(
          "mt-3 block font-display text-3xl font-medium tracking-tight",
          emphasis ? "text-accent-luminous" : "text-content-primary",
        )}
      >
        {value}
      </span>
      {hint ? (
        <span className="mt-2 block font-sans text-xs text-content-secondary">
          {hint}
        </span>
      ) : null}
    </div>
  );
}
