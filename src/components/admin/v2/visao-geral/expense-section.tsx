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
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { AdminSectionHeader } from "../admin-section-header";
import { AdminCard } from "../admin-card";
import { ProgressBar } from "../progress-bar";
import { AdminInfoTooltip } from "../admin-info-tooltip";
import { ADMIN_LITERAL } from "../admin-tokens";
import { SectionError, SectionSkeleton } from "../section-state";
import { DAILY_COST_LIMIT } from "@/lib/admin/mock-data";
import { adminFetch } from "@/lib/admin/fetch";
import type {
  CostCaps,
  Expense30d,
} from "@/lib/admin/system-queries.server";
import type { ApifyActorBreakdown, OpenAiActorBreakdown } from "@/lib/admin/system-queries.server";

/* ── Actor color mapping ───────────────────────────────────────────── */

const ACTOR_COLOR: Record<string, string> = {
  "apify/instagram-profile-scraper": ADMIN_LITERAL.apifyActorProfile,
  "apify/instagram-comment-scraper": ADMIN_LITERAL.apifyActorComments,
  "apify/instagram-scraper": ADMIN_LITERAL.apifyActorScraper,
};

const ACTOR_SHORT_LABEL: Record<string, string> = {
  "apify/instagram-profile-scraper": "Perfil",
  "apify/instagram-comment-scraper": "Comentários",
  "apify/instagram-scraper": "Scraper",
};

function actorColor(actor: string): string {
  return ACTOR_COLOR[actor] ?? ADMIN_LITERAL.apifyActorDefault;
}
function actorShortLabel(actor: string): string {
  return ACTOR_SHORT_LABEL[actor] ?? actor.split("/").pop() ?? actor;
}

/* ── OpenAI actor color/label mapping ──────────────────────────────── */

function openaiActorColor(actor: string): string {
  if (actor === "visual-cover-analysis") return ADMIN_LITERAL.openaiActorVisualCover;
  if (actor.startsWith("insights:")) return ADMIN_LITERAL.openaiActorInsights;
  return ADMIN_LITERAL.openaiActorDefault;
}

