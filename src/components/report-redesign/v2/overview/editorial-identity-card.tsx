/**
 * Editorial Identity Card — single cohesive 2-band overview card.
 *
 * Band 1: Editorial Portrait (sentence + territory chips + global ring)
 * Band 2: Action Summary (principal ponto forte + principal ponto fraco)
 */
import { cn } from "@/lib/utils";
import { ScoreRing } from "./score-ring";
import {
  getScoreFamily,
  SCORE_COLORS,
  computeGlobalScore,
  type ScoreKey,
  type ScoreFamily,
} from "./score-utils";
import type { SummaryCardData } from "./diagnostic-summary";
import { CheckCircle2, AlertCircle } from "lucide-react";

/* ── Types ─────────────────────────────────────────────────────────── */

interface EditorialIdentityCardProps {
  scores: Record<ScoreKey, { value: number; subtitle: string }>;
  diagnosticCards: SummaryCardData[];
  /** AI hero insight text, if available */
  aiHeroText?: string | null;
}

/* ── Fallback editorial sentence (deterministic) ───────────────────── */

function buildFallbackSentence(
  scores: Record<ScoreKey, { value: number; subtitle: string }>,
): string {
  const eng = scores.envolvimento.value;
  const freq = scores.frequencia.value;
  const inter = scores.interaccao.value;

  if (freq >= 60 && inter < 40) {
    return "Perfil consistente, mas ainda com pouca conversa pública.";
  }
  if (eng >= 60 && freq < 40) {
    return "Conteúdo com resposta, mas publicado com pouca cadência.";
  }
  if (eng < 40 && inter < 40) {
    return "Perfil visível, mas ainda com baixa reação pública.";
  }
  return "Perfil com sinais editoriais claros e margem para crescer.";
}

/* ── Strength / Weakness derivation ────────────────────────────────── */

const SCORE_LABELS: Record<ScoreKey, string> = {
  envolvimento: "Envolvimento",
  frequencia: "Cadência editorial",
  interaccao: "Conversa pública",
};

function deriveStrengthWeakness(
  scores: Record<ScoreKey, { value: number; subtitle: string }>,
): { strength: string; weakness: string } {
  const entries = (Object.keys(scores) as ScoreKey[]).map((k) => ({
    key: k,
    value: scores[k].value,
  }));
  entries.sort((a, b) => b.value - a.value);
  return {
    strength: SCORE_LABELS[entries[0].key],
    weakness: SCORE_LABELS[entries[entries.length - 1].key],
  };
}

/* ── Global score label ────────────────────────────────────────────── */

const GLOBAL_LABEL: Record<ScoreFamily, string> = {
  danger: "Crítico",
  warning: "A melhorar",
  success: "Forte",
};

const FAMILY_CHIP: Record<ScoreFamily, string> = {
  danger: "bg-rose-50 text-rose-700",
  warning: "bg-amber-50 text-amber-700",
  success: "bg-emerald-50 text-emerald-700",
};

const FAMILY_DOT: Record<ScoreFamily, string> = {
  danger: "bg-rose-500",
  warning: "bg-amber-500",
  success: "bg-emerald-500",
};

/* ── Main Component ────────────────────────────────────────────────── */

export function EditorialIdentityCard({
  scores,
  diagnosticCards,
  aiHeroText,
}: EditorialIdentityCardProps) {
  const globalScore = computeGlobalScore(
    scores.envolvimento.value,
    scores.frequencia.value,
    scores.interaccao.value,
  );
  const globalFamily = getScoreFamily(globalScore);

  const sentence = aiHeroText || buildFallbackSentence(scores);
  const isAi = !!aiHeroText;

  const { strength, weakness } = deriveStrengthWeakness(scores);

  // Territory chips from diagnostic cards
  const chips = diagnosticCards.map((c) => c.headline).filter(Boolean);

  return (
    <article
      aria-label={`Identidade editorial: pontuação global ${globalScore} de 100`}
      className="rounded-2xl border border-border-default bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.06)] overflow-hidden"
    >
      {/* ═══ BAND 1 — Editorial Portrait ═══ */}
      <div
        className="relative px-5 py-6 sm:px-7 sm:py-7 md:px-8 md:py-8"
        style={{
          background:
            "linear-gradient(135deg, rgba(219,234,254,0.35) 0%, rgba(221,214,254,0.22) 50%, rgba(209,250,229,0.18) 100%)",
        }}
      >
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-8">
          {/* Left — text */}
          <div className="flex-1 min-w-0 text-center sm:text-left">
            <div className="flex items-center gap-2 justify-center sm:justify-start mb-3">
              <span className="text-eyebrow-sm text-content-secondary">
                Retrato editorial
              </span>
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5",
                  "text-[9px] font-bold uppercase tracking-widest",
                  isAi
                    ? "bg-violet-100 text-violet-700"
                    : "bg-slate-100 text-slate-500",
                )}
              >
                {isAi ? "IA" : "Auto"}
              </span>
            </div>

            <p className="font-display text-xl sm:text-[1.35rem] md:text-[1.5rem] font-semibold leading-snug tracking-tight text-content-primary max-w-xl">
              {sentence}
            </p>

            {/* Territory chips */}
            {chips.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4 justify-center sm:justify-start">
                {chips.map((chip) => (
                  <span
                    key={chip}
                    className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium bg-white/80 text-content-secondary ring-1 ring-border-default/40 backdrop-blur-sm shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Right — global score ring */}
          <div className="flex flex-col items-center shrink-0">
            <ScoreRing score={globalScore} size={100} label="Pontuação global" />
            <span className="mt-1 text-[11px] font-sans text-content-secondary/60">
              de 100
            </span>
            <span
              className={cn(
                "mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1",
                "text-[11px] font-semibold tracking-wide uppercase",
                FAMILY_CHIP[globalFamily],
              )}
            >
              <span
                aria-hidden="true"
                className={cn("size-1.5 rounded-full shrink-0", FAMILY_DOT[globalFamily])}
              />
              {GLOBAL_LABEL[globalFamily]}
            </span>
          </div>
        </div>
      </div>

      {/* ═══ BAND 2 — Action Summary ═══ */}
      <div className="border-t border-border-default bg-slate-50/60">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center">
          {/* Strength */}
          <div className="flex items-center gap-3 px-5 py-4 sm:flex-1 border-b sm:border-b-0 sm:border-r border-border-subtle">
            <span className="flex items-center justify-center size-9 rounded-full bg-emerald-50 shrink-0">
              <CheckCircle2 className="size-4 text-emerald-600" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <span className="text-eyebrow-sm text-emerald-600 block">Principal ponto forte</span>
              <span className="text-sm font-medium text-content-primary">{strength}</span>
            </div>
          </div>

          {/* Weakness */}
          <div className="flex items-center gap-3 px-5 py-4 sm:flex-1">
            <span className="flex items-center justify-center size-9 rounded-full bg-rose-50 shrink-0">
              <AlertCircle className="size-4 text-rose-600" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <span className="text-eyebrow-sm text-rose-600 block">Principal ponto fraco</span>
              <span className="text-sm font-medium text-content-primary">{weakness}</span>
            </div>
          </div>

        </div>
      </div>
    </article>
  );
}
