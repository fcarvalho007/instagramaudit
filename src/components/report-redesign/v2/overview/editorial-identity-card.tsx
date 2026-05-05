/**
 * Editorial Identity Card — single cohesive 2-band overview card.
 *
 * Band 1: Editorial Portrait (hero sentence + global ring)
 * Band 2: Action Summary (principal ponto forte + principal ponto fraco)
 */
import { cn } from "@/lib/utils";
import { ScoreRing } from "./score-ring";
import { ScoreOrbitBackground } from "./score-orbit-background";
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

/* ── Strength / Weakness derivation ────────────────────────────────── */

const SCORE_LABELS: Record<ScoreKey, string> = {
  envolvimento: "Engagement",
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
  aiHeroText,
}: EditorialIdentityCardProps) {
  const globalScore = computeGlobalScore(
    scores.envolvimento.value,
    scores.frequencia.value,
    scores.interaccao.value,
  );
  const globalFamily = getScoreFamily(globalScore);

  const sentence = aiHeroText || buildFallbackSentence(scores);

  const { strength, weakness } = deriveStrengthWeakness(scores);

  return (
    <article
      aria-label={`Identidade editorial: pontuação global ${globalScore} de 100`}
      className="rounded-2xl border border-border-default bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.06)] overflow-hidden"
    >
      {/* ═══ BAND 1 — Editorial Portrait ═══ */}
      <div
        className="relative px-4 py-5 sm:px-7 sm:py-7 md:px-8 md:py-8"
        style={{
          background:
            "linear-gradient(135deg, rgba(219,234,254,0.35) 0%, rgba(221,214,254,0.22) 50%, rgba(209,250,229,0.18) 100%)",
        }}
      >
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-8">
          {/* Left — text */}
          <div className="flex-1 min-w-0 text-center sm:text-left overflow-hidden">
            <p className="font-display text-[1.2rem] sm:text-[1.5rem] md:text-[1.65rem] font-semibold leading-snug tracking-tight text-content-primary max-w-xl break-words">
              {sentence}
            </p>
          </div>

          {/* Right — global score ring */}
          <div className="relative flex flex-col items-center shrink-0">
            <ScoreOrbitBackground family={globalFamily} />
            <div className="relative z-10 flex flex-col items-center">
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
      </div>

      {/* ═══ BAND 2 — Action Summary ═══ */}
      <div className="border-t border-border-default bg-slate-50/60">
        <div className="flex flex-col sm:flex-row items-stretch">
          {/* Strength */}
          <div className="flex items-center gap-3 px-4 py-4 sm:px-6 sm:py-5 sm:flex-1 border-b sm:border-b-0 sm:border-r border-border-subtle">
            <span className="flex items-center justify-center size-8 sm:size-10 rounded-full bg-emerald-50 shrink-0">
              <CheckCircle2 className="size-4 sm:size-[18px] text-emerald-600" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <span className="text-eyebrow-sm text-emerald-600 block mb-0.5">Principal ponto forte</span>
              <span className="text-[14px] sm:text-[15px] font-semibold text-content-primary">{strength}</span>
            </div>
          </div>

          {/* Weakness */}
          <div className="flex items-center gap-3 px-4 py-4 sm:px-6 sm:py-5 sm:flex-1">
            <span className="flex items-center justify-center size-8 sm:size-10 rounded-full bg-rose-50 shrink-0">
              <AlertCircle className="size-4 sm:size-[18px] text-rose-600" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <span className="text-eyebrow-sm text-rose-600 block mb-0.5">Principal ponto fraco</span>
              <span className="text-[14px] sm:text-[15px] font-semibold text-content-primary">{weakness}</span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
