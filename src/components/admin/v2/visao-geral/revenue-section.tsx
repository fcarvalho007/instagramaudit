/**
 * Secção 2 — Receita.
 *
 * Hierarquia: MRR é o cartão hero (saúde do negócio = receita previsível).
 * Receita total e Avulso ficam em accent-left. Adiciona ARPU como 4ª KPI.
 *
 * Cartão abaixo: barras empilhadas Recharts (subscrições + avulso), 30 dias.
 */

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AdminCard } from "../admin-card";
import { KPICard } from "../kpi-card";
import { ADMIN_LITERAL } from "../admin-tokens";
import { AdminSectionHeader } from "../admin-section-header";
import { PaymentsPendingBanner } from "../payments-pending-banner";
import { useDemoMode } from "@/lib/admin/demo-mode";
import {
  MOCK_DAILY_REVENUE,
  MOCK_REVENUE_KPIS,
  ZERO_DAILY_REVENUE,
  ZERO_REVENUE_KPIS,
} from "@/lib/admin/mock-data";

export function RevenueSection() {
  const { enabled: demo } = useDemoMode();
  const kpis = demo ? MOCK_REVENUE_KPIS : ZERO_REVENUE_KPIS;
  const daily = demo ? MOCK_DAILY_REVENUE : ZERO_DAILY_REVENUE;
  const totalSubs = daily.reduce((acc, d) => acc + d.subs, 0);
  const totalOneOff = daily.reduce((acc, d) => acc + d.oneOff, 0);
  // Recharts espera array mutável; o mock é `as const`.
  const chartData = daily.map((d) => ({ ...d }));

  return (
    <section className="flex flex-col gap-4">
      <AdminSectionHeader
        title="Receita"
        subtitle="o que entra"
        accent="revenue"
        info="Inclui MRR (subscrições recorrentes) e vendas avulsas. MRR é a métrica de saúde primária do negócio SaaS."
      />
      {!demo && (
        <PaymentsPendingBanner
          reason="Receita a zero porque o checkout (EuPago/Stripe) ainda não está ligado. MRR e vendas avulsas serão contabilizados em tempo real assim que houver pagamentos."
        />
      )}
      <div className="grid gap-3 grid-cols-1 lg:grid-cols-[1.4fr_1fr_1fr]">
        {/* Hero: MRR — receita previsível, mono 56px */}
        <KPICard
          variant="hero"
          size="hero"
          eyebrow={kpis.mrr.eyebrow}
          info="Monthly Recurring Revenue: receita previsível mensal das subscrições activas. A métrica mais importante de um SaaS."
          value={kpis.mrr.value}
          delta={
            "deltaText" in kpis.mrr && "deltaDirection" in kpis.mrr
              ? { text: kpis.mrr.deltaText, direction: kpis.mrr.deltaDirection }
              : undefined
          }
          sub={kpis.mrr.sub}
        />
        <KPICard
          variant="accent-left"
          accent="revenue"
          size="lg"
          eyebrow={kpis.total.eyebrow}
          info="Soma de toda a receita: subscrições + vendas avulsas de relatórios."
          value={kpis.total.value}
          delta={
            "deltaText" in kpis.total && "deltaDirection" in kpis.total
              ? { text: kpis.total.deltaText, direction: kpis.total.deltaDirection }
              : undefined
          }
          sub={kpis.total.sub}
        />
        <KPICard
          variant="accent-left"
          accent="revenue-alt"
          size="lg"
          eyebrow={kpis.oneOff.eyebrow}
          info="Receita de relatórios comprados individualmente, sem subscrição. Cada relatório custa €29."
          value={kpis.oneOff.value}
          highlightSub={{
            text: kpis.oneOff.highlightText,
            accent: "revenue-alt",
          }}
          sub={kpis.oneOff.sub}
        />
      </div>

      <AdminCard>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="m-0 text-sm font-medium text-admin-text-primary">
              Receita diária · últimos 30 dias
            </p>
            <p className="mt-0.5 text-[11px] text-admin-text-tertiary">
              Subscrições estáveis · avulso a crescer
            </p>
          </div>
          <div className="flex items-center gap-4">
            <LegendDot color={ADMIN_LITERAL.revenueChartSubs} label="Subscrições" />
            <LegendDot color={ADMIN_LITERAL.revenueChartOneOff} label="Avulso" />
          </div>
        </div>

        <div
          role="img"
          aria-label={`Evolução diária da receita: subscrições €${totalSubs}, avulso €${totalOneOff} nos últimos 30 dias.`}
          className="relative w-full h-44"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="2 4"
                stroke="rgba(136,135,128,0.18)"
                vertical={false}
              />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 10, fill: "rgb(var(--admin-neutral-400))" }}
                tickLine={false}
                axisLine={{ stroke: "rgba(136,135,128,0.2)" }}
                interval={2}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "rgb(var(--admin-neutral-400))" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `€${v}`}
                width={40}
              />
              <Tooltip
                cursor={{ fill: "rgba(136,135,128,0.06)" }}
                contentStyle={{
                  border: "1px solid rgb(44 44 42 / 0.14)",
                  borderRadius: 8,
                  fontSize: 11,
                  padding: "6px 10px",
                  boxShadow: "none",
                }}
                formatter={(value: number, name: string) => [
                  `€${value}`,
                  name === "subs" ? "Subscrições" : "Avulso",
                ]}
                labelFormatter={(label) => `Dia ${label}`}
              />
              <Bar
                dataKey="subs"
                stackId="r"
                fill={ADMIN_LITERAL.revenueChartSubs}
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="oneOff"
                stackId="r"
                fill={ADMIN_LITERAL.revenueChartOneOff}
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </AdminCard>
    </section>
    </DemoOnlySection>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-admin-text-secondary">
      <span
        aria-hidden="true"
        className="block h-2 w-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}