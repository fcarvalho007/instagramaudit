import { ScoreCard } from "./score-card";
import {
  SCORE_DEFINITIONS,
  type ScoreKey,
} from "./score-utils";

interface ScoreGridProps {
  scores: Record<ScoreKey, { value: number; subtitle: string }>;
}

export function ScoreGrid({ scores }: ScoreGridProps) {
  return (
    <div className="space-y-2.5">
      {/* Section label */}
      <span className="text-eyebrow-sm text-[11px] text-slate-500 tracking-[0.06em]">
        PONTUAÇÃO GLOBAL
      </span>

      {/* 4-column grid */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
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
      <div className="flex items-center justify-center gap-3 pt-1">
        <LegendItem color="#A32D2D" label="0–49 crítico" />
        <LegendItem color="#854F0B" label="50–89 a melhorar" />
        <LegendItem color="#0F6E56" label="90–100 forte" />
      </div>
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