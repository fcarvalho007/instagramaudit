import { useEffect, useState, type ElementType } from "react";

import { cn } from "@/lib/utils";

interface BlurRevealTextProps {
  text: string;
  as?: ElementType;
  className?: string;
  staggerMs?: number;
  durationMs?: number;
  delayMs?: number;
}

export function BlurRevealText({
  text,
  as: Tag = "span",
  className,
  staggerMs = 80,
  durationMs = 700,
  delayMs = 0,
}: BlurRevealTextProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs]);

  const words = text.split(" ");

  return (
    <Tag className={className} aria-label={text}>
      {words.map((word, i) => (
        <span
          key={`${word}-${i}`}
          aria-hidden="true"
          className={cn(
            "inline-block transition-all ease-out motion-reduce:!opacity-100 motion-reduce:!blur-0 motion-reduce:!translate-y-0",
            mounted
              ? "opacity-100 blur-0 translate-y-0"
              : "opacity-0 blur-md translate-y-2",
          )}
          style={{
            transitionDuration: `${durationMs}ms`,
            transitionDelay: `${i * staggerMs}ms`,
          }}
        >
          {word}
          {i < words.length - 1 ? "\u00A0" : ""}
        </span>
      ))}
    </Tag>
  );
}
