import { ArrowRight } from "lucide-react";
import { ScoreRing } from "./score-ring";
import {
  getScoreFamily,
  SCORE_COLORS,
  type ScoreDefinition,
} from "./score-utils";
import { cn } from "@/lib/utils";

interface ScoreCardProps {
  definition: ScoreDefinition;
  score: number;
  subtitle: string;
}

export function ScoreCard({ definition, score, subtitle }: ScoreCardProps) {
  const family = getScoreFamily(score);
  const colors = SCORE_COLORS[family];

  const handleClick = () => {
    const el = document.getElementById(definition.blockId);
    el?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={definition.ariaLabel(score, family)}
      className={cn(
        "group relative flex flex-col items-center rounded-2xl border border-border-default bg-white",
        "px-4 py-6 sm:px-5 sm:py-7 text-center",
        "shadow-[0_1px_3px_rgba(15,23,42,0.04),0_4px_12px_-4px_rgba(15,23,42,0.06)]",
        "transition-all duration-250 ease-out",
        "hover:shadow-[0_4px_16px_-4px_rgba(15,23,42,0.10),0_12px_32px_-12px_rgba(15,23,42,0.14)]",
        "hover:-translate-y-1 hover:border-border-hover",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2",
      )}
    >
      {/* Ring — bigger on mobile */}
      <div className="mb-3 sm:mb-4">
        <ScoreRing score={score} size={100} label={definition.label} />
      </div>

      {/* Label */}
      <span className="text-[15px] sm:text-base font-semibold text-content-primary leading-tight">
        {definition.label}
      </span>

      {/* Subtitle */}
      <span className="mt-1.5 text-xs sm:text-[13px] text-content-secondary leading-snug tabular-nums">
        {subtitle}
      </span>

      {/* Tooltip on hover */}
      <span className="mt-2.5 text-[11px] text-content-tertiary leading-snug opacity-0 max-h-0 overflow-hidden transition-all duration-200 group-hover:opacity-100 group-hover:max-h-12">
        {definition.tooltip}
      </span>

      {/* Arrow indicator */}
      <span
        className="absolute bottom-2.5 right-2.5 flex items-center justify-center size-5 rounded-full transition-all duration-200 opacity-40 group-hover:opacity-80"
        style={{ backgroundColor: colors.tintBg }}
        aria-hidden="true"
      >
        <ArrowRight className="size-3" style={{ color: colors.stroke }} />
      </span>
    </button>
  );
}