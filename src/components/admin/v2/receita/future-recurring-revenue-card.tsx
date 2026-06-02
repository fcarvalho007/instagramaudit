/**
 * Receita · Bloco 3 — Receita recorrente (consolidado).
 *
 * Substitui os 5 EmptyStateCards anteriores (Métricas, Waterfall, Planos,
 * Cohort, Faturas) por um único bloco que explica o que vai acender
 * quando o checkout (EuPago/Stripe) for ligado.
 */

import { AdminCard } from "../admin-card";
import { AdminSectionHeader } from "../admin-section-header";

const FUTURE_METRICS: Array<{ title: string; desc: string }> = [
  {
    title: "Métricas principais",
    desc: "MRR, ARR, ARPU e churn — saúde recorrente do negócio.",
  },
  {
    title: "Anatomia do MRR",
    desc: "Waterfall mensal: novo · expansão · contracção · churn.",
  },
  {
    title: "MRR por plano",
    desc: "Distribuição de receita por plano e concentração por cliente.",
  },
  {
    title: "Cohort de retenção",
    desc: "% de subscritores activos por mês de aquisição.",
  },
  {
    title: "Últimas faturas",
    desc: "Renovações de subscrição e reports avulsos vendidos.",
  },
];

export function FutureRecurringRevenueCard() {
  return (
    <section>
      <AdminSectionHeader
        title="Receita recorrente"
        subtitle="activa quando o checkout for ligado"
        accent="revenue"
        info="Métricas dependentes de subscrições activas (EuPago/Stripe). Listadas aqui apenas como preview do que vai aparecer."
      />
      <AdminCard>
        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1">
            <span className="text-eyebrow-sm text-admin-text-tertiary">
              Sem dados ainda
            </span>
            <p className="m-0 max-w-3xl text-sm leading-relaxed text-admin-text-secondary">
              Estas métricas dependem de subscrições reais. Acendem
              automaticamente quando o checkout (EuPago/Stripe) estiver
              ligado e o primeiro pagamento for confirmado em{" "}
              <code className="font-mono text-[12px] text-admin-text-primary">
                lead_payments
              </code>
              .
            </p>
          </div>

          <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 md:grid-cols-2 lg:grid-cols-3">
            {FUTURE_METRICS.map((m) => (
              <li
                key={m.title}
                className="rounded-lg border border-admin-border/60 bg-admin-surface-muted/60 px-4 py-3"
              >
                <p className="m-0 text-sm font-semibold text-admin-text-primary">
                  {m.title}
                </p>
                <p className="m-0 mt-1 text-[13px] leading-snug text-admin-text-tertiary">
                  {m.desc}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </AdminCard>
    </section>
  );
}