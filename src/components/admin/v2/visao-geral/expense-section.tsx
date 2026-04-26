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
import { ProgressBar } from "../progress-bar";
import { ADMIN_BORDER, ADMIN_LITERAL } from "../admin-tokens";
import {
  DAILY_COST_LIMIT,
  MOCK_DAILY_COSTS,
  MOCK_EXPENSE,
} from "@/lib/admin/mock-data";

export function ExpenseSection() {
  const t = MOCK_EXPENSE;

  return (
    <section>
      <AdminSectionHeader title="Despesa" subtitle="o que sai" accent="expense" />

      <div
        style={{
          backgroundColor: "#ffffff",
          border: ADMIN_BORDER,
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        {/* Zona superior: 3 colunas */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            padding: "1.25rem 1.5rem",
          }}
        >
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
        <div
          style={{
            height: 0,
            borderTop: ADMIN_BORDER,
          }}
        />

        {/* Zona inferior: gráfico de custos */}
        <div style={{ padding: "1.25rem 1.5rem" }}>
          <div style={{ marginBottom: 12 }}>
            <p
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: "rgb(var(--admin-neutral-900))",
                margin: 0,
              }}
            >
              Custos diários
            </p>
            <p
              style={{
                fontSize: 11,
                color: "rgb(var(--admin-neutral-400))",
                marginTop: 2,
              }}
            >
              Stack Apify + OpenAI · linha tracejada = limite diário equivalente
              ${DAILY_COST_LIMIT.toFixed(2)}
            </p>
          </div>

          <div
            role="img"
            aria-label={`Custos diários por fornecedor, com limite de $${DAILY_COST_LIMIT.toFixed(2)} por dia.`}
            style={{ position: "relative", width: "100%", height: 180 }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={MOCK_DAILY_COSTS}
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
                    border: "0.5px solid rgb(211,209,199)",
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
      </div>
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
      style={{
        paddingRight: borderRight ? 20 : 0,
        paddingLeft: 0,
        marginRight: borderRight ? 20 : 0,
        borderRight: borderRight ? ADMIN_BORDER : "none",
      }}
    >
      <div
        className="flex items-center gap-2"
        style={{ marginBottom: 10 }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 8,
            height: 8,
            borderRadius: 2,
            backgroundColor: colorVar,
          }}
        />
        <span
          className="admin-eyebrow"
          style={{ color: colorTextVar }}
        >
          {label}
        </span>
      </div>
      <div
        className="flex items-baseline gap-2"
        style={{ marginBottom: 10 }}
      >
        <span
          style={{
            fontSize: 22,
            fontWeight: 500,
            letterSpacing: "-0.01em",
            color: "rgb(var(--admin-neutral-900))",
            lineHeight: 1.1,
          }}
        >
          {value}
        </span>
        <span
          style={{
            fontSize: 11,
            color: "rgb(var(--admin-neutral-400))",
          }}
        >
          {cap}
        </span>
      </div>
      {children}
      <p
        style={{
          marginTop: 8,
          fontSize: 11,
          color: colorTextVar,
        }}
      >
        {note}
      </p>
    </div>
  );
}