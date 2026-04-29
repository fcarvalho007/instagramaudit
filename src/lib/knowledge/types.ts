/**
 * Tipos partilhados da Knowledge Base.
 *
 * Vivem num módulo neutro (sem `*.server.ts` no nome) para poderem ser
 * importados também pelos componentes da UI sem cruzar a barreira
 * cliente/servidor. Os helpers que tocam em `supabaseAdmin` ou em
 * `process.env` ficam em `*.server.ts`.
 */

export type BenchmarkTier = "nano" | "micro" | "mid" | "macro";
export type BenchmarkFormat = "reels" | "carousels" | "images";
export type BenchmarkOrigin = "manual" | "system_suggested" | "system_approved";
export type SourceType = "study" | "dataset" | "api" | "internal";
export type NoteCategory = "trend" | "format" | "algorithm" | "vertical" | "tool";
export type SuggestionStatus = "pending" | "approved" | "rejected";
export type SuggestionType = "benchmark_update" | "new_pattern" | "outdated";

export interface KnowledgeSource {
  id: string;
  name: string;
  type: SourceType | null;
  url: string | null;
  published_at: string | null;
  sample_size: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  citations_count?: number;
}

export interface KnowledgeBenchmark {
  id: string;
  tier: BenchmarkTier;
  format: BenchmarkFormat;
  engagement_pct: number;
  sample_size: number;
  source_id: string | null;
  source_name: string | null;
  notes: string | null;
  valid_from: string;
  valid_to: string | null;
  origin: BenchmarkOrigin;
  created_by_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeNote {
  id: string;
  category: NoteCategory;
  vertical: string | null;
  title: string;
  body: string;
  source_id: string | null;
  source_name: string | null;
  valid_from: string | null;
  valid_to: string | null;
  archived: boolean;
  created_by_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeSuggestion {
  id: string;
  type: SuggestionType;
  payload: Record<string, unknown>;
  reason: string | null;
  status: SuggestionStatus;
  reviewed_by_email: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface KnowledgeHistoryEntry {
  id: string;
  entity_type: "benchmark" | "source" | "note";
  entity_id: string;
  action: "created" | "updated" | "archived";
  diff: Record<string, unknown> | null;
  changed_by_email: string | null;
  changed_at: string;
}

export interface KnowledgeOverview {
  total_entries: number;
  manual_count: number;
  system_count: number;
  tier_coverage: number; // tiers com ≥3 benchmarks
  tier_total: number;
  last_update: { at: string | null; by: string | null; label: string | null };
  pending_suggestions: number;
}

/** Estrutura JSON devolvida pela RPC `get_knowledge_context`. */
export interface KnowledgeContext {
  benchmarks: Array<{
    tier: BenchmarkTier;
    format: BenchmarkFormat;
    engagement_pct: number;
    sample_size: number;
    source_name: string | null;
    valid_from: string | null;
    valid_to: string | null;
  }>;
  notes: Array<{
    category: NoteCategory;
    title: string;
    body: string;
    valid_from: string | null;
    valid_to: string | null;
  }>;
  metadata: {
    last_updated: string;
    total_entries: number;
  };
}

export const TIER_LABEL: Record<BenchmarkTier, string> = {
  nano: "Nano (0-10K)",
  micro: "Micro (10K-100K)",
  mid: "Mid (100K-500K)",
  macro: "Macro (500K+)",
};

export const FORMAT_LABEL: Record<BenchmarkFormat, string> = {
  reels: "Reels",
  carousels: "Carrosséis",
  images: "Imagens",
};

export const NOTE_CATEGORY_LABEL: Record<NoteCategory, string> = {
  trend: "Tendência",
  format: "Formato",
  algorithm: "Algoritmo",
  vertical: "Vertical",
  tool: "Ferramenta",
};

export const SOURCE_TYPE_LABEL: Record<SourceType, string> = {
  study: "Estudo",
  dataset: "Dataset",
  api: "API",
  internal: "Interno",
};

export const ORIGIN_LABEL: Record<BenchmarkOrigin, string> = {
  manual: "Manual",
  system_suggested: "Sistema (sugerido)",
  system_approved: "Sistema (aprovado)",
};