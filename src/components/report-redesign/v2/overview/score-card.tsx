import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScoreRing } from "./score-ring";
import {
  getScoreFamily,
  type ScoreDefinition,
} from "./score-utils";

interface ScoreCardProps {
  definition: ScoreDefinition;
  score: number;
  subtitle: string;
}

export function ScoreCard({ definition, score, subtitle }: ScoreCardProps) {
  const family = getScoreFamily(score);

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
            className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-4 text-center shadow-[0_1px_3px_rgba(15,23,42,0.04),0_8px_20px_-12px_rgba(15,23,42,0.08)] transition-all duration-200 hover:border-slate-300 hover:shadow-[0_2px_6px_rgba(15,23,42,0.06),0_14px_28px_-12px_rgba(15,23,42,0.12)] hover:-translate-y-0.5 hover:cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
          >
            <ScoreRing score={score} size={64} label={definition.label} />
            <span className="text-[13px] font-medium text-slate-900 mt-1">
              {definition.label}
            </span>
            <span className="text-[11px] text-slate-500 leading-tight">
              {subtitle}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[240px] text-xs">
          {definition.tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}