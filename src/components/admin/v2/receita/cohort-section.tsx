/**
 * Receita · Secção 4 — Cohort de retenção.
 *
 * Sem fonte real até existir histórico de subscrições.
 */

import { EmptyStateCard } from "../empty-state-card";

export function CohortSection() {
  return (
    <EmptyStateCard
      title="Cohort de retenção"
      subtitle="% de subscritores que se mantêm activos"
      accent="leads"
      info="Percentagem de subscritores que se mantêm activos após o registo, agrupados por mês de entrada."
      reason="A análise de cohort retention exige um histórico de subscrições (mês de aquisição e estado activo). Será calculada quando o checkout estiver no sítio."
    />
  );
}
