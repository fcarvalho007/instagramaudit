/**
 * Receita · Secção 1 — Métricas principais.
 *
 * Sem fonte real até o checkout estar ligado.
 */

import { EmptyStateCard } from "../empty-state-card";

export function MetricsSection() {
  return (
    <EmptyStateCard
      title="Métricas principais"
      accent="revenue"
      info="Métricas financeiras principais do negócio. MRR, ARR, ARPU e churn formam o quadro de saúde recorrente."
      reason="KPIs de receita (MRR, ARR, ARPU, churn) dependem de subscrições activas. Serão calculados quando o checkout (EuPago/Stripe) estiver ligado."
    />
  );
}
