/**
 * Receita · Secção 5 — Últimas faturas.
 *
 * Sem fonte real até o gateway de pagamento estar ligado.
 */

import { EmptyStateCard } from "../empty-state-card";

export function InvoicesSection() {
  return (
    <EmptyStateCard
      title="Últimas faturas"
      subtitle="fluxo financeiro recente"
      accent="revenue"
      info="Movimentos financeiros recentes (subscrições renovadas + reports avulsos vendidos)."
      reason="A lista de faturas vem da integração com o gateway de pagamento (EuPago/Stripe). Será preenchida quando houver pagamentos reais."
    />
  );
}
