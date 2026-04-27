import { cn } from "@/lib/utils";
import { TIER_COPY } from "./tier-copy";

type TierTagVariant = "essential" | "complete";

interface TierTagProps {
  variant: TierTagVariant;
  className?: string;
  /** Optional override for the displayed label. */
  label?: string;
}

/**
 * Editorial micro-label used to mark whether a piece of content belongs to
 * the free "Visão essencial" tier or the upcoming complete "Leitura
 * completa" tier. Token-only styling, mono-uppercase eyebrow rhythm.
 */
export function TierTag({ variant, className, label }: TierTagProps) {
  const text = label ?? TIER_COPY.tag[variant];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] px-2 py-1 rounded-full border",
        variant === "essential" &&
          "text-content-tertiary border-border-subtle/40 bg-surface-secondary/50",
        variant === "complete" &&
          "text-accent-primary border-accent-primary/30 bg-accent-primary/5",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "h-1 w-1 rounded-full",
          variant === "essential" && "bg-content-tertiary/60",
          variant === "complete" && "bg-accent-primary",
        )}
      />
      {text}
    </span>
  );
}