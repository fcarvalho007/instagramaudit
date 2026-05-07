/**
 * Editorial Identity Card — Executive Summary / Diagnosis
 *
 * Compact premium layout (Iconosquare-inspired):
 *   Band 1: Editorial headline (left) + score ring module (right)
 *   Band 2: Two insight mini-cards (strength + improvement)
 *
 * Uses existing score data and props — no logic changes.
 */
import { cn } from "@/lib/utils";
import { ScoreRing } from "./score-ring";
import {
  getScoreFamily,
  computeGlobalScore,
  type ScoreKey,
  type ScoreFamily,
} from "./score-utils";
import { CheckCircle2, AlertCircle } from "lucide-react";

/* ── Types ─────────────────────────────────────────────────────────── */

interface EditorialIdentityCardProps {
  scores: Record<ScoreKey, { value: number; subtitle: string }>;
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

/* ── Strength / Weakness derivation ───────────────────────────────── */

const SCORE_LABELS: Record<ScoreKey, string> = {
  envolvimento: "Engagement",
  frequencia: "Cadência editorial",
  interaccao: "Conversa pública",
};

function deriveStrengthWeaknessKeys(
  scores: Record<ScoreKey, { value: number; subtitle: string }>,
): { strengthKey: ScoreKey; weaknessKey: ScoreKey } {
  const entries = (Object.keys(scores) as ScoreKey[]).map((k) => ({
    key: k,
    value: scores[k].value,
  }));
  entries.sort((a, b) => b.value - a.value);
  return {
    strengthKey: entries[0].key,
    weaknessKey: entries[entries.length - 1].key,
  };
}

/* ── Global score label ────────────────────────────────────────────── */

const GLOBAL_LABEL: Record<ScoreFamily, string> = {
  danger: "Crítico",
  warning: "A melhorar",
  success: "Forte",
};

const FAMILY_CHIP: Record<ScoreFamily, string> = {
  danger: "bg-rose-50 text-rose-600",
  warning: "bg-amber-50 text-amber-600",
  success: "bg-emerald-50 text-emerald-600",
};

const FAMILY_DOT: Record<ScoreFamily, string> = {
  danger: "bg-rose-400",
  warning: "bg-amber-400",
  success: "bg-emerald-400",
};

/* ── Sentence splitter ─────────────────────────────────────────────── */

function splitSentence(text: string): { headline: string; supporting: string | null } {
  const match = text.match(/^(.+?[.!?])\s+(.+)$/s);
  if (match) {
    return { headline: match[1], supporting: match[2] };
  }
  return { headline: text, supporting: null };
}

/* ── Main Component ────────────────────────────────────────────────── */

export function EditorialIdentityCard({
  scores,
  aiHeroText,
}: EditorialIdentityCardProps) {
  const globalScore = computeGlobalScore(
    scores.envolvimento.value,
    scores.frequencia.value,
    scores.interaccao.value,
  );
  const globalFamily = getScoreFamily(globalScore);

  const sentence = aiHeroText || buildFallbackSentence(scores);
  const { headline, supporting } = splitSentence(sentence);

  const { strengthKey, weaknessKey } = deriveStrengthWeaknessKeys(scores);

  return (
    <article
      aria-label={`Identidade editorial: pontuação global ${globalScore} de 100`}
      className="rounded-xl border border-border-default bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)] overflow-hidden"
    >
      {/* ═══ BAND 1 — Editorial Portrait + Score ═══ */}
      <div className="px-5 py-5 sm:px-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-center gap-5 sm:gap-6">
          {/* Left — editorial text */}
          <div className="flex-1 min-w-0 text-center sm:text-left space-y-1.5">
            <p className="text-eyebrow-sm text-accent-primary">Resumo executivo</p>

            <h2 className="font-display text-lg sm:text-xl font-semibold leading-[1.35] tracking-[-0.01em] text-content-primary max-w-md">
              {headline}
            </h2>

            {supporting && (
              <p className="text-[13px] leading-relaxed text-content-tertiary max-w-md">
                {supporting}
              </p>
            )}
          </div>

          {/* Right — score ring module */}
          <div className="flex flex-col items-center shrink-0 gap-1">
            <ScoreRing score={globalScore} size={88} label="Pontuação global" />

            <span className="text-xs font-medium text-content-tertiary tabular-nums leading-none">
              /100
            </span>

            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 mt-0.5",
                "text-xs font-semibold tracking-wide uppercase leading-none",
                FAMILY_CHIP[globalFamily],
              )}
            >
              <span
                aria-hidden="true"
                className={cn("size-1.5 rounded-full shrink-0", FAMILY_DOT[globalFamily])}
              />
              {GLOBAL_LABEL[globalFamily]}
            </span>

            <span className="text-xs text-content-tertiary leading-none mt-1">
              Pontuação InstaBench
            </span>
          </div>
        </div>
      </div>

      {/* ═══ BAND 2 — Insight Cards ═══ */}
      <div className="border-t border-border-default px-5 py-3.5 sm:px-6 sm:py-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Strength mini-card */}
          <div className="flex items-start gap-2.5 rounded-lg bg-emerald-50/50 border border-emerald-100/60 px-3.5 py-3">
            <span className="flex items-center justify-center size-7 rounded-full bg-emerald-100/70 shrink-0 mt-px">
              <CheckCircle2 className="size-3.5 text-emerald-500" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <span className="text-eyebrow-sm text-emerald-600 block">Ponto forte</span>
              <span className="text-sm font-semibold text-content-primary block leading-snug mt-px">{SCORE_LABELS[strengthKey]}</span>
              <span className="text-xs text-content-secondary block leading-relaxed mt-0.5">{scores[strengthKey].subtitle}</span>
            </div>
          </div>

          {/* Weakness mini-card */}
          <div className="flex items-start gap-2.5 rounded-lg bg-rose-50/50 border border-rose-100/60 px-3.5 py-3">
            <span className="flex items-center justify-center size-7 rounded-full bg-rose-100/70 shrink-0 mt-px">
              <AlertCircle className="size-3.5 text-rose-400" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <span className="text-eyebrow-sm text-rose-500 block">A melhorar</span>
              <span className="text-sm font-semibold text-content-primary block leading-snug mt-px">{SCORE_LABELS[weaknessKey]}</span>
              <span className="text-xs text-content-secondary block leading-relaxed mt-0.5">{scores[weaknessKey].subtitle}</span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
