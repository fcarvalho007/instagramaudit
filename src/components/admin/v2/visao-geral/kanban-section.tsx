/**
 * Secção 4 — Clientes kanban.
 *
 * 4 colunas. Cada coluna tem border-top colorida (única portadora de
 * cor temática) + lista semântica `<ul>/<li>`.
 */

import { EmptyStateCard } from "../empty-state-card";

export function KanbanSection() {
  return (
    <EmptyStateCard
      title="Clientes — kanban"
      subtitle="pipeline de relação"
      accent="leads"
      info="Pipeline de relação com cada utilizador (lead → trial → cliente → churn)."
      reason="O kanban de clientes depende de subscrições e checkout. Será ligado quando a integração de pagamentos (EuPago/Stripe) estiver no sítio."
    />
  );
}