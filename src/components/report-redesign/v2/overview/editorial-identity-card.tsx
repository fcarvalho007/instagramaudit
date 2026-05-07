/**
 * Editorial Identity Card — single cohesive 2-band overview card.
 *
 * Band 1: Editorial Portrait (eyebrow + hero headline + supporting text + global ring)
 * Band 2: Action Summary (2 mini-cards: ponto forte + a melhorar)
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

/* ── Strength / Weakness derivation (returns key so we can get subtitle) ── */

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

/** Split a sentence into headline (first sentence) + supporting rest. */
function splitSentence(text: string): { headline: string; supporting: string | null } {
  // Split on first period/exclamation/question followed by a space
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
      className="rounded-2xl border border-border-default bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.06)] overflow-hidden"
    >
      {/* ═══ BAND 1 — Editorial Portrait ═══ */}
      <div
        className="relative px-5 py-6 sm:px-8 sm:py-8 md:px-10 md:py-9"
        style={{
          background:
            "linear-gradient(135deg, rgba(219,234,254,0.35) 0%, rgba(221,214,254,0.22) 50%, rgba(209,250,229,0.18) 100%)",
        }}
      >
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-10">
          {/* Left — editorial text */}
          <div className="flex-1 min-w-0 text-center sm:text-left overflow-hidden space-y-3">
            <p className="text-eyebrow text-accent-primary">Resumo executivo</p>
            <h2 className="font-display text-[1.35rem] sm:text-[1.65rem] md:text-[1.85rem] font-semibold leading-snug tracking-tight text-content-primary max-w-xl break-words">
              {headline}
            </h2>
            {supporting && (
              <p className="text-sm sm:text-base leading-relaxed text-content-secondary max-w-xl">
                {supporting}
              </p>
            )}
          </div>

          {/* Right — global score ring */}
          <div className="flex flex-col items-center shrink-0">
            <ScoreRing score={globalScore} size={110} label="Pontuação global" />
            <span className="mt-1.5 text-xs font-sans font-medium text-content-tertiary tabular-nums">
              /100
            </span>
            <span
              className={cn(
                "mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1",
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
            <span className="mt-1.5 text-xs font-sans text-content-tertiary">
              Pontuação InstaBench
            </span>
          </div>
        </div>
      </div>

      {/* ═══ BAND 2 — Action Summary ═══ */}
      <div className="border-t border-border-default bg-surface-muted px-5 py-5 sm:px-8 sm:py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {/* Strength mini-card */}
          <div className="flex items-start gap-3.5 rounded-xl bg-emerald-50/70 border border-emerald-100 px-5 py-4">
            <span className="flex items-center justify-center size-9 rounded-full bg-emerald-100 shrink-0 mt-0.5">
              <CheckCircle2 className="size-[18px] text-emerald-600" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <span className="text-eyebrow-sm text-emerald-600 block mb-1">Ponto forte</span>
              <span className="text-[15px] font-semibold text-content-primary block">{SCORE_LABELS[strengthKey]}</span>
              <span className="text-xs text-content-secondary mt-0.5 block">{scores[strengthKey].subtitle}</span>
            </div>
          </div>

          {/* Weakness mini-card */}
          <div className="flex items-start gap-3.5 rounded-xl bg-rose-50/70 border border-rose-100 px-5 py-4">
            <span className="flex items-center justify-center size-9 rounded-full bg-rose-100 shrink-0 mt-0.5">
              <AlertCircle className="size-[18px] text-rose-600" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <span className="text-eyebrow-sm text-rose-600 block mb-1">A melhorar</span>
              <span className="text-[15px] font-semibold text-content-primary block">{SCORE_LABELS[weaknessKey]}</span>
              <span className="text-xs text-content-secondary mt-0.5 block">{scores[weaknessKey].subtitle}</span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
