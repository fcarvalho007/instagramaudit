/**
 * Fonte única de verdade para resolver o custo de uma linha de
 * `provider_call_logs`.
 *
 * Regra: usa `actual_cost_usd` quando > 0, senão `estimated_cost_usd`.
 *
 * Porquê não `actual ?? estimated`: o Apify `instagram-scraper` por vezes
 * grava `actual_cost_usd = 0.00000` em vez de `null`. O `??` aceitaria 0
 * como valor real e descartaria o estimated, baixando artificialmente o
 * total. O `> 0` garante fallback para estimated nesses casos.
 */
export function resolveCallCost(row: {
  actual_cost_usd?: number | string | null;
  estimated_cost_usd?: number | string | null;
}): number {
  const actual = Number(row.actual_cost_usd ?? 0);
  if (Number.isFinite(actual) && actual > 0) return actual;
  const estimated = Number(row.estimated_cost_usd ?? 0);
  return Number.isFinite(estimated) && estimated > 0 ? estimated : 0;
}

/**
 * True quando a linha tem custo real reportado pelo provider (>0).
 * Usado para classificar `cost_source` (REAL vs ESTIM.) no UI admin.
 */
export function hasReportedActualCost(row: {
  actual_cost_usd?: number | string | null;
}): boolean {
  const actual = Number(row.actual_cost_usd ?? 0);
  return Number.isFinite(actual) && actual > 0;
}
