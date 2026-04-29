/**
 * Secção 3 — Despesa (dados reais).
 *
 * Cartão único com 2 zonas separadas por linha 0.5px:
 *   1. 4 colunas: Apify · OpenAI · DataForSEO · Total
 *   2. Gráfico Recharts barras empilhadas Apify + OpenAI + DataForSEO
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
import { useQuery } from "@tanstack/react-query";

import { AdminSectionHeader } from "../admin-section-header";
import { AdminCard } from "../admin-card";
import { ProgressBar } from "../progress-bar";
import { AdminInfoTooltip } from "../admin-info-tooltip";
import { ADMIN_LITERAL } from "../admin-tokens";
import { SectionError, SectionSkeleton } from "../section-state";
import { DAILY_COST_LIMIT } from "@/lib/admin/mock-data";
import type {
  CostCaps,
  Expense30d,
} from "@/lib/admin/system-queries.server";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return (await res.json()) as T;
}

const MONTH_DAYS = 30;

export function ExpenseSection() {
  const expense = useQuery({
    queryKey: ["admin", "sistema", "expense-30d"],
    queryFn: () => fetchJson<Expense30d>("/api/admin/sistema/expense-30d"),
    refetchInterval: 60_000,
  });
  const caps = useQuery({
    queryKey: ["admin", "sistema", "caps"],
    queryFn: () => fetchJson<CostCaps>("/api/admin/sistema/caps"),
  });

  if (expense.isLoading || caps.isLoading) {
    return (
      <section>
        <AdminSectionHeader
          title="Despesa"
          subtitle="o que sai"
          accent="expense"
          info="Custos operacionais reais com Apify, OpenAI e DataForSEO."
        />
        <AdminCard>
          <SectionSkeleton rows={4} rowHeight={48} />
        </AdminCard>
      </section>
    );
  }

  if (expense.error || caps.error) {
    return (
      <section>
        <AdminSectionHeader
          title="Despesa"
          subtitle="o que sai"
          accent="expense"
          info="Custos operacionais reais com Apify, OpenAI e DataForSEO."
        />
        <AdminCard>
          <SectionError
            error={expense.error ?? caps.error}
            onRetry={() => {
              expense.refetch();
              caps.refetch();
            }}
          />
        </AdminCard>
      </section>
    );
  }

  const data = expense.data!;
  const c = caps.data!;
  const chartData = data.daily.map((d) => ({
    day: d.day.slice(8, 10), // DD
    apify: Number(d.apify ?? 0),
    openai: Number(d.openai ?? 0),
    dataforseo: Number(d.dataforseo ?? 0),
  }));
  const hasData = chartData.length > 0;

  const apifyShare = data.total > 0 ? (data.apify_total / data.total) * 100 : 0;
  const openaiShare = data.total > 0 ? (data.openai_total / data.total) * 100 : 0;
  const dfsShare = data.total > 0 ? (data.dataforseo_total / data.total) * 100 : 0;

  // Projecção linear simples para o mês (assume ritmo constante).
  const project = (spent: number) => (spent / Math.max(1, chartData.length)) * MONTH_DAYS;

  const apifyProj = project(data.apify_total);
  const openaiProj = project(data.openai_total);
  const dfsProj = project(data.dataforseo_total);

  return (
    <section>
      <AdminSectionHeader
        title="Despesa"
        subtitle="o que sai"
        accent="expense"
        info="Custos operacionais com o Apify (scraping de Instagram) e OpenAI (análises com IA). Limites mensais visíveis."
      />

      <AdminCard variant="flush" className="overflow-hidden">
        {/* Zona superior: 4 colunas */}
        <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-4 md:gap-0">
          {/* Apify */}
          <ExpenseColumn
            colorVar="rgb(var(--admin-expense-500))"
            colorTextVar="rgb(var(--admin-expense-700))"
            label="APIFY"
            info={`Plataforma de scraping que recolhe dados públicos do Instagram. Cap mensal de $${c.apify}.`}
            value={`$${data.apify_total.toFixed(2)}`}
            cap={`de $${c.apify.toFixed(2)}`}
            note={`${Math.round((data.apify_total / c.apify) * 100)}% do limite · projecção $${apifyProj.toFixed(2)}`}
            borderRight
          >
            <ProgressBar
              value={data.apify_total}
              max={c.apify}
              color="expense"
              showCap
            />
          </ExpenseColumn>

          {/* OpenAI */}
          <ExpenseColumn
            colorVar="rgb(var(--admin-info-500))"
            colorTextVar="rgb(var(--admin-info-700))"
            label="OPENAI"
            info={`Análises com IA dos relatórios. Soft cap mensal de $${c.openai}.`}
            value={`$${data.openai_total.toFixed(2)}`}
            cap={`de $${c.openai.toFixed(2)} · soft cap`}
            note={`${Math.round((data.openai_total / c.openai) * 100)}% do limite · projecção $${openaiProj.toFixed(2)}`}
            borderRight
          >
            <ProgressBar
              value={data.openai_total}
              max={c.openai}
              color="info"
            />
          </ExpenseColumn>

          {/* DataForSEO */}
          <ExpenseColumn
            colorVar={ADMIN_LITERAL.expenseChartDataForSeo}
            colorTextVar={ADMIN_LITERAL.expenseChartDataForSeo}
            label="DATAFORSEO"
            info={`Sinais de mercado e tendências (Google Trends/Keywords). Cap mensal de $${c.dataforseo}.`}
            value={`$${data.dataforseo_total.toFixed(2)}`}
            cap={`de $${c.dataforseo.toFixed(2)}`}
            note={
              data.dataforseo_balance != null
                ? `${data.dataforseo_calls} chamadas · saldo $${data.dataforseo_balance.toFixed(2)}`
                : `${data.dataforseo_calls} chamadas · projecção $${dfsProj.toFixed(2)}`
            }
            borderRight
          >
            <ProgressBar
              value={data.dataforseo_total}
              max={c.dataforseo}
              color="signal"
            />
          </ExpenseColumn>

          {/* Total */}
          <ExpenseColumn
            colorVar="rgb(var(--admin-neutral-600))"
            colorTextVar="rgb(var(--admin-revenue-700))"
            label="DESPESA TOTAL"
            info="Soma das três despesas operacionais (Apify + OpenAI + DataForSEO)."
            value={`$${data.total.toFixed(2)}`}
            cap={`últimos 30 dias`}
            note={`Apify ${apifyShare.toFixed(0)}% · OpenAI ${openaiShare.toFixed(0)}% · DFS ${dfsShare.toFixed(0)}%`}
          >
            <ProgressBar
              segments={[
                { value: apifyShare, color: "expense" },
                { value: openaiShare, color: "info" },
                { value: dfsShare, color: "signal" },
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
              Stack Apify + OpenAI + DataForSEO · linha tracejada vermelha = limite diário equivalente
              {" "}${DAILY_COST_LIMIT.toFixed(2)}
            </p>
          </div>

          {!hasData ? (
            <div className="flex h-44 items-center justify-center text-center text-[13px] text-admin-text-tertiary">
              Sem dados ainda — primeira sincronização decorre à meia-noite UTC ou usa
              "Sincronizar agora" na tab Sistema.
            </div>
          ) : (
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
                    name === "apify"
                      ? "Apify"
                      : name === "openai"
                        ? "OpenAI"
                        : "DataForSEO",
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
                />
                <Bar
                  dataKey="dataforseo"
                  stackId="c"
                  fill={ADMIN_LITERAL.expenseChartDataForSeo}
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
          )}
        </div>
      </AdminCard>
    </section>
  );
}

function ExpenseColumn({
  colorVar,
  colorTextVar,
  label,
  info,
  value,
  cap,
  note,
  children,
  borderRight,
}: {
  colorVar: string;
  colorTextVar: string;
  label: string;
  info?: string;
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
        {info ? <AdminInfoTooltip label={info} /> : null}
      </div>
      <div className="mb-2.5 flex items-baseline gap-2">
        <span className="font-mono text-[2.25rem] font-medium tracking-[-0.03em] leading-none text-admin-text-primary">
          {value}
        </span>
        <span className="text-[11px] text-admin-text-tertiary">{cap}</span>
      </div>
      <div className="relative">
        {children}
        {/* Label "CAP" acima do marcador vermelho da progress bar (apenas em barras com showCap = Apify) */}
        {label === "APIFY" ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-3 right-0 -translate-x-[2px] font-mono text-[8px] font-medium tracking-[0.1em] text-admin-danger-700"
          >
            CAP
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-[11px]" style={{ color: colorTextVar }}>
        {note}
      </p>
    </div>
  );
}