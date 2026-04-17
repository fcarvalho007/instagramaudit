/**
 * Formatting helpers + premium teaser shape used by the public analysis dashboard.
 *
 * Historically this file held a deterministic mock data generator
 * (`getMockAnalysis`) for the early UI prototype. The real analysis pipeline
 * (Apify + benchmark engine) now feeds the dashboard directly, so the mock
 * generator was removed. The filename is intentionally preserved to avoid
 * touching imports across the dashboard tree.
 */

export interface AnalysisPremiumTeasers {
  estimatedReach: string;
  aiInsightsCount: number;
  opportunitiesCount: number;
  recommendations30d: number;
}

export function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(".", ",")}K`;
  return String(n);
}

export function formatPercent(n: number, digits = 2): string {
  return `${n.toFixed(digits).replace(".", ",")}%`;
}
