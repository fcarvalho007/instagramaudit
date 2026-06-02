import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { useInView } from "@/components/landing/use-in-view";

/**
 * Lightweight scroll-reveal wrapper used across the dark landing bands.
 * Adds the `.dark-reveal` class plus `.is-in` once visible. Respects
 * `prefers-reduced-motion` via CSS in `hero-dark.css`.
 */
export function Reveal({
  children,
  as: Tag = "div",
  className,
  delayMs = 0,
}: {
  children: ReactNode;
  as?: "div" | "section" | "article" | "li";
  className?: string;
  delayMs?: number;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    // @ts-expect-error — dynamic tag with shared ref type
    <Tag
      ref={ref}
      className={cn("dark-reveal", inView && "is-in", className)}
      style={delayMs ? { transitionDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}