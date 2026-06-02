/**
 * Pure formulas for /admin/visao-geral KPIs.
 *
 * Kept side-effect free so they can be unit-tested without hitting Supabase.
 * The HTTP handler in src/routes/api/admin/overview-kpis.ts wires the real
 * counts into `computeKpis()` and serialises the result.
 */

export type MarginStatus = "inactive" | "negative" | "positive";

export interface KpiInput {
  leads_30d: number;
  analyses_30d: number;
  fresh_analyses_30d: number;
  reports_unlocked_30d: number;
  /** Total platform cost 30d — includes Lab/I&D. */
  cost_total_30d: number;
  /**
   * Cost attributed to public fresh reports (provider calls linked to
   * analysis_event_id). Kept for backwards-compat with the UI; the
   * production-vs-lab split below is the canonical input for per-lead KPIs.
   */
  cost_public_30d: number;
  /**
   * Production provider cost 30d — `public_analysis` + `enrich_comments`.
   * Drives cost-per-lead, cost-per-analysis, margin. Excludes Lab/I&D.
   */
  production_cost_30d: number;
  /** Admin Apify Lab / I&D cost 30d. Counted in totals, EXCLUDED from per-lead. */
  lab_cost_30d: number;
  /** Admin refresh / backfill / unknown legacy cost 30d. */
  other_cost_30d: number;
  /** linked-cost avg per fresh report — comes straight from fetchExpense30d */
  fresh_avg_cost_per_report: number | null;
  /** revenue (EUR) on lead_payments with status='paid' in 30d */
  revenue_30d: number;
  /** true once any paid lead_payment exists (all-time) — flips when checkout goes live */
  revenue_active: boolean;
}

export interface KpiOutput {
  cost_per_lead: number | null;
  cost_per_analysis: number | null;
  cost_per_unlocked_report: number | null;
  revenue_per_lead: number | null;
  margin_per_lead: number | null;
  margin_status: MarginStatus;
}

function safeDiv(num: number, den: number): number | null {
  if (!isFinite(num) || !isFinite(den) || den <= 0) return null;
  return num / den;
}

export function computeKpis(input: KpiInput): KpiOutput {
  // Per-lead, per-analysis and per-unlocked KPIs use PRODUCTION cost only.
  // Lab/I&D spend (admin_lab) inflates platform total but must never
  // distort cost-per-lead or margin.
  const cost_per_lead = safeDiv(input.production_cost_30d, input.leads_30d);
  const cost_per_unlocked_report = safeDiv(
    input.production_cost_30d,
    input.reports_unlocked_30d,
  );
  const cost_per_analysis = input.fresh_avg_cost_per_report;

  let revenue_per_lead: number | null = null;
  let margin_per_lead: number | null = null;
  let margin_status: MarginStatus = "inactive";

  if (input.revenue_active) {
    revenue_per_lead = safeDiv(input.revenue_30d, input.leads_30d);
    if (revenue_per_lead !== null && cost_per_lead !== null) {
      margin_per_lead = revenue_per_lead - cost_per_lead;
      margin_status = margin_per_lead < 0 ? "negative" : "positive";
    }
  }

  return {
    cost_per_lead,
    cost_per_analysis,
    cost_per_unlocked_report,
    revenue_per_lead,
    margin_per_lead,
    margin_status,
  };
}