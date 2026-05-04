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
  return (
    <div
      aria-label={definition.ariaLabel(score, getScoreFamily(score))}
      className={cn(
        "relative flex flex-col items-center rounded-2xl border border-border-default bg-white",
        "px-4 py-6 sm:px-5 sm:py-7 text-center",
        "shadow-[0_1px_3px_rgba(15,23,42,0.04),0_4px_12px_-4px_rgba(15,23,42,0.06)]",
      )}
    >
      {/* Ring */}
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
    </div>
  );
}
