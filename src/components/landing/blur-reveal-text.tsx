import type { ElementType } from "react";

import { cn } from "@/lib/utils";

interface BlurRevealTextProps {
  text: string;
  as?: ElementType;
  className?: string;
  staggerMs?: number;
  durationMs?: number;
  delayMs?: number;
  highlightTailWords?: number;
  highlightClassName?: string;
}

export function BlurRevealText({
  text,
  as: Tag = "span",
  className,
  staggerMs = 80,
  durationMs = 700,
  delayMs = 0,
  highlightTailWords = 0,
  highlightClassName,
}: BlurRevealTextProps) {
  const words = text.split(" ");
  const highlightFromIndex =
    highlightTailWords > 0 ? Math.max(0, words.length - highlightTailWords) : -1;

  return (
    <Tag className={className} aria-label={text}>
      {words.map((word, i) => (
        <span
          key={`${word}-${i}`}
          aria-hidden="true"
          className={cn(
            "inline-block hero-blur-reveal motion-reduce:!animate-none",
            highlightFromIndex >= 0 && i >= highlightFromIndex
              ? highlightClassName
              : undefined,
          )}
          style={{
            animationDuration: `${durationMs}ms`,
            animationDelay: `${delayMs + i * staggerMs}ms`,
          }}
        >
          {word}
          {i < words.length - 1 ? "\u00A0" : ""}
        </span>
      ))}
    </Tag>
  );
}
