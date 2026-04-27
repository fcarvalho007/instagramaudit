/**
 * Secção 3 — Despesa.
 *
 * Cartão único com 2 zonas separadas por linha 0.5px:
 *   1. 3 colunas: Apify (com cap), OpenAI, Total (barra segmentada)
 *   2. Gráfico Recharts barras empilhadas Apify + OpenAI com ReferenceLine
 *      tracejada vermelha em $0.97 (limite diário).
 */

import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AdminSectionHeader } from "../admin-section-header";
import { AdminCard } from "../admin-card";
import { ProgressBar } from "../progress-bar";
import { ADMIN_LITERAL } from "../admin-tokens";
import {
  DAILY_COST_LIMIT,
  MOCK_DAILY_COSTS,
  MOCK_EXPENSE,
} from "@/lib/admin/mock-data";

export function ExpenseSection() {
  const t = MOCK_EXPENSE;
  const chartData = MOCK_DAILY_COSTS.map((d) => ({ ...d }));

  return (
    <section>
      <AdminSectionHeader title="Despesa" subtitle="o que sai" accent="expense" />

      <AdminCard variant="flush" className="overflow-hidden">
        {/* Zona superior: 3 colunas */}
        <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-3 md:gap-0">
          {/* Apify */}
          <ExpenseColumn
            colorVar="rgb(var(--admin-expense-500))"
            colorTextVar="rgb(var(--admin-expense-700))"
            label={t.apify.label}
            value={`$${t.apify.spent.toFixed(2)}`}
            cap={`de $${t.apify.cap.toFixed(2)}`}
            note={`63% do limite · projecção $${t.apify.projection.toFixed(2)}`}
            borderRight
          >
            <ProgressBar
              value={t.apify.spent}
              max={t.apify.cap}
              color="expense"
              showCap
            />
          </ExpenseColumn>

          {/* OpenAI */}
          <ExpenseColumn
            colorVar="rgb(var(--admin-info-500))"
            colorTextVar="rgb(var(--admin-info-700))"
            label={t.openai.label}
            value={`$${t.openai.spent.toFixed(2)}`}
            cap={`de $${t.openai.cap.toFixed(2)} · soft cap`}
            note={`39% do limite · projecção $${t.openai.projection.toFixed(2)}`}
            borderRight
          >
            <ProgressBar
              value={t.openai.spent}
              max={t.openai.cap}
              color="info"
            />
          </ExpenseColumn>

          {/* Total */}
          <ExpenseColumn
            colorVar="rgb(var(--admin-neutral-600))"
            colorTextVar="rgb(var(--admin-revenue-700))"
            label="DESPESA TOTAL"
            value={`$${t.total.spent.toFixed(2)}`}
            cap={`${t.total.revenuePct}% da receita`}
            note={`margem operacional ${t.total.operatingMarginPct}%`}
          >
            <ProgressBar
              segments={[
                { value: t.total.apifyShare, color: "expense" },
                { value: t.total.openaiShare, color: "info" },
              ]}
            />
          </ExpenseColumn>
        </div>

        {/* Linha separadora */}
        <div className="border-t border-admin-border" />

        {/* Zona inferior: gráfico de custos */}
        <div className="p-6">
          <div className="mb-3">
            <p className="m-0 text-sm font-medium text-admin-text-primary">
              Custos diários · últimos 30 dias
            </p>
            <p className="mt-0.5 text-[11px] text-admin-text-tertiary">
              Stack Apify + OpenAI · linha tracejada = limite diário equivalente
              {" "}${DAILY_COST_LIMIT.toFixed(2)}
            </p>
          </div>

          <div
            role="img"
            aria-label={`Custos diários por fornecedor, com limite de $${DAILY_COST_LIMIT.toFixed(2)} por dia.`}
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
                  tickFormatter={(v) => `$${(v as number).toFixed(2)}`}
                  width={50}
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
                    `$${value.toFixed(2)}`,
                    name === "apify" ? "Apify" : "OpenAI",
                  ]}
                  labelFormatter={(label) => `Dia ${label}`}
                />
                <Bar
                  dataKey="apify"
                  stackId="c"
                  fill={ADMIN_LITERAL.expenseChartApify}
                />
                <Bar
                  dataKey="openai"
                  stackId="c"
                  fill={ADMIN_LITERAL.expenseChartOpenAI}
                  radius={[3, 3, 0, 0]}
                />
                <ReferenceLine
                  y={DAILY_COST_LIMIT}
                  stroke={ADMIN_LITERAL.capLine}
                  strokeDasharray="5 4"
                  strokeWidth={1.2}
                  label={{
                    value: `limite diário · $${DAILY_COST_LIMIT.toFixed(2)}`,
                    position: "insideTopRight",
                    fill: ADMIN_LITERAL.capLine,
                    fontSize: 10,
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </AdminCard>
    </section>
  );
}

function ExpenseColumn({
  colorVar,
  colorTextVar,
  label,
  value,
  cap,
  note,
  children,
  borderRight,
}: {
  colorVar: string;
  colorTextVar: string;
  label: string;
  value: string;
  cap: string;
  note: string;
  children: React.ReactNode;
  borderRight?: boolean;
}) {
  return (
    <div
      className={
        borderRight
          ? "md:pr-6 md:mr-0 md:border-r md:border-admin-border"
          : "md:pl-6"
      }
    >
      <div className="mb-2.5 flex items-center gap-2">
        <span
          aria-hidden="true"
          className="block h-2 w-2 rounded-sm"
          style={{ backgroundColor: colorVar }}
        />
        <span className="admin-eyebrow" style={{ color: colorTextVar }}>
          {label}
        </span>
      </div>
      <div className="mb-2.5 flex items-baseline gap-2">
        <span className="font-mono text-[1.375rem] font-medium tracking-tight leading-tight text-admin-text-primary">
          {value}
        </span>
        <span className="text-[11px] text-admin-text-tertiary">{cap}</span>
      </div>
      {children}
      <p className="mt-2 text-[11px]" style={{ color: colorTextVar }}>
        {note}
      </p>
    </div>
  );
}