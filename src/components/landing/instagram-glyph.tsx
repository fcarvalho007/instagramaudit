import { useId } from "react";

import { cn } from "@/lib/utils";

interface InstagramGlyphProps {
  className?: string;
  tone?: "gradient" | "mono";
}

export function InstagramGlyph({
  className,
  tone = "gradient",
}: InstagramGlyphProps) {
  const gradientId = useId();

  if (tone === "mono") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn("inline-block", className)}
        aria-hidden="true"
      >
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("inline-block", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id={gradientId}
          x1="100%"
          y1="0%"
          x2="0%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#F58529" />
          <stop offset="40%" stopColor="#DD2A7B" />
          <stop offset="75%" stopColor="#8134AF" />
          <stop offset="100%" stopColor="#515BD4" />
        </linearGradient>
      </defs>
      {/* Outer rounded square — gradient fill */}
      <rect
        x="2.5"
        y="2.5"
        width="19"
        height="19"
        rx="5.5"
        fill={`url(#${gradientId})`}
      />
      {/* Camera ring */}
      <circle
        cx="12"
        cy="12"
        r="4.25"
        fill="none"
        stroke="white"
        strokeWidth="1.7"
      />
      {/* Top-right dot */}
      <circle cx="17.4" cy="6.6" r="0.95" fill="white" />
    </svg>
  );
}
