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

import { AdminSectionHeader } from "../admin-section-header";
import { AdminCard } from "../admin-card";
import { KPICard } from "../kpi-card";
import { ADMIN_LITERAL } from "../admin-tokens";
import { MOCK_DAILY_REVENUE, MOCK_REVENUE_KPIS } from "@/lib/admin/mock-data";

export function RevenueSection() {
  const totalSubs = MOCK_DAILY_REVENUE.reduce((acc, d) => acc + d.subs, 0);
  const totalOneOff = MOCK_DAILY_REVENUE.reduce((acc, d) => acc + d.oneOff, 0);
  // Recharts espera array mutável; o mock é `as const`.
  const chartData = MOCK_DAILY_REVENUE.map((d) => ({ ...d }));

  return (
    <section className="flex flex-col gap-4">
      <AdminSectionHeader
        title="Receita"
        subtitle="o que entra"
        accent="revenue"
        info="Inclui MRR (subscrições recorrentes) e vendas avulsas. MRR é a métrica de saúde primária do negócio SaaS."
      />

      <div className="grid gap-3 grid-cols-1 lg:grid-cols-[1.4fr_1fr_1fr]">
        {/* Hero: MRR — receita previsível, mono 56px */}
        <KPICard
          variant="hero"
          size="hero"
          eyebrow={MOCK_REVENUE_KPIS.mrr.eyebrow}
          info="Monthly Recurring Revenue: receita previsível mensal das subscrições activas. A métrica mais importante de um SaaS."
          value={MOCK_REVENUE_KPIS.mrr.value}
          delta={{
            text: MOCK_REVENUE_KPIS.mrr.deltaText,
            direction: MOCK_REVENUE_KPIS.mrr.deltaDirection,
          }}
          sub={MOCK_REVENUE_KPIS.mrr.sub}
        />
        <KPICard
          variant="accent-left"
          accent="revenue"
          size="lg"
          eyebrow={MOCK_REVENUE_KPIS.total.eyebrow}
          info="Soma de toda a receita: subscrições + vendas avulsas de relatórios."
          value={MOCK_REVENUE_KPIS.total.value}
          delta={{
            text: MOCK_REVENUE_KPIS.total.deltaText,
            direction: MOCK_REVENUE_KPIS.total.deltaDirection,
          }}
          sub={MOCK_REVENUE_KPIS.total.sub}
        />
        <KPICard
          variant="accent-left"
          accent="revenue-alt"
          size="lg"
          eyebrow={MOCK_REVENUE_KPIS.oneOff.eyebrow}
          info="Receita de relatórios comprados individualmente, sem subscrição. Cada relatório custa €29."
          value={MOCK_REVENUE_KPIS.oneOff.value}
          highlightSub={{
            text: MOCK_REVENUE_KPIS.oneOff.highlightText,
            accent: "revenue-alt",
          }}
          sub={MOCK_REVENUE_KPIS.oneOff.sub}
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