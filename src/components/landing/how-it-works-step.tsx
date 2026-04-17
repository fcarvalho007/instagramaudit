import * as React from "react";

import { cn } from "@/lib/utils";
import { useInView } from "./use-in-view";

interface HowItWorksStepProps {
  number: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  delay?: number;
}

export function HowItWorksStep({
  number,
  title,
  description,
  icon,
  delay = 0,
}: HowItWorksStepProps) {
  const { ref, inView } = useInView<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={cn(
        "flex flex-col items-start gap-6 transition-all duration-[700ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
        inView
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-8 motion-reduce:opacity-100 motion-reduce:translate-y-0",
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {/* Icon + number row */}
      <div className="flex items-center gap-4">
        <div
          className="relative flex h-14 w-14 items-center justify-center rounded-xl bg-surface-elevated border border-border-strong/15"
          style={{ boxShadow: "var(--shadow-glow-cyan)" }}
        >
          <span className="text-accent-luminous [&>svg]:h-6 [&>svg]:w-6">
            {icon}
          </span>
        </div>
        <span className="font-mono text-xs uppercase tracking-wide text-content-tertiary">
          Passo {number}
        </span>
      </div>

      {/* Title */}
      <h3 className="font-display text-2xl md:text-3xl text-content-primary font-medium tracking-tight leading-tight">
        {title}
      </h3>

      {/* Description */}
      <p className="font-sans text-base md:text-lg text-content-secondary leading-relaxed">
        {description}
      </p>
    </div>
  );
}
