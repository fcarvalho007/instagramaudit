/**
 * Receita · Secção 1 — Métricas principais.
 *
 * Linha 1 (size md): MRR (hero) · ARR · ARPU · Churn.
 * Linha 2 (size sm): LTV · Receita avulsa · Receita total · Mix subscrição.
 */

import { AdminSectionHeader } from "../admin-section-header";
import { KPICard } from "../kpi-card";
import { MOCK_MRR_METRICS } from "@/lib/admin/mock-data";

export function MetricsSection() {
  const m = MOCK_MRR_METRICS;

  return (
    <section>
      <AdminSectionHeader
        title="Métricas principais"
        accent="revenue"
        info="Métricas financeiras principais do negócio. MRR, ARR, ARPU e churn formam o quadro de saúde recorrente."
      />

      {/* Linha 1 */}
      <div className="mb-4 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          variant="hero"
          size="hero"
          eyebrow={m.mrr.eyebrow}
          value={m.mrr.value}
          delta={{ text: m.mrr.deltaText, direction: m.mrr.deltaDirection }}
          sub={m.mrr.sub}
          info="Monthly Recurring Revenue: receita previsível mensal das subscrições activas. A métrica mais importante de um SaaS."
          className="lg:col-span-2"
        />
        <KPICard
          size="lg"
          eyebrow={m.arr.eyebrow}
          value={m.arr.value}
          sub={m.arr.sub}
          info="Annual Recurring Revenue: MRR × 12. Projecção anual da receita recorrente."
        />
        <KPICard
          size="lg"
          eyebrow={m.arpu.eyebrow}
          value={m.arpu.value}
          sub={m.arpu.sub}
          info="Average Revenue Per User: receita média por subscritor activo."
        />
      </div>

      {/* Linha 1b — Churn em linha separada para acompanhar o hero */}
      <div className="mb-4 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          size="lg"
          eyebrow={m.churn.eyebrow}
          value={
            <span className="inline-flex items-baseline gap-2">
              {m.churn.value}
              <span className="font-sans text-[11px] font-normal text-admin-danger-700">
                {m.churn.suffix}
              </span>
            </span>
          }
          sub={m.churn.sub}
          info="Percentagem de subscritores que cancelaram a subscrição neste mês."
        />
        <KPICard
          size="sm"
          eyebrow={m.ltv.eyebrow}
          value={m.ltv.value}
          sub={m.ltv.sub}
          info="Lifetime Value: receita total esperada de um cliente médio durante o tempo que mantém a subscrição."
        />
        <KPICard
          size="sm"
          eyebrow={m.oneOff.eyebrow}
          value={m.oneOff.value}
          sub={m.oneOff.sub}
        />
        <KPICard
          size="sm"
          eyebrow={m.total.eyebrow}
          value={m.total.value}
          delta={{ text: m.total.deltaText, direction: m.total.deltaDirection }}
          sub={m.total.sub}
        />
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          size="sm"
          eyebrow={m.mix.eyebrow}
          value={m.mix.value}
          sub={m.mix.sub}
          info="Percentagem da receita total que vem de subscrições recorrentes (vs avulso)."
        />
      </div>
    </section>
  );
}