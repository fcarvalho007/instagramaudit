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
 *   "full"    — render normally
 *   "teaser"  — render a locked/teaser placeholder
 *   "hidden"  — do not render at all
 */
export type FeatureVisibility = "full" | "teaser" | "hidden";

export interface VariantFeatures {
  /** Q05 detailed comment intelligence (from comment scraper) */
  commentIntelligence: FeatureVisibility;
  /** Beta feedback banner */
  betaFeedbackBanner: FeatureVisibility;
  /** Show debug/internal labels (e.g. "em desenvolvimento", "payload") */
  debugLabels: FeatureVisibility;
}

const VARIANT_FEATURES: Record<ReportVariant, VariantFeatures> = {
  public_mvp: {
    commentIntelligence: "hidden",
    betaFeedbackBanner: "full",
    debugLabels: "hidden",
  },
  internal_lab: {
    commentIntelligence: "full",
    betaFeedbackBanner: "hidden",
    debugLabels: "full",
  },
  pro_preview: {
    commentIntelligence: "teaser",
    betaFeedbackBanner: "hidden",
    debugLabels: "hidden",
  },
};

export function getVariantFeatures(variant: ReportVariant): VariantFeatures {
  return VARIANT_FEATURES[variant];
}

// ── React context ──────────────────────────────────────────────────

const ReportVariantContext = createContext<ReportVariant>("public_mvp");

export const ReportVariantProvider = ReportVariantContext.Provider;

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
  return getVariantFeatures(useReportVariant());
}