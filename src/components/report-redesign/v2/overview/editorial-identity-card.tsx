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
  danger: "bg-rose-50 text-rose-700",
  warning: "bg-amber-50 text-amber-700",
  success: "bg-emerald-50 text-emerald-700",
};

const FAMILY_DOT: Record<ScoreFamily, string> = {
  danger: "bg-rose-500",
  warning: "bg-amber-500",
  success: "bg-emerald-500",
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
      <div className="px-5 py-5 sm:px-6 sm:py-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-8">
          {/* Left — editorial text */}
          <div className="flex-1 min-w-0 text-center sm:text-left space-y-2">
            <p className="text-eyebrow-sm text-accent-primary">Resumo executivo</p>

            <h2 className="font-display text-xl sm:text-2xl font-semibold leading-snug tracking-tight text-content-primary max-w-lg">
              {headline}
            </h2>

            {supporting && (
              <p className="text-sm leading-relaxed text-content-secondary max-w-lg">
                {supporting}
              </p>
            )}
          </div>

          {/* Right — score ring module */}
          <div className="flex flex-col items-center shrink-0 gap-1.5">
            <ScoreRing score={globalScore} size={100} label="Pontuação global" />

            <span className="text-xs font-medium text-content-tertiary tabular-nums">
              /100
            </span>

            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5",
                "text-xs font-semibold tracking-wide uppercase",
                FAMILY_CHIP[globalFamily],
              )}
            >
              <span
                aria-hidden="true"
                className={cn("size-1.5 rounded-full shrink-0", FAMILY_DOT[globalFamily])}
              />
              {GLOBAL_LABEL[globalFamily]}
            </span>

            <span className="text-xs text-content-tertiary">
              Pontuação InstaBench
            </span>
          </div>
        </div>
      </div>

      {/* ═══ BAND 2 — Insight Cards ═══ */}
      <div className="border-t border-border-default px-5 py-4 sm:px-6 sm:py-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Strength mini-card */}
          <div className="flex items-start gap-3 rounded-lg bg-emerald-50/60 border border-emerald-100/80 px-4 py-3.5">
            <span className="flex items-center justify-center size-8 rounded-full bg-emerald-100 shrink-0 mt-0.5">
              <CheckCircle2 className="size-4 text-emerald-600" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <span className="text-eyebrow-sm text-emerald-600 block mb-0.5">Ponto forte</span>
              <span className="text-sm font-semibold text-content-primary block leading-snug">{SCORE_LABELS[strengthKey]}</span>
              <span className="text-xs text-content-secondary mt-0.5 block leading-relaxed">{scores[strengthKey].subtitle}</span>
            </div>
          </div>

          {/* Weakness mini-card */}
          <div className="flex items-start gap-3 rounded-lg bg-rose-50/60 border border-rose-100/80 px-4 py-3.5">
            <span className="flex items-center justify-center size-8 rounded-full bg-rose-100 shrink-0 mt-0.5">
              <AlertCircle className="size-4 text-rose-600" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <span className="text-eyebrow-sm text-rose-600 block mb-0.5">A melhorar</span>
              <span className="text-sm font-semibold text-content-primary block leading-snug">{SCORE_LABELS[weaknessKey]}</span>
              <span className="text-xs text-content-secondary mt-0.5 block leading-relaxed">{scores[weaknessKey].subtitle}</span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
