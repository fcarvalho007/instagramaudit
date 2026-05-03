import { ScoreCard } from "./score-card";
import {
  SCORE_DEFINITIONS,
  SCORE_COLORS,
  type ScoreKey,
} from "./score-utils";

interface ScoreGridProps {
  scores: Record<ScoreKey, { value: number; subtitle: string }>;
}

export function ScoreGrid({ scores }: ScoreGridProps) {
  return (
    <div className="space-y-3">
      {/* Section label */}
      <span className="text-eyebrow-sm text-slate-500">
        PONTUAÇÃO GLOBAL
      </span>

      {/* 4-column grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {SCORE_DEFINITIONS.map((def) => (
          <ScoreCard
            key={def.key}
            definition={def}
            score={scores[def.key].value}
            subtitle={scores[def.key].subtitle}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 pt-1.5">
        <LegendItem color={SCORE_COLORS.danger.stroke} label="0–49 crítico" />
        <LegendItem color={SCORE_COLORS.warning.stroke} label="50–89 a melhorar" />
        <LegendItem color={SCORE_COLORS.success.stroke} label="90–100 forte" />
      </div>
      <div className="border-b border-slate-100 mt-2" aria-hidden="true" />
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] text-slate-500">
      <span
        className="size-2 rounded-full shrink-0"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}