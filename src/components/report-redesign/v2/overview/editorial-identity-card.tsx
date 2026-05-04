/**
 * Editorial Identity Card — single cohesive 3-band overview card.
 *
 * Band 1: Editorial Portrait (sentence + territory chips + global ring)
 * Band 2: Score Grid (4 columns: engagement, frequency, interaction, message)
 * Band 3: Action Summary (strength, weakness, CTA)
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
import { CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";

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

/* ── Score explanation (human-readable) ────────────────────────────── */

function engagementExplanation(score: number): string {
  if (score >= 80) return "Boa reação do público";
  if (score >= 50) return "Reação moderada";
  if (score >= 25) return "Pouca reação";
  return "Quase ninguém reage";
}

function frequencyExplanation(score: number): string {
  if (score >= 80) return "Publica regularmente";
  if (score >= 50) return "Cadência razoável";
  if (score >= 25) return "Publica pouco";
  return "Quase sem publicações";
}

function interactionExplanation(score: number): string {
  if (score >= 80) return "Conversa ativa";
  if (score >= 50) return "Alguma conversa";
  if (score >= 25) return "Pouca conversa";
  return "Ninguém comenta";
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

/* ── Score column config ───────────────────────────────────────────── */

interface ScoreColumnDef {
  key: ScoreKey | "mensagem";
  label: string;
  explanation: (score: number) => string;
}

const SCORE_COLUMNS: ScoreColumnDef[] = [
  { key: "envolvimento", label: "Taxa de Engagement", explanation: engagementExplanation },
  { key: "frequencia", label: "Frequência de Posts", explanation: frequencyExplanation },
  { key: "interaccao", label: "Interação nos Posts", explanation: interactionExplanation },
  { key: "mensagem", label: "Clareza da Mensagem", explanation: () => "Derivado do diagnóstico" },
];

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

      {/* ═══ BAND 2 — Score Grid ═══ */}
      <div className="border-t border-border-default bg-slate-50/40">
        <div className="grid grid-cols-2 md:grid-cols-4">
          {SCORE_COLUMNS.map((col, idx) => {
            const isMensagem = col.key === "mensagem";
            const scoreVal = isMensagem ? null : scores[col.key as ScoreKey].value;
            const subtitle = isMensagem ? null : scores[col.key as ScoreKey].subtitle;
            const family = scoreVal !== null ? getScoreFamily(scoreVal) : null;
            const colors = family ? SCORE_COLORS[family] : null;
            const explanation = scoreVal !== null
              ? col.explanation(scoreVal)
              : diagnosticCards[2]?.headline ?? "\u2014";

            // Border logic: right border on all except last in row
            const hasRightBorder = idx < 3;
            const hideRightBorderMobile = idx === 1; // 2nd col in mobile 2-col has no right border
            const hasTopBorder = idx >= 2; // bottom row on mobile

            return (
              <div
                key={col.key}
                className={cn(
                  "flex flex-col gap-1.5 px-4 py-4 sm:px-5 sm:py-5",
                  hasRightBorder && "md:border-r md:border-border-subtle",
                  idx % 2 === 0 && "border-r border-border-subtle",
                  hideRightBorderMobile && "border-r-0",
                  hasTopBorder && "border-t border-border-subtle md:border-t-0",
                  isMensagem && "bg-surface-muted/30",
                )}
              >
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <span className="text-eyebrow-sm text-content-secondary">
                    {col.label}
                  </span>
                  {colors ? (
                    <span
                      aria-hidden="true"
                      className="size-2 rounded-full shrink-0"
                      style={{ backgroundColor: colors.stroke }}
                    />
                  ) : isMensagem ? (
                    <span
                      aria-hidden="true"
                      className="size-2 rounded-full shrink-0 bg-content-tertiary/30"
                    />
                  ) : null}
                </div>

                {/* Score number */}
                {scoreVal !== null ? (
                  <div className="flex items-baseline gap-1">
                    <span
                      className="font-mono text-[1.75rem] sm:text-[2rem] font-bold tabular-nums leading-none tracking-tight"
                      style={{ color: colors?.text }}
                    >
                      {scoreVal}
                    </span>
                    <span className="text-xs text-content-secondary/50 font-medium font-sans">
                      /100
                    </span>
                  </div>
                ) : (
                  <span className="font-display text-[0.95rem] sm:text-base font-semibold text-content-primary leading-tight italic">
                    {explanation}
                  </span>
                )}

                {/* Explanation */}
                {scoreVal !== null && (
                  <span className="text-[12px] sm:text-[13px] font-medium text-content-primary leading-snug">
                    {explanation}
                  </span>
                )}

                {/* Technical line */}
                {subtitle && (
                  <span className="text-[11px] text-content-secondary font-mono tabular-nums leading-tight">
                    {subtitle}
                  </span>
                )}

                {/* Mensagem fallback subtitle */}
                {isMensagem && diagnosticCards[2] && (
                  <span className="text-[11px] text-content-secondary leading-relaxed">
                    {diagnosticCards[2].subtitle}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══ BAND 3 — Action Summary ═══ */}
      <div className="border-t border-border-default bg-slate-50/60">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center">
          {/* Strength */}
          <div className="flex items-center gap-3 px-5 py-4 sm:flex-1 border-b sm:border-b-0 sm:border-r border-border-subtle">
            <span className="flex items-center justify-center size-9 rounded-full bg-emerald-50 shrink-0">
              <CheckCircle2 className="size-4 text-emerald-600" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <span className="text-eyebrow-sm text-emerald-600 block">Ponto forte</span>
              <span className="text-sm font-medium text-content-primary">{strength}</span>
            </div>
          </div>

          {/* Weakness */}
          <div className="flex items-center gap-3 px-5 py-4 sm:flex-1 border-b sm:border-b-0 sm:border-r border-border-subtle">
            <span className="flex items-center justify-center size-9 rounded-full bg-rose-50 shrink-0">
              <AlertCircle className="size-4 text-rose-600" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <span className="text-eyebrow-sm text-rose-600 block">Ponto fraco</span>
              <span className="text-sm font-medium text-content-primary">{weakness}</span>
            </div>
          </div>

          {/* CTA */}
          <div className="flex items-center justify-center px-5 py-4 sm:flex-1">
            <a
              href="#diagnostico"
              className={cn(
                "inline-flex items-center gap-2 rounded-full",
                "border-2 border-accent-primary text-accent-primary bg-transparent",
                "px-5 py-2.5 text-sm font-semibold",
                "transition-all duration-200 hover:bg-accent-primary hover:text-white",
                "min-h-[44px] w-full sm:w-auto justify-center",
              )}
            >
              Ver diagnóstico completo
              <ArrowRight className="size-4" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
