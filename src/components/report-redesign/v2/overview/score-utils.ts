/**
 * Pure score calculation utilities for the 4 overview scorecards.
 * Each function returns a 0–100 integer score.
 */

export type ScoreKey = "envolvimento" | "frequencia" | "interaccao" | "mensagem";
export type ScoreFamily = "danger" | "warning" | "success";

export function getScoreFamily(score: number): ScoreFamily {
  if (score >= 90) return "success";
  if (score >= 50) return "warning";
  return "danger";
}

/** Score ring colors per family */
export const SCORE_COLORS: Record<ScoreFamily, { bg: string; stroke: string; text: string; tintBg: string; glow: string }> = {
  danger:  { bg: "rgba(163,45,45,0.15)", stroke: "#A32D2D", text: "#A32D2D", tintBg: "rgba(244,63,94,0.05)", glow: "drop-shadow(0 0 6px rgba(163,45,45,0.35))" },
  warning: { bg: "rgba(133,79,11,0.20)", stroke: "#854F0B", text: "#854F0B", tintBg: "rgba(245,158,11,0.06)", glow: "none" },
  success: { bg: "rgba(15,110,86,0.15)", stroke: "#0F6E56", text: "#0F6E56", tintBg: "rgba(16,185,129,0.05)", glow: "drop-shadow(0 0 6px rgba(15,110,86,0.3))" },
};

// ─── Score 1: Envolvimento ──────────────────────────────────────────

export function computeEnvolvimento(engagementRate: number, tierBenchmark: number): number {
  if (tierBenchmark <= 0) return 0;
  return Math.min(100, Math.round((engagementRate / tierBenchmark) * 100));
}

export function envolvimentoSubtitle(engagementRate: number, tierBenchmark: number): string {
  if (tierBenchmark <= 0) return "sem referência";
  const er = engagementRate.toFixed(2).replace(".", ",");
  const bm = tierBenchmark.toFixed(2).replace(".", ",");
  return `${er}% vs ${bm}%`;
}

// ─── Score 2: Frequência ────────────────────────────────────────────

export function computeFrequencia(postsPerWeek: number): number {
  const ppw = postsPerWeek;
  if (ppw >= 3 && ppw <= 5) {
    return Math.round(90 + (5 - Math.abs(4 - ppw)) * 2);
  }
  if ((ppw >= 1 && ppw < 3) || (ppw > 5 && ppw <= 7)) {
    // Linear interpolation between 50 and 90
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

// ─── Score 3: Interacção ────────────────────────────────────────────

export function computeInteraccao(
  avgComments: number,
  postCount: number,
  tierCommentRate: number,
  brandResponseRate: number,
): number {
  const a = tierCommentRate > 0
    ? Math.min(50, ((avgComments / Math.max(postCount, 1)) / tierCommentRate) * 50)
    : 25;
  const b = (Math.min(brandResponseRate, 100) * 0.5);
  return Math.round(a + b);
}

export function interaccaoSubtitle(avgComments: number): string {
  if (avgComments <= 0) return "0 coment. médios";
  return `${avgComments.toFixed(1).replace(".", ",")} coment./post`;
}

// ─── Score 4: Mensagem ──────────────────────────────────────────────

export function computeMensagem(
  dispersaoIndex: number | null,
  funilMax: number | null,
  ctaPercentage: number | null,
): number {
  if (dispersaoIndex == null && funilMax == null && ctaPercentage == null) {
    return 50; // fallback neutro
  }
  const foco = dispersaoIndex != null ? (100 - dispersaoIndex) : 50;
  const clareza = funilMax != null ? (100 - Math.abs(funilMax - 50) * 2) : 50;
  const cta = ctaPercentage ?? 50;
  return Math.round((foco + clareza + cta) / 3);
}

export function mensagemSubtitle(score: number): string {
  if (score >= 75) return "foco claro";
  if (score >= 40) return "padrão misto";
  return "topo do funil";
}

// ─── Score metadata ─────────────────────────────────────────────────

export interface ScoreDefinition {
  key: ScoreKey;
  label: string;
  /** Block ID for scroll target */
  blockId: string;
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
    label: "Envolvimento",
    blockId: "performance",
    ariaLabel: (s, f) => `Score Envolvimento: ${s} em 100, ${FAMILY_PT[f]}. Clicar para ir para Performance.`,
    tooltip: "Compara a taxa de envolvimento com a referência de mercado do escalão.",
  },
  {
    key: "frequencia",
    label: "Frequência",
    blockId: "performance",
    ariaLabel: (s, f) => `Score Frequência: ${s} em 100, ${FAMILY_PT[f]}. Clicar para ir para Performance.`,
    tooltip: "Avalia o ritmo de publicação face ao ideal de 3-5 publicações por semana.",
  },
  {
    key: "interaccao",
    label: "Interacção",
    blockId: "diagnostico",
    ariaLabel: (s, f) => `Score Interacção: ${s} em 100, ${FAMILY_PT[f]}. Clicar para ir para Diagnóstico.`,
    tooltip: "Mede o volume de comentários e a taxa de resposta do perfil.",
  },
  {
    key: "mensagem",
    label: "Mensagem",
    blockId: "diagnostico",
    ariaLabel: (s, f) => `Score Mensagem: ${s} em 100, ${FAMILY_PT[f]}. Clicar para ir para Diagnóstico.`,
    tooltip: "Avalia a clareza temática, equilíbrio do funil e presença de CTAs.",
  },
] as const;