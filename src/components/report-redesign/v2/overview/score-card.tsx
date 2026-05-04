import { ScoreRing } from "./score-ring";
import {
  getScoreFamily,
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
    <article
      aria-label={definition.ariaLabel(score, getScoreFamily(score))}
      className={cn(
        "flex flex-col items-center rounded-2xl border border-border-default bg-surface-secondary",
        "px-4 py-6 sm:px-5 sm:py-7 text-center",
        "shadow-card",
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
    </article>
  );
}
