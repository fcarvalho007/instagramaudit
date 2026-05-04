/**
 * Editorial Identity Card — single cohesive overview card replacing
 * the previous 6-card grid. Shows a global score ring, 3 sub-score
 * indicators, and an editorial identity headline derived from the
 * diagnostic classification.
 */
import { cn } from "@/lib/utils";
import { ScoreRing } from "./score-ring";
import {
  getScoreFamily,
  SCORE_COLORS,
  SCORE_DEFINITIONS,
  computeGlobalScore,
  type ScoreKey,
} from "./score-utils";
import type { SummaryCardData } from "./diagnostic-summary";
import { Sparkles, Layers, Compass } from "lucide-react";

/* ── Types ─────────────────────────────────────────────────────────── */

interface EditorialIdentityCardProps {
  scores: Record<ScoreKey, { value: number; subtitle: string }>;
  diagnosticCards: SummaryCardData[];
}

/* ── Component ─────────────────────────────────────────────────────── */

export function EditorialIdentityCard({
  scores,
  diagnosticCards,
}: EditorialIdentityCardProps) {
  const globalScore = computeGlobalScore(
    scores.envolvimento.value,
    scores.frequencia.value,
    scores.interaccao.value,
  );
  const globalFamily = getScoreFamily(globalScore);
  const globalLabel = GLOBAL_LABEL[globalFamily];

  // Build the editorial headline from diagnostic cards
  const headline = diagnosticCards
    .map((c) => c.headline)
    .filter(Boolean)
    .join(" · ");

  return (
    <article
      aria-label={`Identidade editorial: pontuação global ${globalScore} de 100, ${globalLabel}`}
      className={cn(
        "rounded-2xl border border-border-default bg-surface-secondary",
        "shadow-card overflow-hidden",
      )}
    >
      {/* Top row: global ring + editorial headline */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-7 p-5 sm:p-6 md:p-7">
        {/* Global score ring */}
        <div className="flex flex-col items-center shrink-0">
          <ScoreRing score={globalScore} size={110} label="Pontuação global" />
          <span
            className={cn(
              "mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1",
              "text-[11px] font-semibold tracking-wide uppercase",
              FAMILY_CHIP[globalFamily],
            )}
          >
            <span
              aria-hidden="true"
              className={cn("size-1.5 rounded-full shrink-0", FAMILY_DOT[globalFamily])}
            />
            {globalLabel}
          </span>
        </div>

        {/* Editorial identity */}
        <div className="flex-1 min-w-0 text-center sm:text-left">
          <p className="text-eyebrow-sm text-content-secondary mb-1.5">
            Identidade editorial
          </p>
          <h3 className="font-display text-lg sm:text-xl md:text-[1.35rem] font-semibold tracking-tight text-content-primary leading-snug">
            {headline || "A definir"}
          </h3>

          {/* Diagnostic detail chips */}
          <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
            {diagnosticCards.map((c) => (
              <DiagnosticChip key={c.label} card={c} />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom strip: 3 sub-scores */}
      <div className="border-t border-border-default bg-surface-primary/40">
        <div className="grid grid-cols-3 divide-x divide-border-default">
          {SCORE_DEFINITIONS.map((def) => {
            const s = scores[def.key];
            const family = getScoreFamily(s.value);
            const colors = SCORE_COLORS[family];
            return (
              <div
                key={def.key}
                className="flex flex-col items-center gap-1 py-4 px-2 sm:px-4"
              >
                <div className="flex items-center gap-2">
                  <ScoreRing score={s.value} size={36} label={def.label} />
                  <span
                    className="font-mono text-lg font-bold tabular-nums leading-none"
                    style={{ color: colors.text }}
                  >
                    {s.value}
                  </span>
                </div>
                <span className="text-[11px] sm:text-xs font-medium text-content-secondary text-center leading-tight">
                  {def.label}
                </span>
                <span className="text-[10px] text-content-secondary/70 tabular-nums text-center leading-tight">
                  {s.subtitle}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </article>
  );
}

/* ── Diagnostic chip ───────────────────────────────────────────────── */

const ICON_MAP: Record<string, typeof Sparkles> = {
  "Tipo de conteúdo": Sparkles,
  "Papel do conteúdo": Layers,
  "Objetivo deste perfil": Compass,
};

const TONE_CHIP: Record<string, string> = {
  blue: "bg-blue-50 text-blue-700 ring-1 ring-blue-100",
  emerald: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
  violet: "bg-violet-50 text-violet-700 ring-1 ring-violet-100",
};

function DiagnosticChip({ card }: { card: SummaryCardData }) {
  const Icon = ICON_MAP[card.label] ?? Sparkles;
  const chipCls = TONE_CHIP[card.tone] ?? TONE_CHIP.blue;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1",
        "text-[11px] font-medium",
        chipCls,
      )}
    >
      <Icon className="size-3 shrink-0" aria-hidden="true" />
      <span className="truncate max-w-[140px] sm:max-w-[180px]">{card.headline}</span>
    </span>
  );
}

/* ── Lookups ───────────────────────────────────────────────────────── */

const GLOBAL_LABEL: Record<string, string> = {
  danger: "Crítico",
  warning: "A melhorar",
  success: "Forte",
};

const FAMILY_CHIP: Record<string, string> = {
  danger: "bg-rose-50 text-rose-700",
  warning: "bg-amber-50 text-amber-700",
  success: "bg-emerald-50 text-emerald-700",
};

const FAMILY_DOT: Record<string, string> = {
  danger: "bg-rose-500",
  warning: "bg-amber-500",
  success: "bg-emerald-500",
};