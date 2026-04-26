/**
 * Secção 2 — Receita.
 *
 * Linha 1: 3 KPI cards (MRR accent verde, Avulso accent verde-alt, Total hero).
 * Cartão abaixo: gráfico Recharts de barras empilhadas (subscrições + avulso)
 * em 26 dias, com legenda inline customizada à direita do header.
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
import { KPICard } from "../kpi-card";
import { ADMIN_BORDER, ADMIN_LITERAL } from "../admin-tokens";
import { MOCK_DAILY_REVENUE, MOCK_REVENUE_KPIS } from "@/lib/admin/mock-data";

export function RevenueSection() {
  const totalSubs = MOCK_DAILY_REVENUE.reduce((acc, d) => acc + d.subs, 0);
  const totalOneOff = MOCK_DAILY_REVENUE.reduce((acc, d) => acc + d.oneOff, 0);

  return (
    <section>
      <AdminSectionHeader title="Receita" subtitle="o que entra" accent="revenue" />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <KPICard
          variant="accent-left"
          accent="revenue"
          eyebrow={MOCK_REVENUE_KPIS.mrr.eyebrow}
          value={MOCK_REVENUE_KPIS.mrr.value}
          delta={{
            text: MOCK_REVENUE_KPIS.mrr.deltaText,
            direction: MOCK_REVENUE_KPIS.mrr.deltaDirection,
          }}
          sub={MOCK_REVENUE_KPIS.mrr.sub}
        />
        <KPICard
          variant="accent-left"
          accent="revenue-alt"
          eyebrow={MOCK_REVENUE_KPIS.oneOff.eyebrow}
          value={MOCK_REVENUE_KPIS.oneOff.value}
          highlightSub={{
            text: MOCK_REVENUE_KPIS.oneOff.highlightText,
            accent: "revenue-alt",
          }}
          sub={MOCK_REVENUE_KPIS.oneOff.sub}
        />
        <KPICard
          variant="highlighted"
          eyebrow={MOCK_REVENUE_KPIS.total.eyebrow}
          value={MOCK_REVENUE_KPIS.total.value}
          delta={{
            text: MOCK_REVENUE_KPIS.total.deltaText,
            direction: MOCK_REVENUE_KPIS.total.deltaDirection,
          }}
          sub={MOCK_REVENUE_KPIS.total.sub}
        />
      </div>

      <div
        style={{
          backgroundColor: "#ffffff",
          border: ADMIN_BORDER,
          borderRadius: 12,
          padding: "1.25rem 1.5rem",
        }}
      >
        <div
          className="flex flex-wrap items-end justify-between gap-3"
          style={{ marginBottom: 12 }}
        >
          <div>
            <p
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: "rgb(var(--admin-neutral-900))",
                margin: 0,
              }}
            >
              Evolução diária
            </p>
            <p
              style={{
                fontSize: 11,
                color: "rgb(var(--admin-neutral-400))",
                marginTop: 2,
              }}
            >
              Mês corrente · subscrições constantes + avulso a crescer
            </p>
          </div>
          <div className="flex items-center gap-4">
            <LegendDot color={ADMIN_LITERAL.revenueChartSubs} label="Subscrições" />
            <LegendDot color={ADMIN_LITERAL.revenueChartOneOff} label="Avulso" />
          </div>
        </div>

        <div
          role="img"
          aria-label={`Evolução diária da receita: subscrições €${totalSubs}, avulso €${totalOneOff} no mês.`}
          style={{ position: "relative", width: "100%", height: 180 }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={MOCK_DAILY_REVENUE}
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
                  border: "0.5px solid rgb(211,209,199)",
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
      </div>
    </section>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 11,
        color: "rgb(var(--admin-neutral-600))",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          backgroundColor: color,
        }}
      />
      {label}
    </span>
  );
}