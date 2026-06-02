import { useEffect, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import { useInView } from "@/components/landing/use-in-view";

/**
 * Lightweight scroll-reveal wrapper used across the dark landing bands.
 * Adds the `.dark-reveal` class plus `.is-in` once visible. Respects
 * `prefers-reduced-motion` via CSS in `hero-dark.css`.
 */
export function Reveal({
  children,
  className,
  delayMs = 0,
}: {
  children: ReactNode;
  className?: string;
  delayMs?: number;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const [armed, setArmed] = useState(false);

  // Only "arm" the hidden-start state once the IntersectionObserver is
  // wired and the element is offscreen. If the element is already in view
  // on mount, skip the hide-flash entirely.
  useEffect(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const offscreen = rect.top > window.innerHeight;
    if (offscreen) setArmed(true);
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "dark-reveal",
        armed && "is-armed",
        inView && "is-in",
        className,
      )}
      style={delayMs ? { transitionDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </div>
  );
}