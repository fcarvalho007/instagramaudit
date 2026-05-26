/**
 * Receita · Secção 3 — MRR por plano.
 *
 * Sem fonte real até existirem subscrições activas.
 */

import { EmptyStateCard } from "../empty-state-card";

export function PlansSection() {
  return (
    <EmptyStateCard
      title="MRR por plano"
      subtitle="distribuição e concentração"
      accent="revenue"
      info="Distribuição de MRR por plano e concentração de receita por escalão de cliente."
      reason="A distribuição por plano exige subscrições activas. Será mostrada quando o checkout estiver ligado."
    />
  );
}
