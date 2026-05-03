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
            className="flex flex-col items-center gap-1.5 rounded-lg border border-slate-200/60 bg-white px-2 py-3.5 text-center transition-colors hover:border-slate-300 hover:cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
          >
            <ScoreRing score={score} label={definition.label} />
            <span className="text-xs font-medium text-slate-900 mt-1.5">
              {definition.label}
            </span>
            <span className="text-[10px] text-slate-500 leading-tight">
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