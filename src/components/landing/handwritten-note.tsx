import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import { AnimatedCounter } from "./animated-counter";

interface HandwrittenNoteProps {
  className?: string;
}

export function HandwrittenNote({ className }: HandwrittenNoteProps) {
  const [arrowIn, setArrowIn] = useState(false);
  const [textIn, setTextIn] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setArrowIn(true), 1200);
    const t2 = setTimeout(() => setTextIn(true), 1700);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  // Path length for the arrow (approximate — generous to cover full draw)
  const PATH_LEN = 220;

  return (
    <div
      className={cn(
        "pointer-events-none select-none text-accent-violet-luminous",
        className,
      )}
      aria-hidden="true"
    >
      {/* Handwritten text — Fraunces italic, tilted */}
      <div
        className={cn(
          "relative font-display italic font-normal leading-tight text-sm md:text-base",
          "transition-all duration-500 ease-out motion-reduce:!opacity-100 motion-reduce:!translate-y-0",
          textIn
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-1",
        )}
        style={{ transform: textIn ? "rotate(-6deg)" : "rotate(-6deg) translateY(4px)" }}
      >
        <span className="block whitespace-nowrap">
          <AnimatedCounter to={2} delayMs={2100} durationMs={600} /> relatórios grátis
        </span>
      </div>

      {/* Curvy arrow */}
      <svg
        viewBox="0 0 200 120"
        fill="none"
        className="absolute top-full left-1/2 -translate-x-1/2 w-24 md:w-28 h-auto mt-1"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Curvy main path */}
        <path
          d="M 30 10 Q 20 50, 60 70 T 140 100"
          style={{
            strokeDasharray: PATH_LEN,
            strokeDashoffset: arrowIn ? 0 : PATH_LEN,
            transition: "stroke-dashoffset 900ms cubic-bezier(0.65, 0, 0.35, 1)",
          }}
          className="motion-reduce:!transition-none"
        />
        {/* Arrowhead */}
        <path
          d="M 130 92 L 142 102 L 132 110"
          style={{
            opacity: arrowIn ? 1 : 0,
            transition: "opacity 250ms ease-out 850ms",
          }}
          className="motion-reduce:!opacity-100"
        />
      </svg>
    </div>
  );
}
