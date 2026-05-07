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
import { TrendingUp, AlertCircle } from "lucide-react";

/* ── Types ─────────────────────────────────────────────────────────── */

interface EditorialIdentityCardProps {
  scores: Record<ScoreKey, { value: number; subtitle: string }>;
  /** AI hero insight text, if available */
  aiHeroText?: string | null;
  /** Extra key metrics for richer subtitles */
  keyMetrics?: {
    engagementRate: number;
    engagementBenchmark: number;
    engagementDeltaPct: number;
  };
}

/* ── Fallback editorial sentence (deterministic) ───────────────────── */

interface FallbackResult {
  headline: string;
  description: string;
}

function buildFallbackSentence(
  scores: Record<ScoreKey, { value: number; subtitle: string }>,
): FallbackResult {
  const eng = scores.envolvimento.value;
  const freq = scores.frequencia.value;
  const inter = scores.interaccao.value;

  if (freq >= 60 && inter < 40) {
    return {
      headline: "Perfil com **cadência consistente** mas pouca conversa",
      description: "Frequência de publicação acima da média, mas a interação nos comentários está abaixo do esperado. Maior oportunidade: aumentar a conversa pública.",
    };
  }
  if (eng >= 60 && freq < 40) {
    return {
      headline: "Perfil com **bom engagement** mas cadência irregular",
      description: "O conteúdo gera resposta quando publicado, mas o ritmo de publicação está abaixo do ideal. Maior oportunidade: publicar com mais regularidade.",
    };
  }
  if (eng < 40 && inter < 40) {
    return {
      headline: "Perfil com **margem significativa** para crescer",
      description: "O engagement e a interação estão abaixo da referência do escalão. Existem oportunidades claras de melhoria no conteúdo e na conversa.",
    };
  }
  return {
    headline: "Perfil com **bom potencial** de crescimento",
    description: "Engagement acima do benchmark do tier, cadência de publicação consistente. Maior oportunidade: aumentar a conversa pública e diversificar formatos.",
  };
}

/* ── Strength / Weakness derivation ───────────────────────────────── */

