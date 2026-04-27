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
import {
  CHART_AXIS_LINE,
  CHART_AXIS_TICK,
  CHART_GRID_STROKE,
  DARK_TOOLTIP_PROPS,
} from "../charts/chart-tooltip";
import { MOCK_DAILY_REVENUE, MOCK_REVENUE_KPIS } from "@/lib/admin/mock-data";

const TIPS = {
  section:
    "Inclui MRR (subscrições recorrentes) e vendas avulsas. MRR é a métrica de saúde primária do negócio SaaS.",
  mrr: "Monthly Recurring Revenue: receita previsível mensal das subscrições activas. A métrica mais importante de um SaaS.",
  total:
    "Soma de toda a receita: subscrições + vendas avulsas de relatórios.",
  oneOff:
    "Receita de relatórios comprados individualmente, sem subscrição. Cada relatório custa €29.",
};

export function RevenueSection() {
  const totalSubs = MOCK_DAILY_REVENUE.reduce((acc, d) => acc + d.subs, 0);
  const totalOneOff = MOCK_DAILY_REVENUE.reduce((acc, d) => acc + d.oneOff, 0);
  // Recharts espera array mutável; o mock é `as const`.
  const chartData = MOCK_DAILY_REVENUE.map((d) => ({ ...d }));

  return (
    <section>
      <AdminSectionHeader
        title="Receita"
        subtitle="o que entra"
        accent="revenue"
        info={TIPS.section}
      />

      <div className="mb-4 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* Hero: MRR — saúde do negócio (receita previsível) */}
        <KPICard
          variant="hero"
          size="hero"
          eyebrow={MOCK_REVENUE_KPIS.mrr.eyebrow}
          value={MOCK_REVENUE_KPIS.mrr.value}
          delta={{
            text: MOCK_REVENUE_KPIS.mrr.deltaText,
            direction: MOCK_REVENUE_KPIS.mrr.deltaDirection,
          }}
          sub={MOCK_REVENUE_KPIS.mrr.sub}
          info={TIPS.mrr}
          className="lg:col-span-2"
        />
        <KPICard
          size="lg"
          eyebrow={MOCK_REVENUE_KPIS.total.eyebrow}
          value={MOCK_REVENUE_KPIS.total.value}
          delta={{
            text: MOCK_REVENUE_KPIS.total.deltaText,
            direction: MOCK_REVENUE_KPIS.total.deltaDirection,
          }}
          sub={MOCK_REVENUE_KPIS.total.sub}
          info={TIPS.total}
        />
        <KPICard
          size="lg"
          eyebrow={MOCK_REVENUE_KPIS.oneOff.eyebrow}
          value={MOCK_REVENUE_KPIS.oneOff.value}
          highlightSub={{
            text: MOCK_REVENUE_KPIS.oneOff.highlightText,
            accent: "revenue-alt",
          }}
          sub={MOCK_REVENUE_KPIS.oneOff.sub}
          info={TIPS.oneOff}
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
                stroke={CHART_GRID_STROKE}
                vertical={false}
              />
              <XAxis
                dataKey="day"
                tick={CHART_AXIS_TICK}
                tickLine={false}
                axisLine={{ stroke: CHART_AXIS_LINE }}
                interval={2}
              />
              <YAxis
                tick={CHART_AXIS_TICK}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `€${v}`}
                width={40}
              />
              <Tooltip
                {...DARK_TOOLTIP_PROPS}
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