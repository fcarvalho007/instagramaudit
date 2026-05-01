import * as React from "react";

import { cn } from "@/lib/utils";
import { useInView } from "./use-in-view";

interface HowItWorksStepProps {
  number: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  delay?: number;
  emphasis?: "default" | "primary";
  showDivider?: boolean;
}

export function HowItWorksStep({
  number,
  title,
  description,
  icon,
  delay = 0,
  emphasis = "default",
  showDivider = false,
}: HowItWorksStepProps) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const isPrimary = emphasis === "primary";

  return (
    <div
      ref={ref}
      className={cn(
        "relative flex flex-col items-start gap-6 transition-all duration-[700ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
        showDivider && "md:pr-8 md:border-r md:border-border-subtle",
        inView
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-8 motion-reduce:opacity-100 motion-reduce:translate-y-0",
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {/* Icon + number row */}
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "relative flex items-center justify-center rounded-xl border transition-all",
            isPrimary
              ? "h-16 w-16 bg-accent-violet/10 border-accent-violet/40"
              : "h-14 w-14 bg-surface-elevated/90 border-accent-violet/15",
          )}
          style={
            isPrimary ? { boxShadow: "var(--shadow-glow-violet)" } : undefined
          }
        >
          <span
            className={cn(
              "text-accent-violet-luminous",
              isPrimary ? "[&>svg]:h-7 [&>svg]:w-7" : "[&>svg]:h-6 [&>svg]:w-6",
            )}
          >
            {icon}
          </span>
        </div>
        <span className="text-eyebrow text-content-tertiary">
          Passo {number}
        </span>
      </div>

      {/* Title */}
      <h3
        className={cn(
          "font-display text-content-primary font-medium tracking-tight leading-tight",
          isPrimary ? "text-2xl md:text-[2rem]" : "text-2xl md:text-3xl",
        )}
      >
        {title}
      </h3>

      {/* Description */}
      <p className="font-sans text-base md:text-lg text-content-secondary leading-relaxed">
        {description}
      </p>
    </div>
  );
}