function openaiActorShortLabel(actor: string): string {
  if (actor === "visual-cover-analysis") return "Visual covers";
  if (actor.startsWith("insights:")) return "Insights (texto)";
  return actor;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await adminFetch(url);
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

  // Hooks must be called unconditionally (before early returns).
  const dailyData = expense.data?.daily ?? [];

  const allActorKeys = useMemo(() => {
    const set = new Set<string>();
    for (const d of dailyData) {
      if (d.apify_by_actor) {
        for (const k of Object.keys(d.apify_by_actor)) set.add(k);
      }
    }
    const known = [
      "apify/instagram-profile-scraper",
      "apify/instagram-comment-scraper",
      "apify/instagram-scraper",
    ].filter((a) => set.has(a));
    const rest = [...set].filter((a) => !known.includes(a)).sort();
    return [...known, ...rest];
  }, [dailyData]);

  const hasActorBreakdown = allActorKeys.length > 0;

  const allOpenaiActorKeys = useMemo(() => {
    const set = new Set<string>();
    for (const d of dailyData) {
      if (d.openai_by_actor) {
        for (const k of Object.keys(d.openai_by_actor)) set.add(k);
      }
    }
    // insights first, then visual-cover, then rest
    const insights = [...set].filter((a) => a.startsWith("insights:")).sort();
    const visual = set.has("visual-cover-analysis") ? ["visual-cover-analysis"] : [];
    const rest = [...set].filter((a) => !a.startsWith("insights:") && a !== "visual-cover-analysis").sort();
    return [...insights, ...visual, ...rest];
  }, [dailyData]);

  const hasOpenaiActorBreakdown = allOpenaiActorKeys.length > 0;

  const chartData = useMemo(() =>
    dailyData.map((d) => {
      const row: Record<string, string | number> = {
        day: d.day.slice(8, 10),
        apify: Number(d.apify ?? 0),
        openai: Number(d.openai ?? 0),
        dataforseo: Number(d.dataforseo ?? 0),
      };
      if (hasActorBreakdown && d.apify_by_actor) {
        for (const actor of allActorKeys) {
          row[`apify_${actor}`] = Number(d.apify_by_actor[actor] ?? 0);
        }
      }
      if (hasOpenaiActorBreakdown && d.openai_by_actor) {
        for (const actor of allOpenaiActorKeys) {
          row[`openai_${actor}`] = Number(d.openai_by_actor[actor] ?? 0);
        }
      }
      return row;
    }),
  [dailyData, allActorKeys, hasActorBreakdown, allOpenaiActorKeys, hasOpenaiActorBreakdown]);

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

  const hasData = chartData.length > 0;

  const apifyShare = data.total > 0 ? (data.apify_total / data.total) * 100 : 0;
  const openaiShare = data.total > 0 ? (data.openai_total / data.total) * 100 : 0;
  const dfsShare = data.total > 0 ? (data.dataforseo_total / data.total) * 100 : 0;

  // Projecção linear simples para o mês (assume ritmo constante).
  const project = (spent: number) => (spent / Math.max(1, chartData.length)) * MONTH_DAYS;

  const apifyProj = project(data.apify_total);
  const openaiProj = project(data.openai_total);
  const dfsProj = project(data.dataforseo_total);

  // Reconciliação Apify: o custo agregado a partir de provider_call_logs
  // pode divergir da fatura real da Apify (cobra runs falhados, runs em
  // background, etc.). Quando o sync já correu, mostramos a diferença.
  const apifyBilled = data.apify_billed_total_30d;
  const apifyDelta =
    apifyBilled != null ? apifyBilled - data.apify_total : null;
  const apifyDivergent =
    apifyDelta != null &&
    Math.abs(apifyDelta) > 0.01 &&
    data.apify_total > 0 &&
    Math.abs(apifyDelta / data.apify_total) > 0.05;

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
          {/* Apify — sem actor rows aqui, ficam abaixo */}
          <ExpenseColumn
            colorVar="rgb(var(--admin-expense-500))"
            colorTextVar="rgb(var(--admin-expense-700))"
            label="APIFY"
            info={`Plataforma de scraping que recolhe dados públicos do Instagram. Cap mensal de $${c.apify}.`}
            value={`$${data.apify_total.toFixed(2)}`}
            cap={`de $${c.apify.toFixed(2)}`}
            note={
              apifyDivergent
                ? `${Math.round((data.apify_total / c.apify) * 100)}% do limite · Apify faturou $${apifyBilled!.toFixed(2)} (Δ $${apifyDelta!.toFixed(2)})`
                : `${Math.round((data.apify_total / c.apify) * 100)}% do limite · projecção $${apifyProj.toFixed(2)}`
            }
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

        {/* Actor breakdown table — faixa horizontal */}
        {data.apify_actors.length > 0 && (
          <>
            <div className="border-t border-admin-border" />
            <div className="px-6 py-4">
              <p className="mb-3 text-eyebrow-sm text-admin-text-tertiary uppercase tracking-wider">
                Breakdown por ator Apify
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="text-left text-admin-text-tertiary border-b border-admin-border">
                      <th className="pb-1.5 pr-4 font-medium">Ator</th>
                      <th className="pb-1.5 pr-4 font-medium text-right">Custo</th>
                      <th className="pb-1.5 pr-4 font-medium text-right">Runs</th>
                      <th className="pb-1.5 pr-4 font-medium text-right">Resultados</th>
                      <th className="pb-1.5 pr-4 font-medium text-right">Média/run</th>
                      <th className="pb-1.5 font-medium text-right">Fonte</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.apify_actors.map((actor) => (
                      <ApifyActorTableRow key={actor.actor} actor={actor} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* OpenAI actor breakdown table */}
        {data.openai_actors && data.openai_actors.length > 0 && (
          <>
            <div className="border-t border-admin-border" />
            <div className="px-6 py-4">
              <p className="mb-3 text-eyebrow-sm text-admin-text-tertiary uppercase tracking-wider">
                Breakdown por ator OpenAI
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="text-left text-admin-text-tertiary border-b border-admin-border">
                      <th className="pb-1.5 pr-4 font-medium">Ator</th>
                      <th className="pb-1.5 pr-4 font-medium text-right">Custo</th>
                      <th className="pb-1.5 pr-4 font-medium text-right">Chamadas</th>
                      <th className="pb-1.5 pr-4 font-medium text-right">Tokens (P+C)</th>
                      <th className="pb-1.5 pr-4 font-medium text-right">Média/chamada</th>
                      <th className="pb-1.5 font-medium text-right">Modelo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.openai_actors.map((actor) => (
                      <OpenAiActorTableRow key={actor.actor} actor={actor} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Linha separadora antes do gráfico */}
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
                  content={
                    <ExpenseTooltipContent
                      actorKeys={allActorKeys}
                      hasActorBreakdown={hasActorBreakdown}
                      openaiActorKeys={allOpenaiActorKeys}
                      hasOpenaiActorBreakdown={hasOpenaiActorBreakdown}
                    />
                  }
                />
                {/* Apify — sub-barras por ator se disponíveis, senão barra única */}
                {hasActorBreakdown ? (
                  allActorKeys.map((actor, i) => (
                    <Bar
                      key={actor}
                      dataKey={`apify_${actor}`}
                      stackId="c"
                      fill={actorColor(actor)}
                      name={`apify_${actor}`}
                    />
                  ))
                ) : (
                  <Bar
                    dataKey="apify"
                    stackId="c"
                    fill={ADMIN_LITERAL.expenseChartApify}
                  />
                )}
                {/* OpenAI — sub-barras por ator se disponíveis, senão barra única */}
                {hasOpenaiActorBreakdown ? (
                  allOpenaiActorKeys.map((actor) => (
                    <Bar
                      key={`openai_${actor}`}
                      dataKey={`openai_${actor}`}
                      stackId="c"
                      fill={openaiActorColor(actor)}
                      name={`openai_${actor}`}
                    />
                  ))
                ) : (
                  <Bar
                    dataKey="openai"
                    stackId="c"
                    fill={ADMIN_LITERAL.expenseChartOpenAI}
                  />
                )}
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
  subNote,
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
  subNote?: string;
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
      {subNote ? (
        <p className="mt-0.5 text-[10px] text-admin-text-tertiary">
          {subNote}
        </p>
      ) : null}
    </div>
  );
}

const COST_SOURCE_LABEL: Record<ApifyActorBreakdown["cost_source"], { text: string; cls: string }> = {
  actual: { text: "Real", cls: "text-admin-revenue-700" },
  estimated: { text: "Estimado", cls: "text-admin-signal-700" },
  mixed: { text: "Misto", cls: "text-admin-info-700" },
  unavailable: { text: "Indisponível", cls: "text-admin-text-tertiary" },
};

/* ── Custom tooltip ────────────────────────────────────────────────── */

function ExpenseTooltipContent({
  active,
  payload,
  label,
  actorKeys,
  hasActorBreakdown,
}: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; color: string }>;
  label?: string;
  actorKeys: string[];
  hasActorBreakdown: boolean;
}) {
  if (!active || !payload?.length) return null;

  const openaiEntry = payload.find((p) => p.dataKey === "openai");
  const dfsEntry = payload.find((p) => p.dataKey === "dataforseo");

  const actorEntries = hasActorBreakdown
    ? actorKeys
        .map((actor) => {
          const entry = payload.find((p) => p.dataKey === `apify_${actor}`);
          return entry && entry.value > 0
            ? { actor, value: entry.value }
            : null;
        })
        .filter(Boolean) as Array<{ actor: string; value: number }>
    : [];

  const apifyFallback =
    !hasActorBreakdown
      ? payload.find((p) => p.dataKey === "apify")
      : null;

  const apifyTotal = hasActorBreakdown
    ? actorEntries.reduce((s, e) => s + e.value, 0)
    : (apifyFallback?.value ?? 0);

  const total =
    apifyTotal +
    (openaiEntry?.value ?? 0) +
    (dfsEntry?.value ?? 0);

  return (
    <div
      className="rounded-lg border bg-white px-3 py-2.5 shadow-sm"
      style={{
        border: "1px solid rgb(44 44 42 / 0.14)",
        fontSize: 11,
        minWidth: 180,
      }}
    >
      <p className="mb-1.5 font-medium text-gray-700">Dia {label}</p>

      {/* Apify section */}
      {(actorEntries.length > 0 || (apifyFallback && apifyFallback.value > 0)) && (
        <div className="mb-1">
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block h-2 w-2 rounded-sm"
                style={{ backgroundColor: ADMIN_LITERAL.expenseChartApify }}
              />
              <span className="font-medium text-gray-600">Apify</span>
            </span>
            <span className="tabular-nums font-semibold text-gray-800">
              ${apifyTotal.toFixed(4)}
            </span>
          </div>
          {actorEntries.map((e) => (
            <div
              key={e.actor}
              className="ml-3.5 flex items-center justify-between gap-4 text-[10px] text-gray-500"
            >
              <span className="flex items-center gap-1">
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: actorColor(e.actor) }}
                />
                {actorShortLabel(e.actor)}
              </span>
              <span className="tabular-nums">${e.value.toFixed(4)}</span>
            </div>
          ))}
        </div>
      )}

      {/* OpenAI */}
      {openaiEntry && openaiEntry.value > 0 && (
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-sm"
              style={{ backgroundColor: ADMIN_LITERAL.expenseChartOpenAI }}
            />
            <span className="text-gray-600">OpenAI</span>
          </span>
          <span className="tabular-nums text-gray-800">
            ${openaiEntry.value.toFixed(4)}
          </span>
        </div>
      )}

      {/* DataForSEO */}
      {dfsEntry && dfsEntry.value > 0 && (
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-sm"
              style={{ backgroundColor: ADMIN_LITERAL.expenseChartDataForSeo }}
            />
            <span className="text-gray-600">DataForSEO</span>
          </span>
          <span className="tabular-nums text-gray-800">
            ${dfsEntry.value.toFixed(4)}
          </span>
        </div>
      )}

      {/* Total */}
      {total > 0 && (
        <>
          <div className="my-1 border-t border-gray-200" />
          <div className="flex items-center justify-between gap-4 font-medium text-gray-800">
            <span>Total</span>
            <span className="tabular-nums">${total.toFixed(4)}</span>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Actor table row ───────────────────────────────────────────────── */

function ApifyActorTableRow({ actor }: { actor: ApifyActorBreakdown }) {
  const source = COST_SOURCE_LABEL[actor.cost_source];
  const noRuns = actor.run_count === 0 && actor.error_count === 0;
  const color = actorColor(actor.actor);

  return (
    <tr className={noRuns ? "text-admin-text-tertiary/60" : "text-admin-text-secondary"}>
      <td className="py-1.5 pr-4">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2 rounded-sm shrink-0"
            style={{ backgroundColor: color }}
          />
          <span className={noRuns ? "italic" : ""}>{actor.label}</span>
        </span>
      </td>
      <td className="py-1.5 pr-4 text-right tabular-nums font-semibold text-admin-text-primary">
        {noRuns ? "—" : `$${actor.total_cost_usd.toFixed(3)}`}
      </td>
      <td className="py-1.5 pr-4 text-right tabular-nums">
        {noRuns ? "—" : actor.run_count}
        {actor.error_count > 0 && (
          <span className="text-admin-danger-700 ml-0.5">({actor.error_count} err)</span>
        )}
      </td>
      <td className="py-1.5 pr-4 text-right tabular-nums">
        {noRuns ? "—" : actor.total_results > 0 ? actor.total_results.toLocaleString("pt-PT") : "0"}
      </td>
      <td className="py-1.5 pr-4 text-right tabular-nums">
        {actor.avg_cost_per_run != null ? `$${actor.avg_cost_per_run.toFixed(4)}` : "—"}
      </td>
      <td className={`py-1.5 text-right font-medium ${source.cls}`}>
        {noRuns ? "Sem execuções" : source.text}
      </td>
    </tr>
  );
}