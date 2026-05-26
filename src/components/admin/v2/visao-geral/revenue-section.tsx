/**
 * Secção "Receita" — Admin /visao-geral.
 *
 * Sem fonte real até o checkout (EuPago/Stripe) estar ligado.
 */

import { EmptyStateCard } from "../empty-state-card";

export function RevenueSection() {
  return (
    <EmptyStateCard
      title="Receita"
      subtitle="o que entra"
      accent="revenue"
      info="MRR (subscrições recorrentes) e vendas avulsas. MRR é a métrica de saúde primária do negócio SaaS."
      reason="Receita a zero porque o checkout (EuPago/Stripe) ainda não está ligado. MRR e vendas avulsas serão contabilizados em tempo real assim que houver pagamentos."
    />
  );
}
