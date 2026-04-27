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
  CHART_AXIS_LINE,
  CHART_AXIS_TICK,
  CHART_GRID_STROKE,
  DARK_TOOLTIP_PROPS,
} from "../charts/chart-tooltip";
import {
  DAILY_COST_LIMIT,
  MOCK_DAILY_COSTS,
  MOCK_EXPENSE,
} from "@/lib/admin/mock-data";

const TIPS = {
  section:
    "Custos operacionais com o Apify (scraping de Instagram) e OpenAI (análises com IA). Limites mensais visíveis.",
  apify:
    "Plataforma de scraping que recolhe dados públicos do Instagram. Cap mensal de $29.",
  openai:
    "Análises com IA dos relatórios. Soft cap mensal definido em $25.",
  total:
    "Soma das duas despesas operacionais. Comparada com a receita, indica a margem real do negócio.",
};

export function ExpenseSection() {
  const t = MOCK_EXPENSE;
  const chartData = MOCK_DAILY_COSTS.map((d) => ({ ...d }));

  return (
    <section>
      <AdminSectionHeader
        title="Despesa"
        subtitle="o que sai"
        accent="expense"
        info={TIPS.section}
      />

      <AdminCard variant="flush" className="overflow-hidden">
        {/* Zona superior: 3 colunas com border-right */}
        <div
          className="grid grid-cols-1 md:grid-cols-3"
          style={{ padding: "28px 0" }}
        >
          {/* Apify */}
          <ExpenseColumn
            colorVar="rgb(var(--admin-expense-500))"
            colorTextVar="rgb(var(--admin-expense-700))"
            label={t.apify.label}
            value={`$${t.apify.spent.toFixed(2)}`}
            cap={`de $${t.apify.cap.toFixed(2)}`}
            note={`63% do limite · projecção $${t.apify.projection.toFixed(2)}`}
            tip={TIPS.apify}
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
            tip={TIPS.openai}
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
            tip={TIPS.total}
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
        <div style={{ padding: "28px 32px" }}>
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
                  tickFormatter={(v) => `$${(v as number).toFixed(2)}`}
                  width={50}
                />
                <Tooltip
                  {...DARK_TOOLTIP_PROPS}
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
                  radius={3}
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
                    value: "CAP",
                    position: "right",
                    fill: ADMIN_LITERAL.capLine,
                    fontSize: 8,
                    fontFamily: "JetBrains Mono, monospace",
                    letterSpacing: "0.1em",
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
  tip,
  children,
  borderRight,
}: {
  colorVar: string;
  colorTextVar: string;
  label: string;
  value: string;
  cap: string;
  note: string;
  tip?: string;
  children: React.ReactNode;
  borderRight?: boolean;
}) {
  // import dentro da função para evitar ciclo de imports
  // (preferível a top-level porque AdminInfoTooltip é componente isolado)
  return (
    <div
      className={
        borderRight ? "md:border-r md:border-admin-border" : ""
      }
      style={{ padding: "0 28px" }}
    >
      <div className="mb-3 flex items-center gap-2">
        <span
          aria-hidden="true"
          className="block h-2 w-2 rounded-sm"
          style={{ backgroundColor: colorVar }}
        />
        <span className="admin-eyebrow" style={{ color: colorTextVar }}>
          {label}
        </span>
        {tip ? <ExpenseTooltip text={tip} /> : null}
      </div>
      <div className="mb-3 flex items-baseline gap-2">
        <span
          className="admin-num font-medium text-admin-text-primary"
          style={{ fontSize: 36, letterSpacing: "-0.03em", lineHeight: 1.05 }}
        >
          {value}
        </span>
        <span className="text-[12px] text-admin-text-tertiary">{cap}</span>
      </div>
      {children}
      <p
        className="mt-2.5"
        style={{ color: colorTextVar, fontSize: 12 }}
      >
        {note}
      </p>
    </div>
  );
}

// Lazy import equivalent — placed at bottom to keep the patch focused.
function ExpenseTooltip({ text }: { text: string }) {
  // re-uso do AdminInfoTooltip; import dinâmico não é necessário em runtime,
  // mas mantemos o uso central via wrapper para clareza de leitura.
  return <AdminInfoTooltipInline text={text} />;
}

import { AdminInfoTooltip as AdminInfoTooltipInline } from "../admin-info-tooltip";