const SCORE_LABELS: Record<ScoreKey, string> = {
  envolvimento: "Engagement",
  frequencia: "Cadência",
  interaccao: "Comentários",
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

/* ── Headline bold renderer ────────────────────────────────────────── */

/**
 * Renders a string with **bold** markdown segments as React nodes.
 * e.g. "Perfil com **bom potencial** de crescimento"
 */
function renderBoldText(text: string): React.ReactNode {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-bold text-content-primary">
        {part}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

/* ── Main Component ────────────────────────────────────────────────── */

export function EditorialIdentityCard({
  scores,
  aiHeroText,
  keyMetrics,
}: EditorialIdentityCardProps) {
  const globalScore = computeGlobalScore(
    scores.envolvimento.value,
    scores.frequencia.value,
    scores.interaccao.value,
  );
  const globalFamily = getScoreFamily(globalScore);

  const fallback = buildFallbackSentence(scores);
  // AI text: use as headline directly; fallback provides structured headline + description
  const headlineText = aiHeroText || fallback.headline;
  const descriptionText = aiHeroText ? null : fallback.description;

  const { strengthKey, weaknessKey } = deriveStrengthWeaknessKeys(scores);

  // Build richer subtitles for the mini-cards
  const strengthSubtitle = buildMiniCardSubtitle(strengthKey, scores, keyMetrics, "up");
  const weaknessSubtitle = buildMiniCardSubtitle(weaknessKey, scores, keyMetrics, "down");

  return (
    <article
      aria-label={`Identidade editorial: pontuação global ${globalScore} de 100`}
      className="rounded-2xl border border-border-default bg-white shadow-card overflow-hidden"
    >
      {/* ═══ BAND 1 — Editorial Portrait + Score ═══ */}
      <div className="px-5 py-6 sm:px-7 sm:py-7">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 sm:gap-8">
          {/* Left — editorial text */}
          <div className="flex-1 min-w-0 space-y-2.5">
            <p className="text-eyebrow-sm text-content-tertiary">Resumo executivo</p>

            <h2 className="font-display text-xl sm:text-2xl font-semibold leading-[1.3] tracking-[-0.015em] text-content-primary max-w-lg">
              {renderBoldText(headlineText)}
            </h2>

            {descriptionText && (
              <p className="text-sm leading-relaxed text-content-secondary max-w-lg">
                {renderBoldText(descriptionText)}
              </p>
            )}
          </div>

          {/* Right — score ring module */}
          <div className="flex flex-col items-center shrink-0 gap-1.5">
            <ScoreRing score={globalScore} size={110} label="Pontuação global" />

            <span className="text-xs font-medium text-content-tertiary tabular-nums leading-none mt-px">
              / 100
            </span>

            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 mt-1",
                "text-[11px] font-semibold tracking-wide uppercase leading-none",
                FAMILY_CHIP[globalFamily],
              )}
            >
              <span
                aria-hidden="true"
                className={cn("size-1.5 rounded-full shrink-0", FAMILY_DOT[globalFamily])}
              />
              {GLOBAL_LABEL[globalFamily]}
            </span>

            <span className="text-[11px] text-content-tertiary leading-none mt-1">
              Pontuação InstaBench
            </span>
          </div>
        </div>
      </div>

      {/* ═══ BAND 2 — Insight Cards ═══ */}
      <div className="border-t border-border-default px-5 py-4 sm:px-7 sm:py-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Strength mini-card */}
          <div className="flex items-start gap-3 rounded-xl bg-emerald-50/50 border border-emerald-100/60 border-l-[3px] border-l-emerald-400 px-4 py-3.5">
            <span className="flex items-center justify-center size-8 rounded-full bg-emerald-100/70 shrink-0 mt-0.5">
              <TrendingUp className="size-4 text-emerald-500" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <span className="text-eyebrow-sm text-emerald-600 block">Ponto forte</span>
              <span className="text-sm font-semibold text-content-primary block leading-snug mt-0.5">{SCORE_LABELS[strengthKey]}</span>
              <span className="text-xs text-content-secondary block leading-relaxed mt-1">{strengthSubtitle}</span>
            </div>
          </div>

          {/* Weakness mini-card */}
          <div className="flex items-start gap-3 rounded-xl bg-rose-50/50 border border-rose-100/60 border-l-[3px] border-l-rose-400 px-4 py-3.5">
            <span className="flex items-center justify-center size-8 rounded-full bg-rose-100/70 shrink-0 mt-0.5">
              <AlertCircle className="size-4 text-rose-400" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <span className="text-eyebrow-sm text-rose-500 block">A melhorar</span>
              <span className="text-sm font-semibold text-content-primary block leading-snug mt-0.5">{SCORE_LABELS[weaknessKey]}</span>
              <span className="text-xs text-content-secondary block leading-relaxed mt-1">{weaknessSubtitle}</span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

/* ── Mini-card subtitle builder ────────────────────────────────────── */

function buildMiniCardSubtitle(
  key: ScoreKey,
  scores: Record<ScoreKey, { value: number; subtitle: string }>,
  keyMetrics: EditorialIdentityCardProps["keyMetrics"],
  direction: "up" | "down",
): string {
  const arrow = direction === "up" ? "↗" : "↘";
  const s = scores[key];

  if (key === "envolvimento" && keyMetrics) {
    const er = keyMetrics.engagementRate.toFixed(2).replace(".", ",") + "%";
    const diff = keyMetrics.engagementBenchmark > 0
      ? Math.round(((keyMetrics.engagementRate - keyMetrics.engagementBenchmark) / keyMetrics.engagementBenchmark) * 100)
      : 0;
    const sign = diff >= 0 ? "+" : "";
    return `${arrow} ${er} · ${sign}${diff}% vs benchmark`;
  }

  if (key === "interaccao") {
    // Use the subtitle from score-utils which already has the value
    const base = s.subtitle;
    return `${arrow} ${base} · ${direction === "up" ? "acima" : "abaixo"} da média`;
  }

  // frequencia
  return `${arrow} ${s.subtitle}`;
}
