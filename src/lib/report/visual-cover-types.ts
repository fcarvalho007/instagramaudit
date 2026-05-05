/**
 * Visual Cover Analysis — types for the AI vision card (P07 replacement).
 *
 * Phase 1: UI-only with graceful fallback.
 * Phase 2: Populated by OpenAI vision (server-side only).
 */

export type VisualCoverStatus = "strong" | "needs_improvement" | "critical";
export type ThumbnailStatus = "good" | "medium" | "weak";

export interface VisualCoverSubScores {
  recognizability: number; // 0-100
  colorCoherence: number;
  composition: number;
  visualVariety: number;
  textDensity: number; // inverse: high text = low score
}

export interface VisualCoverThumbnail {
  postId: string;
  thumbnailUrl: string;
  visualScore: number;
  status: ThumbnailStatus;
  hasHumanPresence: boolean;
  hasReadableText: boolean;
  dominantColors: string[]; // hex
  notes: string;
}

export interface VisualCoverAggregate {
  humanPresencePct: number;
  textInImagePct: number;
  dominantPalette: string[]; // top 5 hex
  repeatedTemplateCount: number;
  repeatedTemplateNote: string | null;
}

export interface VisualCoverDiagnostic {
  main: string;
  works: string;     // FUNCIONA
  critical: string;  // PONTO CRÍTICO
  watch: string;     // A OBSERVAR
}

export interface VisualCoverAnalysis {
  analyzedCount: number;
  overallScore: number; // 0-100
  status: VisualCoverStatus;
  summary: string;
  subScores: VisualCoverSubScores;
  thumbnails: VisualCoverThumbnail[];
  aggregate: VisualCoverAggregate;
  diagnostic: VisualCoverDiagnostic;
}

/** Status label map (pt-PT). */
export const STATUS_LABEL: Record<VisualCoverStatus, string> = {
  strong: "FORTE",
  needs_improvement: "A MELHORAR",
  critical: "CRÍTICO",
};

/** Thumbnail status label map (pt-PT). */
export const THUMB_STATUS_LABEL: Record<ThumbnailStatus, string> = {
  good: "Boa",
  medium: "Média",
  weak: "Fraca",
};