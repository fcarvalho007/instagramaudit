/**
 * Receita · Secção 1 — Métricas principais.
 *
 * Linha 1 (size md): MRR (hero) · ARR · ARPU · Churn.
 * Linha 2 (size sm): LTV · Receita avulsa · Receita total · Mix subscrição.
 */

import { DemoOnlySection } from "../demo-only-section";
import { KPICard } from "../kpi-card";
import { MOCK_MRR_METRICS } from "@/lib/admin/mock-data";

export function MetricsSection() {
  const m = MOCK_MRR_METRICS;

  return (
    <DemoOnlySection
      title="Métricas principais"
      accent="revenue"
      info={"Métricas financeiras principais do negócio. MRR, ARR, ARPU e churn formam o quadro de saúde recorrente."}
      pendingReason={"KPIs de receita (MRR, ARR, ARPU, churn) requerem subscrições. Estão a zero — esperam a integração de checkout."}
    >
      <section>
      {/* Linha 1 */}
      <div className="mb-3 grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          size="hero"
          variant="hero"
          eyebrow={m.mrr.eyebrow}
          info="Monthly Recurring Revenue: receita previsível mensal das subscrições activas. A métrica mais importante de um SaaS."
          value={m.mrr.value}
          delta={{ text: m.mrr.deltaText, direction: m.mrr.deltaDirection }}
          sub={m.mrr.sub}
        />
        <KPICard
          size="lg"
          eyebrow={m.arr.eyebrow}
          info="Annual Recurring Revenue: MRR × 12. Projecção anual da receita recorrente."
          value={m.arr.value}
          sub={m.arr.sub}
        />
        <KPICard
          size="lg"
          eyebrow={m.arpu.eyebrow}
          info="Average Revenue Per User: receita média por subscritor activo."
          value={m.arpu.value}
          sub={m.arpu.sub}
        />
        <KPICard
          size="lg"
          eyebrow={m.churn.eyebrow}
          info="Percentagem de subscritores que cancelaram a subscrição neste mês."
          value={
            <span className="inline-flex items-baseline gap-2">
              {m.churn.value}
              <span className="font-sans text-[11px] font-normal text-admin-danger-700">
                {m.churn.suffix}
              </span>
            </span>
          }
          sub={m.churn.sub}
        />
      </div>

      {/* Linha 2 — métricas mais pequenas */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          size="sm"
          eyebrow={m.ltv.eyebrow}
          info="Lifetime Value: receita total esperada de um cliente médio durante o tempo que mantém a subscrição."
          value={m.ltv.value}
          sub={m.ltv.sub}
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
        <KPICard
          size="sm"
          eyebrow={m.mix.eyebrow}
          info="Percentagem da receita total que vem de subscrições recorrentes (vs avulso)."
          value={m.mix.value}
          sub={m.mix.sub}
        />
      </div>
    </section>
    </DemoOnlySection>
  );
}