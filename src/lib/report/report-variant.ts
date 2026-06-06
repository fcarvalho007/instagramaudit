/**
 * Report variant system — controls which blocks/features are visible
 * in different report contexts without duplicating the report shell.
 *
 * Variants:
 *   public_mvp   — clean, stable, lower-cost public report (default)
 *   internal_lab — full enriched report for admin testing
 *   pro_preview  — future Pro/Agency teaser view
 */

import { createContext, useContext } from "react";

export type ReportVariant = "public_mvp" | "internal_lab" | "pro_preview";

/**
 * Per-feature visibility for a given variant.
 *   "full"        — render normally
 *   "lightweight" — render a simplified/reduced version
 *   "teaser"      — render a locked/teaser placeholder
 *   "hidden"      — do not render at all
 */
export type FeatureVisibility = "full" | "lightweight" | "teaser" | "hidden";

export interface VariantFeatures {
  /** Overview hero + KPI cards */
  overviewHeroKpis: FeatureVisibility;
  /** Diagnostic cards Q01–Q07 */
  diagnosticQ01Q07: FeatureVisibility;
  /** P05 post-level conversation metrics */
  conversationPostLevel: FeatureVisibility;
  /** Q05 detailed comment intelligence (from comment scraper) */
  commentIntelligence: FeatureVisibility;
  /** Caption semantic diagnostics (P04) */
  captionsDiagnostics: FeatureVisibility;
  /** Market signals section */
  marketSignals: FeatureVisibility;
  /** Benchmark gauge */
  benchmarkGauge: FeatureVisibility;
  /** Methodology section */
  methodology: FeatureVisibility;
  /** Beta feedback banner */
  betaFeedbackBanner: FeatureVisibility;
  /** Show debug/internal labels (e.g. "em desenvolvimento", "payload") */
  debugLabels: FeatureVisibility;
  /** Block 01 — Overview / Visão geral */
  blockOverview: FeatureVisibility;
  /** Block 02 — Diagnosis / Diagnóstico */
  blockDiagnosis: FeatureVisibility;
  /** Block 03 — Performance / Desempenho */
  blockPerformance: FeatureVisibility;
  /** Block 04 — Content / Conteúdo */
  blockContent: FeatureVisibility;
  /** Block 05 — Search / Procura */
  blockSearch: FeatureVisibility;
  /** Block 06 — Benchmark / Comparação */
  blockBenchmark: FeatureVisibility;
}

const VARIANT_FEATURES: Record<ReportVariant, VariantFeatures> = {
  public_mvp: {
    overviewHeroKpis: "full",
    diagnosticQ01Q07: "full",
    conversationPostLevel: "full",
    commentIntelligence: "hidden",
    captionsDiagnostics: "lightweight",
    marketSignals: "hidden",
    benchmarkGauge: "hidden",
    methodology: "full",
    betaFeedbackBanner: "full",
    debugLabels: "hidden",
    blockOverview: "full",
    blockDiagnosis: "full",
    blockPerformance: "hidden",
    blockContent: "hidden",
    blockSearch: "hidden",
    blockBenchmark: "hidden",
  },
  internal_lab: {
    overviewHeroKpis: "full",
    diagnosticQ01Q07: "full",
    conversationPostLevel: "full",
    commentIntelligence: "full",
    captionsDiagnostics: "full",
    marketSignals: "full",
    benchmarkGauge: "full",
    methodology: "full",
    betaFeedbackBanner: "hidden",
    debugLabels: "full",
    blockOverview: "full",
    blockDiagnosis: "full",
    blockPerformance: "full",
    blockContent: "full",
    blockSearch: "full",
    blockBenchmark: "full",
  },
  pro_preview: {
    overviewHeroKpis: "full",
    diagnosticQ01Q07: "full",
    conversationPostLevel: "full",
    commentIntelligence: "hidden",
    captionsDiagnostics: "lightweight",
    marketSignals: "hidden",
    benchmarkGauge: "hidden",
    methodology: "full",
    betaFeedbackBanner: "hidden",
    debugLabels: "hidden",
    blockOverview: "full",
    blockDiagnosis: "full",
    blockPerformance: "hidden",
    blockContent: "hidden",
    blockSearch: "hidden",
    blockBenchmark: "hidden",
  },
};

// ── Display labels for admin UI ───────────────────────────────────

