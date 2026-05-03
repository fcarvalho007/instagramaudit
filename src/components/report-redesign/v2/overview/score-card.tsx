import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChevronRight } from "lucide-react";
import { ScoreRing } from "./score-ring";
import {
  getScoreFamily,
  SCORE_COLORS,
  type ScoreDefinition,
} from "./score-utils";

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
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={handleClick}
            aria-label={definition.ariaLabel(score, family)}
            className="relative flex flex-col items-center gap-3 rounded-xl border border-slate-200 px-4 py-5 text-center shadow-[0_1px_3px_rgba(15,23,42,0.04),0_8px_20px_-12px_rgba(15,23,42,0.08)] transition-all duration-200 hover:border-slate-300 hover:shadow-[0_2px_6px_rgba(15,23,42,0.06),0_14px_28px_-12px_rgba(15,23,42,0.12)] hover:-translate-y-0.5 hover:cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
            style={{ backgroundColor: colors.tintBg }}
          >
            <ScoreRing score={score} size={88} label={definition.label} />
            <span className="text-sm font-semibold text-slate-900">
              {definition.label}
            </span>
            <span className="text-xs text-slate-500 leading-tight tabular-nums">
              {subtitle}
            </span>
            <ChevronRight className="absolute top-2 right-2 size-3.5 text-slate-300 transition-colors group-hover:text-slate-400" aria-hidden="true" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[240px] text-xs">
          {definition.tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}