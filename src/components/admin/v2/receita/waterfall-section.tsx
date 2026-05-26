/**
 * Receita · Secção 2 — Anatomia do MRR (waterfall).
 *
 * Sem fonte real até existirem movimentos de MRR.
 */

import { EmptyStateCard } from "../empty-state-card";

export function WaterfallSection() {
  return (
    <EmptyStateCard
      title="Anatomia do MRR"
      subtitle="novo · expansão · contracção · churn"
      accent="revenue"
      info="Decomposição da variação mensal de MRR: novo, expansão, contracção e churn."
      reason="O waterfall de MRR só faz sentido com movimentos reais de subscrição. Será preenchido quando o checkout estiver no sítio."
    />
  );
}