export const FEATURE_LABELS: Record<keyof VariantFeatures, string> = {
  overviewHeroKpis: "Overview (Hero + KPIs)",
  diagnosticQ01Q07: "Diagnostic (Q01–Q07)",
  conversationPostLevel: "P05 Conversa (post-level)",
  commentIntelligence: "P05 Comment Intelligence",
  captionsDiagnostics: "Legendas (P04)",
  marketSignals: "Market Signals",
  benchmarkGauge: "Benchmark Gauge",
  methodology: "Metodologia",
  betaFeedbackBanner: "Beta Feedback",
  debugLabels: "Debug labels",
  blockOverview: "Bloco 01 — Visão geral",
  blockDiagnosis: "Bloco 02 — Diagnóstico",
  blockPerformance: "Bloco 03 — Desempenho",
  blockContent: "Bloco 04 — Conteúdo",
  blockSearch: "Bloco 05 — Procura",
  blockBenchmark: "Bloco 06 — Comparação",
};

export function getVariantFeatures(variant: ReportVariant): VariantFeatures {
  return VARIANT_FEATURES[variant];
}

// ── React context ──────────────────────────────────────────────────

const ReportVariantContext = createContext<ReportVariant>("public_mvp");

export const ReportVariantProvider = ReportVariantContext.Provider;

/**
 * Optional context for overriding resolved features (e.g. from admin overrides).
 * When set, useVariantFeatures() returns this instead of the static lookup.
 */
const VariantFeaturesOverrideContext = createContext<VariantFeatures | null>(null);

export const VariantFeaturesOverrideProvider = VariantFeaturesOverrideContext.Provider;

/**
 * Returns the current report variant. Defaults to `"public_mvp"` when
 * used outside a provider — the safest default for public consumers.
 */
export function useReportVariant(): ReportVariant {
  return useContext(ReportVariantContext);
}

/**
 * Convenience hook: returns resolved feature visibility for the
 * current variant.
 */
export function useVariantFeatures(): VariantFeatures {
  const override = useContext(VariantFeaturesOverrideContext);
  if (override) return override;
  return getVariantFeatures(useReportVariant());
}

// ── Public readiness checklist (admin-only, informational) ────────

export type ReadinessStatus =
  | "ready"
  | "needs_review"
  | "internal_only"
  | "pro_candidate"
  | "hidden";

export type RiskLevel = "low" | "medium" | "high";

export interface ModuleReadiness {
  status: ReadinessStatus;
  risk: RiskLevel;
  note: string;
}

export const READINESS_STATUS_LABELS: Record<ReadinessStatus, string> = {
  ready: "Ready",
  needs_review: "Needs review",
  internal_only: "Internal only",
  pro_candidate: "Pro candidate",
  hidden: "Hidden",
};

export const MODULE_READINESS: Record<keyof VariantFeatures, ModuleReadiness> = {
  overviewHeroKpis:      { status: "ready",         risk: "low",    note: "Estável. KPIs derivados do scraper principal." },
  diagnosticQ01Q07:      { status: "ready",         risk: "low",    note: "Cards Q01–Q07 validados com dados reais." },
  conversationPostLevel: { status: "ready",         risk: "low",    note: "Métricas de conversa por post, sem comment scraper." },
  commentIntelligence:   { status: "pro_candidate", risk: "low",    note: "Depende do comment scraper (desativado). Pro teaser ativo." },
  captionsDiagnostics:   { status: "needs_review",  risk: "medium", note: "Lightweight em MVP. Rever copy e fallback sem dados." },
  marketSignals:         { status: "needs_review",  risk: "medium", note: "Depende de DataForSEO. Verificar fallback quando bloqueado." },
  benchmarkGauge:        { status: "needs_review",  risk: "medium", note: "Funcional, mas rever labels e fallback sem reference data." },
  methodology:           { status: "ready",         risk: "low",    note: "Secção informativa estática." },
  betaFeedbackBanner:    { status: "ready",         risk: "low",    note: "Banner de feedback. Remover quando sair de beta." },
  debugLabels:           { status: "hidden",         risk: "low",    note: "Interno. Nunca visível em public_mvp." },
  blockOverview:         { status: "ready",          risk: "low",    note: "Bloco principal. Sempre visível." },
  blockDiagnosis:        { status: "ready",          risk: "low",    note: "Bloco principal. Sempre visível." },
  blockPerformance:      { status: "internal_only",  risk: "low",    note: "Apenas em internal_lab. Quando e como reage o público — não pronto para PRO." },
  blockContent:          { status: "internal_only",  risk: "low",    note: "Apenas em internal_lab. Top links/hashtags estendidas/menções — não pronto para PRO." },
  blockSearch:           { status: "internal_only",  risk: "medium", note: "Apenas em internal_lab. Depende de DataForSEO." },
  blockBenchmark:        { status: "internal_only",  risk: "medium", note: "Apenas em internal_lab. Comparação avançada não polida para PRO." },
};