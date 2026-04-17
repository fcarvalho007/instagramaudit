import { useEffect, useState } from "react";

interface AnimatedCounterProps {
  to: number;
  durationMs?: number;
  delayMs?: number;
  className?: string;
}

export function AnimatedCounter({
  to,
  durationMs = 600,
  delayMs = 0,
  className,
}: AnimatedCounterProps) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    // Respect prefers-reduced-motion: jump straight to final value
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    if (reduce) {
      const t = setTimeout(() => setValue(to), delayMs);
      return () => clearTimeout(t);
    }

    let raf = 0;
    const startTimer = setTimeout(() => {
      const startTime = performance.now();
      const animate = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / durationMs, 1);
        const eased = 1 - Math.pow(2, -10 * progress);
        setValue(Math.round(to * eased));
        if (progress < 1) {
          raf = requestAnimationFrame(animate);
        }
      };
      raf = requestAnimationFrame(animate);
    }, delayMs);

    return () => {
      clearTimeout(startTimer);
      cancelAnimationFrame(raf);
    };
  }, [to, durationMs, delayMs]);

  return <span className={className}>{value}</span>;
}
