/**
 * Pure score calculation utilities for the 3 overview scorecards.
 * Each function returns a 0–100 integer score.
 */

export type ScoreKey = "envolvimento" | "frequencia";
export type ScoreFamily = "danger" | "warning" | "success";

export function getScoreFamily(score: number): ScoreFamily {
  if (score >= 90) return "success";
  if (score >= 50) return "warning";
  return "danger";
}

/** Score ring colors per family */
export const SCORE_COLORS: Record<ScoreFamily, { bg: string; stroke: string; text: string; tintBg: string }> = {
  danger:  { bg: "rgba(163,45,45,0.15)", stroke: "#A32D2D", text: "#A32D2D", tintBg: "rgba(244,63,94,0.05)" },
  warning: { bg: "rgba(133,79,11,0.20)", stroke: "#854F0B", text: "#854F0B", tintBg: "rgba(245,158,11,0.06)" },
  success: { bg: "rgba(15,110,86,0.15)", stroke: "#0F6E56", text: "#0F6E56", tintBg: "rgba(16,185,129,0.05)" },
};

// ─── Score 1: Taxa de Engagement ────────────────────────────────────

export function computeEnvolvimento(engagementRate: number, tierBenchmark: number): number {
  if (tierBenchmark <= 0) return 0;
  return Math.min(100, Math.round((engagementRate / tierBenchmark) * 100));
}

export function envolvimentoSubtitle(engagementRate: number, tierBenchmark: number): string {
  if (tierBenchmark <= 0) return "sem referência";
  const er = engagementRate.toFixed(2).replace(".", ",") + "%";
  const diff = tierBenchmark > 0
    ? Math.round(((engagementRate - tierBenchmark) / tierBenchmark) * 100)
    : 0;
  if (diff >= 0) {
    return `↗ ${er} · +${diff}% vs benchmark`;
  }
  return `↘ ${er} · ${diff}% vs benchmark`;
}

// ─── Score 2: Frequência de Posts ───────────────────────────────────

export function computeFrequencia(postsPerWeek: number): number {
  const ppw = postsPerWeek;
  if (ppw >= 3 && ppw <= 5) {
    return Math.round(90 + (5 - Math.abs(4 - ppw)) * 2);
  }
  if ((ppw >= 1 && ppw < 3) || (ppw > 5 && ppw <= 7)) {
    if (ppw < 3) {
      return Math.round(50 + ((ppw - 1) / 2) * 40);
    }
    return Math.round(50 + ((7 - ppw) / 2) * 40);
  }
  return Math.max(20, Math.round(100 - Math.abs(4 - ppw) * 15));
}

export function frequenciaSubtitle(postsPerWeek: number): string {
  const ppw = postsPerWeek.toFixed(1).replace(".", ",");
  const label = postsPerWeek >= 3 && postsPerWeek <= 5 ? "acima" :
                postsPerWeek >= 1 ? "abaixo" : "muito abaixo";
  return `${ppw}/sem · ${label}`;
}

// ─── Score 3: Interação nos Posts ───────────────────────────────────

// Removed: the previous `computeInteraccao` resolved to a constant ~25 in
// production because we never had a reliable `tierCommentRate` /
// `brandResponseRate` source. The global index now combines only the two
// sub-scores we can compute honestly (envolvimento + frequência).

// ─── Score metadata ─────────────────────────────────────────────────

export interface ScoreDefinition {
  key: ScoreKey;
  label: string;
  /** Accessibility label template */
  ariaLabel: (score: number, family: ScoreFamily) => string;
  /** Tooltip text */
  tooltip: string;
}

const FAMILY_PT: Record<ScoreFamily, string> = {
  danger: "crítico",
  warning: "a melhorar",
  success: "forte",
};

export const SCORE_DEFINITIONS: readonly ScoreDefinition[] = [
  {
    key: "envolvimento",
    label: "Taxa de Engagement",
    ariaLabel: (s, f) => `Taxa de Engagement: ${s} em 100, ${FAMILY_PT[f]}.`,
    tooltip: "Compara a taxa de envolvimento com a referência de mercado do escalão.",
  },
  {
    key: "frequencia",
    label: "Frequência de Posts",
    ariaLabel: (s, f) => `Frequência de Posts: ${s} em 100, ${FAMILY_PT[f]}.`,
    tooltip: "Avalia o ritmo de publicação face ao ideal de 3-5 publicações por semana.",
  },
] as const;

// ─── Global Score (weighted average) ────────────────────────────────

/**
 * Weighted average of the two sub-scores we can compute honestly.
 * Engagement carries the most weight as the primary health signal.
 * Cadence is the secondary editorial-rhythm signal.
 */
export function computeGlobalScore(
  envolvimento: number,
  frequencia: number,
): number {
  const w = { envolvimento: 0.6, frequencia: 0.4 };
  return Math.round(envolvimento * w.envolvimento + frequencia * w.frequencia);
}
