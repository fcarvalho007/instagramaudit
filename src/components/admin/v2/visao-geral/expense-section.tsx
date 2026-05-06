/**
 * Secção "Custos da plataforma" — Admin /receita.
 *
 * 6 zonas visuais + banner de fiabilidade + rodapé metodológico.
 * Absorve a antiga ReconciliationSection.
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
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { AdminCard } from "../admin-card";
import { ProgressBar } from "../progress-bar";
import { ADMIN_LITERAL } from "../admin-tokens";
import { SectionError, SectionSkeleton } from "../section-state";
import { DAILY_COST_LIMIT } from "@/lib/admin/mock-data";
import { adminFetch } from "@/lib/admin/fetch";

import type {
  CostCaps,
  Expense30d,
  ApifyActorBreakdown,
  OpenAiActorBreakdown,
  ProviderLinkageRow,
} from "@/lib/admin/system-queries.server";

/* ── Types for reconciliation ──────────────────────────────────────── */

interface ProviderBreakdown {
  provider: string;
  external: number;
  internal: number;
  variance: number;
}

interface ReconciliationData {
  kpis: { externalTotal: number; internalTotal: number; variance: number; variancePct: number | null; state: string };
  daily: Array<{ date: string; internal: number; external: number; variance: number }>;
  byProvider: ProviderBreakdown[];
  byActor: Array<{ actor_or_model: string; provider: string; external: number; internal: number; variance: number }>;
  batches: Array<{
    id: string;
    provider: string;
    period_start: string;
    period_end: string;
    dashboard_total: number;
    reconciliation_status: string;
    created_at: string;
  }>;
}

/* ── Actor helpers ─────────────────────────────────────────────────── */

const ACTOR_COLOR: Record<string, string> = {
  "apify/instagram-comment-scraper": ADMIN_LITERAL.apifyActorComments,
  "apify/instagram-scraper": ADMIN_LITERAL.apifyActorScraper,
};

const ACTOR_FRIENDLY: Record<string, { name: string; desc: string }> = {
  "apify/instagram-scraper": { name: "Scraper Instagram", desc: "perfil + posts" },
  "apify/instagram-comment-scraper": { name: "Scraper de comentários", desc: "" },
};

function actorColor(actor: string): string {
  return ACTOR_COLOR[actor] ?? ADMIN_LITERAL.apifyActorDefault;
}

function openaiActorColor(actor: string): string {
  if (actor === "visual-cover-analysis") return ADMIN_LITERAL.openaiActorVisualCover;
  if (actor === "caption-semantic-analysis") return ADMIN_LITERAL.openaiActorInsights;
  if (actor.startsWith("insights:")) return ADMIN_LITERAL.openaiActorInsights;
  return ADMIN_LITERAL.openaiActorDefault;
}

function openaiOpLabel(actor: string): { name: string; type: "texto" | "imagens" } {
  if (actor === "visual-cover-analysis") return { name: "Análise visual", type: "imagens" };
  if (actor === "caption-semantic-analysis") return { name: "Legendas", type: "texto" };
  if (actor.startsWith("insights:")) return { name: "Insights", type: "texto" };
  return { name: actor, type: "texto" };
}

/* ── Generic helpers ───────────────────────────────────────────────── */

async function fetchJson<T>(url: string): Promise<T> {
  const res = await adminFetch(url);
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return (await res.json()) as T;
}

const MONTH_DAYS = 30;

const PROVIDER_SHORT: Record<string, string> = { apify: "Apify", openai: "OpenAI", dataforseo: "DFS" };
function providerShortName(p: string): string { return PROVIDER_SHORT[p] ?? p; }

const COST_SOURCE_LABEL: Record<ApifyActorBreakdown["cost_source"], { text: string; cls: string }> = {
  actual: { text: "REAL", cls: "bg-emerald-500/15 text-emerald-700" },
  estimated: { text: "ESTIM.", cls: "bg-amber-500/15 text-amber-700" },
  mixed: { text: "ESTIM. + REAL", cls: "bg-amber-500/15 text-amber-700" },
  unavailable: { text: "—", cls: "text-admin-text-tertiary" },
};

/* ════════════════════════════════════════════════════════════════════ */
/*  MAIN COMPONENT                                                     */
/* ════════════════════════════════════════════════════════════════════ */

export function ExpenseSection({ period = "30d" }: { period?: string }) {
  const days = period === "90d" ? 90 : period === "ytd" ? 365 : 30;
  const queryClient = useQueryClient();


  const expense = useQuery({
    queryKey: ["admin", "sistema", "expense-30d"],
    queryFn: () => fetchJson<Expense30d>("/api/admin/sistema/expense-30d"),
    refetchInterval: 60_000,
  });
  const caps = useQuery({
    queryKey: ["admin", "sistema", "caps"],
    queryFn: () => fetchJson<CostCaps>("/api/admin/sistema/caps"),
  });
  const recon = useQuery<ReconciliationData>({
    queryKey: ["billing-reconciliation", days],
    queryFn: () => fetchJson<ReconciliationData>(`/api/admin/billing-reconciliation?days=${days}`),
  });

  const dailyData = expense.data?.daily ?? [];

  const allActorKeys = useMemo(() => {
    const set = new Set<string>();
    for (const d of dailyData) {
      if (d.apify_by_actor) for (const k of Object.keys(d.apify_by_actor)) set.add(k);
    }
    const known = ["apify/instagram-scraper", "apify/instagram-comment-scraper"].filter((a) => set.has(a));
    const rest = [...set].filter((a) => !known.includes(a)).sort();
    return [...known, ...rest];
  }, [dailyData]);
  const hasActorBreakdown = allActorKeys.length > 0;

  const allOpenaiActorKeys = useMemo(() => {
    const set = new Set<string>();
    for (const d of dailyData) {
      if (d.openai_by_actor) for (const k of Object.keys(d.openai_by_actor)) set.add(k);
    }
    const insights = [...set].filter((a) => a.startsWith("insights:")).sort();
    const visual = set.has("visual-cover-analysis") ? ["visual-cover-analysis"] : [];
    const caption = set.has("caption-semantic-analysis") ? ["caption-semantic-analysis"] : [];
    const rest = [...set].filter((a) => !a.startsWith("insights:") && a !== "visual-cover-analysis" && a !== "caption-semantic-analysis").sort();
    return [...insights, ...visual, ...caption, ...rest];
  }, [dailyData]);
  const hasOpenaiActorBreakdown = allOpenaiActorKeys.length > 0;

  const chartData = useMemo(() =>
    dailyData.map((d) => {
      const dayNum = d.day.slice(8, 10);
      const monthNames = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
      const monthIdx = parseInt(d.day.slice(5, 7), 10) - 1;
      const row: Record<string, string | number> = {
        day: `${dayNum} ${monthNames[monthIdx] ?? ""}`,
        apify: Number(d.apify ?? 0),
        openai: Number(d.openai ?? 0),
        dataforseo: Number(d.dataforseo ?? 0),
      };
      if (hasActorBreakdown && d.apify_by_actor) {
        for (const actor of allActorKeys) row[`apify_${actor}`] = Number(d.apify_by_actor[actor] ?? 0);
      }
      if (hasOpenaiActorBreakdown && d.openai_by_actor) {
        for (const actor of allOpenaiActorKeys) row[`openai_${actor}`] = Number(d.openai_by_actor[actor] ?? 0);
      }
      return row;
    }),
  [dailyData, allActorKeys, hasActorBreakdown, allOpenaiActorKeys, hasOpenaiActorBreakdown]);

  /* ── Loading / Error states ──────────────────────────────────────── */

  if (expense.isLoading || caps.isLoading) {
    return (
      <section>
        <SectionHeader />
        <AdminCard><SectionSkeleton rows={4} rowHeight={48} /></AdminCard>
      </section>
    );
  }

  if (expense.error || caps.error) {
    return (
      <section>
        <SectionHeader />
        <AdminCard>
          <SectionError error={expense.error ?? caps.error} onRetry={() => { expense.refetch(); caps.refetch(); }} />
        </AdminCard>
      </section>
    );
  }

  const data = expense.data!;
  const c = caps.data!;
  const hasChartData = chartData.length > 0;

  const apifyShare = data.total > 0 ? (data.apify_total / data.total) * 100 : 0;
  const openaiShare = data.total > 0 ? (data.openai_total / data.total) * 100 : 0;
  const dfsShare = data.total > 0 ? (data.dataforseo_total / data.total) * 100 : 0;

  const linkageRatePct = data.provider_linkage_rate_pct;
  const unlinkedCalls = data.provider_calls_unlinked_30d;
  const totalCalls = data.provider_calls_total_30d;

  const reconByProvider = recon.data?.byProvider ?? [];
  const reconBatches = recon.data?.batches ?? [];
  const lastApifyBatch = reconBatches.find((b) => b.provider === "apify");

  const reconRows = buildReconRows(data, reconByProvider);
  const pendingCount = reconRows.filter((r) => r.status === "PENDENTE").length;

  return (
    <section
      className="space-y-8"
      style={{
        background: "#F7F6F2",
        border: "1px solid #E5E3D9",
        borderRadius: 20,
        padding: "32px 28px",
      }}
    >
      <SectionHeader />

      {/* ════ BANNER DE FIABILIDADE ════════════════════════════════════ */}
      {linkageRatePct < 80 && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-5 py-4">
          <span className="mt-0.5 text-amber-600" aria-hidden="true">⚠</span>
          <div className="flex-1 text-[13px] text-amber-900 leading-relaxed">
            <span className="font-semibold">Fiabilidade do histórico ainda baixa</span>
            {" · "}
            <span className="font-semibold">{linkageRatePct.toFixed(1)}%</span>
            <br />
            {unlinkedCalls} chamadas (de {totalCalls}) ainda não estão associadas a uma análise.
            Os custos por análise abaixo devem ser interpretados com reservas até concluir a reconciliação.
          </div>
          <button
            type="button"
            className="shrink-0 rounded-md bg-white px-3 py-1.5 text-[12px] font-medium text-amber-800 shadow-sm border border-amber-200 hover:bg-amber-50 transition-colors"
          >
            Ver chamadas órfãs →
          </button>
        </div>
      )}

      {/* ════ ZONA 1 — CUSTO INTERNO ATRIBUÍDO ═════════════════════════ */}
      <div>
        <ZoneLabel symbol="⊙" label={`CUSTO INTERNO ATRIBUÍDO · ÚLTIMOS ${MONTH_DAYS} DIAS`} />
        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-4">
          <ProviderCard
            color={ADMIN_LITERAL.expenseChartApify}
            label="APIFY"
            pctLabel={`${Math.round((data.apify_total / c.apify) * 100)}%`}
            value={data.apify_total}
            capLabel={`/$${c.apify} limite`}
            note="scrapers de Instagram"
            progressValue={data.apify_total}
            progressMax={c.apify}
            progressColor="expense"
            accent="expense"
          />
          <ProviderCard
            color={ADMIN_LITERAL.expenseChartOpenAI}
            label="OPENAI"
            pctLabel={`${Math.round((data.openai_total / c.openai) * 100)}%`}
            value={data.openai_total}
            capLabel={`/$${c.openai} soft cap`}
            note="insights · visão · legendas"
            progressValue={data.openai_total}
            progressMax={c.openai}
            progressColor="info"
            accent="info"
          />
          <ProviderCard
            color={ADMIN_LITERAL.expenseChartDataForSeo}
            label="DATAFORSEO"
            pctLabel={`${((data.dataforseo_total / c.dataforseo) * 100).toFixed(1)}%`}
            value={data.dataforseo_total}
            capLabel={data.dataforseo_balance != null ? `/$${c.dataforseo} saldo` : `/$${c.dataforseo}`}
            note={`${data.dataforseo_calls} chamadas SERP`}
            progressValue={data.dataforseo_total}
            progressMax={c.dataforseo}
            progressColor="signal"
            accent="signal"
          />
          {/* TOTAL — premium dark card */}
          <div className="rounded-xl p-5 text-white" style={{ background: "linear-gradient(135deg, #1a1f2e 0%, #0f172a 100%)" }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-medium uppercase tracking-widest text-white/60">Total atribuído</span>
              <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/80">30 DIAS</span>
            </div>
            <p className="font-mono text-[2.5rem] font-semibold tracking-[-0.03em] leading-none mb-3">
              ${data.total.toFixed(2)}
            </p>
            <div className="flex h-1.5 w-full overflow-hidden rounded-full">
              <div style={{ width: `${apifyShare}%`, backgroundColor: ADMIN_LITERAL.expenseChartApify }} />
              <div style={{ width: `${openaiShare}%`, backgroundColor: ADMIN_LITERAL.expenseChartOpenAI }} />
              <div style={{ width: `${dfsShare}%`, backgroundColor: ADMIN_LITERAL.expenseChartDataForSeo }} />
            </div>
            <p className="mt-2 text-[11px] text-white/50">
              · {apifyShare.toFixed(0)}% · {openaiShare.toFixed(0)}% · {dfsShare.toFixed(0)}%
            </p>
          </div>
        </div>
        <p className="mt-3 flex items-start gap-1.5 text-[11px] text-admin-text-tertiary leading-relaxed">
          <span className="text-admin-info-500">ⓘ</span>
          Estes valores refletem chamadas <strong className="font-medium text-admin-text-secondary">internas atribuídas a análises</strong>. A faturação real dos fornecedores aparece abaixo na zona de reconciliação.
        </p>
      </div>

      {/* ════ ZONA 2 — CUSTO POR ANÁLISE ═══════════════════════════════ */}
      <div>
        <ZoneLabel symbol="⌗" label="CUSTO POR ANÁLISE" />
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <CostPerAnalysisCard
            title="Médio histórico"
            value={data.completed_reports > 0 ? `$${(data.total / data.completed_reports).toFixed(2)}` : "—"}
            sub={`${data.completed_reports} análises geradas · inclui testes e cache`}
            suffix="/análise"
          />
          <CostPerAnalysisCard
            title="Estimativa fresh"
            badge="FRESH"
            value={data.fresh_avg_cost_per_report != null ? `$${data.fresh_avg_cost_per_report.toFixed(2)}` : "—"}
            sub={`${data.fresh_reports} análises fresh · em validação`}
            suffix="/análise"
          />
          <ReliabilityCard
            linkageRatePct={linkageRatePct}
            totalCalls={totalCalls}
            linkedCalls={data.provider_calls_linked_30d}
            confidence={data.confidence}
            linkageByProvider={data.provider_linkage_by_provider}
          />
        </div>
      </div>

      {/* ════ ZONA 3 — RECONCILIAÇÃO ═══════════════════════════════════ */}
      <div>
        <div className="flex items-baseline justify-between">
          <ZoneLabel symbol="⇆" label="RECONCILIAÇÃO · INTERNO ESTIMADO vs FATURAÇÃO REAL" />
          <span className="text-[11px] text-admin-text-tertiary">faturação importada manualmente</span>
        </div>
        <AdminCard className="mt-3 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[11px] text-admin-text-tertiary uppercase tracking-wider border-b border-admin-border">
                  <th className="pb-2 pr-4 font-medium">Fornecedor</th>
                  <th className="pb-2 pr-4 font-medium text-right">Interno atribuído</th>
                  <th className="pb-2 pr-4 font-medium text-right">Faturado real</th>
                  <th className="pb-2 pr-4 font-medium text-right">Diferença</th>
                  <th className="pb-2 font-medium text-right">Estado</th>
                </tr>
              </thead>
              <tbody>
                {reconRows.map((row) => (
                  <tr key={row.provider} className="border-b border-admin-border/50">
                    <td className="py-3 pr-4">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: row.color }} />
                        <span className="font-medium text-admin-text-primary">{row.provider}</span>
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums text-admin-text-primary">
                      ${row.internal.toFixed(2)}
                    </td>
                    <td className="py-3 pr-4 text-right">
                      {row.externalLabel ? (
                        <div>
                          <span className="tabular-nums text-admin-text-primary">${row.external!.toFixed(2)}</span>
                          <br />
                          <span className="text-[10px] text-admin-text-tertiary">{row.externalLabel}</span>
                        </div>
                      ) : (
                        <span className="text-admin-text-tertiary">— por importar</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-right">
                      {row.delta != null ? (
                        <div>
                          <span className={`tabular-nums font-medium ${row.delta < 0 ? "text-red-600" : "text-admin-text-primary"}`}>
                            {row.delta < 0 ? "−" : "+"}${Math.abs(row.delta).toFixed(2)}
                          </span>
                          {row.deltaPct != null && (
                            <span className="ml-1 text-[11px] text-admin-text-tertiary">
                              {row.deltaPct < 0 ? "−" : "+"}{Math.abs(row.deltaPct).toFixed(0)}%
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-admin-text-tertiary">—</span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <ReconStatusBadge status={row.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-admin-border px-0 pt-4 pb-1">
            <p className="text-[12px] text-admin-text-tertiary">
              {pendingCount > 0
                ? `${pendingCount} fornecedor${pendingCount > 1 ? "es" : ""} sem faturação externa. Dados baseados em estimativas internas.`
                : "Todos os fornecedores têm faturação externa reconciliada."}
            </p>
          </div>
        </AdminCard>
      </div>

      {/* ════ ZONA 4 — APIFY · DETALHE POR ACTOR ═════════════════════ */}
      {data.apify_actors.length > 0 && (
        <div>
          <ZoneLabel symbol="⊙" label="APIFY · DETALHE POR ACTOR" />
          <AdminCard className="mt-3 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="text-left text-[10px] text-admin-text-tertiary uppercase tracking-wider border-b border-admin-border">
                    <th className="pb-2 pr-4 font-medium">Actor · nome amigável</th>
                    <th className="pb-2 pr-4 font-medium text-right">Eventos</th>
                    <th className="pb-2 pr-4 font-medium text-right">€/Evento</th>
                    <th className="pb-2 pr-4 font-medium text-right">Calculado</th>
                    <th className="pb-2 pr-4 font-medium text-right">Real Apify</th>
                    <th className="pb-2 font-medium text-right">Origem</th>
                  </tr>
                </thead>
                <tbody>
                  {data.apify_actors.map((actor) => (
                    <ApifyActorRow key={actor.actor} actor={actor} />
                  ))}
                </tbody>
              </table>
            </div>
          </AdminCard>
        </div>
      )}

      {/* ════ ZONA 5 — OPENAI · DETALHE POR OPERAÇÃO ═════════════════ */}
      {data.openai_actors && data.openai_actors.length > 0 && (
        <div>
          <ZoneLabel symbol="⊙" label="OPENAI · DETALHE POR OPERAÇÃO" />
          <AdminCard className="mt-3 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="text-left text-[10px] text-admin-text-tertiary uppercase tracking-wider border-b border-admin-border">
                    <th className="pb-2 pr-4 font-medium">Operação · modelo</th>
                    <th className="pb-2 pr-4 font-medium text-right">Chamadas</th>
                    <th className="pb-2 pr-4 font-medium text-right">Custo</th>
                    <th className="pb-2 pr-4 font-medium text-right">Tokens (P+C)</th>
                    <th className="pb-2 pr-4 font-medium text-right">$/Chamada</th>
                    <th className="pb-2 font-medium text-right">Falhas</th>
                  </tr>
                </thead>
                <tbody>
                  {data.openai_actors.map((actor) => (
                    <OpenAiActorRow key={actor.actor} actor={actor} />
                  ))}
                </tbody>
              </table>
            </div>
          </AdminCard>
        </div>
      )}

      {/* ════ ZONA 6 — EVOLUÇÃO DIÁRIA ═══════════════════════════════ */}
      <div>
        <ZoneLabel symbol="⟨" label={`EVOLUÇÃO DIÁRIA · ÚLTIMOS ${MONTH_DAYS} DIAS`} />
        <p className="mt-1 text-[12px] text-admin-text-tertiary leading-relaxed">
          Custos internos atribuídos por dia. Linha horizontal mostra o limite diário equivalente (
          <span className="font-medium text-red-600">${DAILY_COST_LIMIT.toFixed(2)}</span>
          ) calculado a partir do total mensal de $29.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-5 text-[12px] text-admin-text-secondary">
          <span className="font-medium text-admin-text-tertiary">LEGENDA:</span>
          <LegendSwatch color={ADMIN_LITERAL.expenseChartApify} label="Apify" />
          <LegendSwatch color={ADMIN_LITERAL.expenseChartOpenAI} label="OpenAI" />
          <LegendSwatch color={ADMIN_LITERAL.expenseChartDataForSeo} label="DataForSEO" />
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-5 border-t-2 border-dashed" style={{ borderColor: ADMIN_LITERAL.capLine }} />
            <span>Limite diário <span className="font-medium text-red-600">${DAILY_COST_LIMIT.toFixed(2)}</span></span>
          </span>
        </div>
        <p className="mt-1 text-[10px] text-admin-text-tertiary italic">tooltip por barra ao passar com o rato</p>

        <AdminCard className="mt-3">
          {!hasChartData ? (
            <div className="flex h-48 items-center justify-center text-center text-[13px] text-admin-text-tertiary">
              Sem dados ainda — primeira sincronização decorre à meia-noite UTC.
            </div>
          ) : (
            <div role="img" aria-label="Custos diários por fornecedor" className="relative w-full h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke="rgba(136,135,128,0.18)" vertical={false} />
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
                    content={<DarkTooltip />}
                  />
                  {hasActorBreakdown ? (
                    allActorKeys.map((actor) => (
                      <Bar key={actor} dataKey={`apify_${actor}`} stackId="c" fill={actorColor(actor)} name={`apify_${actor}`} />
                    ))
                  ) : (
                    <Bar dataKey="apify" stackId="c" fill={ADMIN_LITERAL.expenseChartApify} />
                  )}
                  {hasOpenaiActorBreakdown ? (
                    allOpenaiActorKeys.map((actor) => (
                      <Bar key={`openai_${actor}`} dataKey={`openai_${actor}`} stackId="c" fill={openaiActorColor(actor)} name={`openai_${actor}`} />
                    ))
                  ) : (
                    <Bar dataKey="openai" stackId="c" fill={ADMIN_LITERAL.expenseChartOpenAI} />
                  )}
                  <Bar dataKey="dataforseo" stackId="c" fill={ADMIN_LITERAL.expenseChartDataForSeo} radius={[3, 3, 0, 0]} />
                  <ReferenceLine y={DAILY_COST_LIMIT} stroke={ADMIN_LITERAL.capLine} strokeDasharray="5 4" strokeWidth={1.2} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </AdminCard>
      </div>

      {/* ════ RODAPÉ METODOLÓGICO ═════════════════════════════════════ */}
      <p className="text-[11px] text-admin-text-tertiary leading-relaxed border-t border-admin-border pt-4">
        Custos internos atribuídos provêm de <code className="font-mono text-[10px]">provider_call_logs</code> ligados a análises.
        Faturação real importada do dashboard de cada fornecedor.
        {lastApifyBatch && (
          <> Última importação: Apify · {new Date(lastApifyBatch.created_at).toLocaleDateString("pt-PT", { day: "2-digit", month: "short" })} {new Date(lastApifyBatch.created_at).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}.</>
        )}
      </p>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════ */
/*  SUBCOMPONENTS                                                        */
/* ══════════════════════════════════════════════════════════════════════ */

function SectionHeader() {
  return (
    <div className="mb-6">
      <p className="text-eyebrow-sm text-admin-expense-500 uppercase tracking-wider mb-1">
        <span className="text-admin-info-500 mr-1">│</span>SISTEMA · DESPESA
      </p>
      <h2 className="text-xl font-semibold text-admin-text-primary leading-tight">Custos da plataforma</h2>
      <p className="text-[13px] text-admin-text-tertiary mt-0.5">
        Custos internos atribuídos · reconciliação automática
      </p>
    </div>
  );
}

function ZoneLabel({ symbol, label }: { symbol: string; label: string }) {
  return (
    <p className="text-[11px] font-medium uppercase tracking-widest text-admin-text-tertiary">
      <span className="mr-1.5">{symbol}</span>{label}
    </p>
  );
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: color }} />
      <span>{label}</span>
    </span>
  );
}

/* ── Provider Card (Zona 1) ────────────────────────────────────────── */

function ProviderCard({
  color, label, pctLabel, value, capLabel, note, progressValue, progressMax, progressColor, accent,
}: {
  color: string;
  label: string;
  pctLabel: string;
  value: number;
  capLabel: string;
  note: string;
  progressValue: number;
  progressMax: number;
  progressColor: "expense" | "info" | "signal";
  accent?: "expense" | "info" | "signal" | "neutral";
}) {
  return (
    <AdminCard className="relative" variant="accent-left" accent={accent ?? "neutral"}>
      <div className="flex items-center gap-2 mb-2">
        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <span className="text-[11px] font-medium uppercase tracking-wider text-admin-text-tertiary">{label}</span>
        <span className="ml-auto rounded bg-admin-neutral-50 px-1.5 py-0.5 text-[10px] font-medium text-admin-text-tertiary">{pctLabel}</span>
      </div>
      <div className="flex items-baseline gap-1.5 mb-2">
        <span className="font-mono text-[2rem] font-medium tracking-[-0.03em] leading-none text-admin-text-primary">
          ${value.toFixed(2)}
        </span>
        <span className="text-[11px] text-admin-text-tertiary">{capLabel}</span>
      </div>
      <ProgressBar value={progressValue} max={progressMax} color={progressColor} />
      <p className="mt-2 text-[11px] text-admin-text-tertiary">{note}</p>
    </AdminCard>
  );
}

/* ── Cost Per Analysis Card (Zona 2) ──────────────────────────────── */

function CostPerAnalysisCard({ title, badge, value, sub, suffix }: {
  title: string;
  badge?: string;
  value: string;
  sub: string;
  suffix: string;
}) {
  return (
    <AdminCard>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[11px] font-medium uppercase tracking-wider text-admin-text-tertiary">{title}</span>
        {badge && (
          <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700 uppercase tracking-wider">
            {badge}
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="font-mono text-[2rem] font-medium tracking-[-0.03em] leading-none text-admin-text-primary">{value}</span>
        <span className="text-[11px] text-admin-text-tertiary">{suffix}</span>
      </div>
      <p className="mt-2 text-[11px] text-admin-text-tertiary leading-relaxed">{sub}</p>
    </AdminCard>
  );
}

/* ── Reliability Card (Zona 2) ─────────────────────────────────────── */

function ReliabilityCard({ linkageRatePct, totalCalls, linkedCalls, confidence, linkageByProvider }: {
  linkageRatePct: number;
  totalCalls: number;
  linkedCalls: number;
  confidence: "alta" | "media" | "baixa";
  linkageByProvider: ProviderLinkageRow[];
}) {
  const badgeLabel = confidence === "alta" ? "ALTA" : confidence === "media" ? "MÉDIA" : "BAIXA";
  const badgeCls = confidence === "alta"
    ? "bg-emerald-500/15 text-emerald-700"
    : confidence === "media"
      ? "bg-amber-500/15 text-amber-700"
      : "bg-red-500/15 text-red-700";
  const valueCls = confidence === "baixa" ? "text-red-600" : confidence === "media" ? "text-amber-600" : "text-emerald-700";

  return (
    <AdminCard>
      <div className="flex items-center gap-2 mb-2">
        <span className="h-2 w-2 rounded-full bg-red-400 shrink-0" />
        <span className="text-[11px] font-medium uppercase tracking-wider text-admin-text-tertiary">Fiabilidade dos custos</span>
        <span className={`ml-auto rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${badgeCls}`}>
          {badgeLabel}
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className={`font-mono text-[2rem] font-medium tracking-[-0.03em] leading-none ${valueCls}`}>
          {linkageRatePct.toFixed(1)}%
        </span>
        <span className="text-[11px] text-admin-text-tertiary">{linkedCalls} de {totalCalls} chamadas</span>
      </div>
      {linkageByProvider.length > 0 && (
        <p className="mt-2 text-[11px] font-mono text-admin-text-tertiary">
          {linkageByProvider.map((p) => `${providerShortName(p.provider)} ${p.linked}/${p.total}`).join(" · ")}
        </p>
      )}
    </AdminCard>
  );
}

/* ── Reconciliation helpers ────────────────────────────────────────── */

interface ReconRow {
  provider: string;
  color: string;
  internal: number;
  external: number | null;
  externalLabel: string | null;
  delta: number | null;
  deltaPct: number | null;
  status: "REVER" | "PENDENTE" | "OK";
}

function buildReconRows(data: Expense30d, reconByProvider: ProviderBreakdown[]): ReconRow[] {
  const providers: Array<{ key: string; label: string; color: string; internal: number }> = [
    { key: "apify", label: "Apify", color: ADMIN_LITERAL.expenseChartApify, internal: data.apify_total },
    { key: "openai", label: "OpenAI", color: ADMIN_LITERAL.expenseChartOpenAI, internal: data.openai_total },
    { key: "dataforseo", label: "DataForSEO", color: ADMIN_LITERAL.expenseChartDataForSeo, internal: data.dataforseo_total },
  ];

  return providers.map((p) => {
    const ext = reconByProvider.find((r) => r.provider === p.key);
    const hasExternal = ext != null && ext.external > 0;
    const delta = hasExternal ? ext.external - p.internal : null;
    const deltaPct = hasExternal && p.internal > 0 ? ((ext.external - p.internal) / p.internal) * 100 : null;
    const needsReview = delta != null && Math.abs(delta) > 0.01;
    return {
      provider: p.label,
      color: p.color,
      internal: p.internal,
      external: hasExternal ? ext.external : null,
      externalLabel: hasExternal ? `dashboard ${p.label}` : null,
      delta,
      deltaPct,
      status: hasExternal ? (needsReview ? "REVER" as const : "OK" as const) : "PENDENTE" as const,
    };
  });
}

function ReconStatusBadge({ status }: { status: "REVER" | "PENDENTE" | "OK" }) {
  const cls = status === "REVER"
    ? "bg-red-500/15 text-red-700"
    : status === "OK"
      ? "bg-emerald-500/15 text-emerald-700"
      : "bg-neutral-200 text-neutral-500";
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold tracking-wider ${cls}`}>
      {status}
    </span>
  );
}

/* ── Apify Actor Row (Zona 4) ─────────────────────────────────────── */

function ApifyActorRow({ actor }: { actor: ApifyActorBreakdown }) {
  const noRuns = actor.run_count === 0 && actor.error_count === 0;
  const source = COST_SOURCE_LABEL[actor.cost_source];
  const friendly = ACTOR_FRIENDLY[actor.actor];
  const avgCostPerEvent = actor.run_count > 0 ? actor.total_cost_usd / actor.run_count : null;

  return (
    <tr className={`border-b border-admin-border/50 ${noRuns ? "text-admin-text-tertiary/60" : "text-admin-text-secondary"}`}>
      <td className="py-3 pr-4">
        <div>
          <span className="font-semibold text-admin-text-primary">
            {friendly?.name ?? actor.label}
          </span>
          {friendly?.desc && <span className="text-admin-text-tertiary"> · {friendly.desc}</span>}
        </div>
        <div className="mt-0.5 font-mono text-[10px] text-admin-text-tertiary">
          {actor.actor} · {actor.run_count} runs
        </div>
      </td>
      <td className="py-3 pr-4 text-right tabular-nums">{noRuns ? "—" : actor.run_count}</td>
      <td className="py-3 pr-4 text-right tabular-nums">{avgCostPerEvent != null ? `$${avgCostPerEvent.toFixed(4)}` : "—"}</td>
      <td className="py-3 pr-4 text-right tabular-nums font-semibold text-admin-text-primary">
        {noRuns ? "—" : `$${actor.estimated_total_usd.toFixed(3)}`}
      </td>
      <td className="py-3 pr-4 text-right tabular-nums">{noRuns ? "—" : `$${actor.actual_total_usd.toFixed(2)}`}</td>
      <td className="py-3 text-right">
        {noRuns ? (
          <span className="text-admin-text-tertiary text-[10px]">—</span>
        ) : (
          <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wider ${source.cls}`}>
            {source.text}
          </span>
        )}
      </td>
    </tr>
  );
}

/* ── OpenAI Actor Row (Zona 5) ─────────────────────────────────────── */

function OpenAiActorRow({ actor }: { actor: OpenAiActorBreakdown }) {
  const noCalls = actor.call_count === 0 && actor.error_count === 0;
  const mostlyFailed = actor.error_count >= 3 && actor.call_count <= 1;
  const op = openaiOpLabel(actor.actor);

  return (
    <tr className={`border-b border-admin-border/50 ${mostlyFailed ? "bg-amber-50/50" : ""} ${noCalls ? "text-admin-text-tertiary/60" : "text-admin-text-secondary"}`}>
      <td className="py-3 pr-4">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-admin-text-primary">{op.name}</span>
          {op.type === "texto" && <span className="text-admin-text-tertiary">· texto</span>}
          {op.type === "imagens" && (
            <span className="rounded bg-admin-info-500/10 px-1.5 py-0.5 text-[9px] font-medium text-admin-info-700 uppercase">IMG</span>
          )}
          {mostlyFailed && (
            <span className="rounded bg-amber-400/20 px-1.5 py-0.5 text-[9px] font-semibold text-amber-800 uppercase tracking-wider">
              TESTE FALHADO
            </span>
          )}
        </div>
        <div className="mt-0.5 font-mono text-[10px] text-admin-text-tertiary">{actor.model ?? "—"}</div>
      </td>
      <td className="py-3 pr-4 text-right tabular-nums">{noCalls ? "—" : actor.call_count}</td>
      <td className="py-3 pr-4 text-right tabular-nums font-semibold text-admin-text-primary">
        {noCalls ? "—" : `$${actor.total_cost_usd.toFixed(4)}`}
      </td>
      <td className="py-3 pr-4 text-right tabular-nums">
        {noCalls ? "—" : `${actor.total_prompt_tokens.toLocaleString("pt-PT")} + ${actor.total_completion_tokens.toLocaleString("pt-PT")}`}
      </td>
      <td className="py-3 pr-4 text-right tabular-nums">
        {actor.avg_cost_per_call != null ? `$${actor.avg_cost_per_call.toFixed(4)}` : "—"}
      </td>
      <td className="py-3 text-right">
        {actor.error_count > 0 ? (
          <span className={`tabular-nums font-medium ${actor.error_count >= 3 ? "text-red-600" : "text-amber-600"}`}>
            {actor.error_count}
          </span>
        ) : (
          <span className="text-admin-text-tertiary">—</span>
        )}
      </td>
    </tr>
  );
}

/* ── Dark Tooltip (chart, Zona 6) ──────────────────────────────────── */

function DarkTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  const apifyTotal = payload.filter((p) => p.dataKey.startsWith("apify")).reduce((s, p) => s + (p.value || 0), 0);
  const openaiTotal = payload.filter((p) => p.dataKey.startsWith("openai")).reduce((s, p) => s + (p.value || 0), 0);
  const dfsEntry = payload.find((p) => p.dataKey === "dataforseo");
  const dfsVal = dfsEntry?.value ?? 0;
  const total = apifyTotal + openaiTotal + dfsVal;

  return (
    <div className="rounded-lg bg-gray-900 px-3 py-2.5 shadow-lg text-white" style={{ fontSize: 11, minWidth: 200 }}>
      <p className="mb-2 font-medium text-white/70">{label}</p>
      {apifyTotal > 0 && (
        <div className="flex items-center justify-between gap-4 mb-0.5">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: ADMIN_LITERAL.expenseChartApify }} />
            Apify
          </span>
          <span className="tabular-nums font-semibold">${apifyTotal.toFixed(2)}</span>
        </div>
      )}
      {openaiTotal > 0 && (
        <div className="flex items-center justify-between gap-4 mb-0.5">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: ADMIN_LITERAL.expenseChartOpenAI }} />
            OpenAI
          </span>
          <span className="tabular-nums font-semibold">${openaiTotal.toFixed(2)}</span>
        </div>
      )}
      {dfsVal > 0 && (
        <div className="flex items-center justify-between gap-4 mb-0.5">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: ADMIN_LITERAL.expenseChartDataForSeo }} />
            DFS
          </span>
          <span className="tabular-nums font-semibold">${dfsVal.toFixed(2)}</span>
        </div>
      )}
      {total > 0 && (
        <>
          <div className="my-1 border-t border-white/20" />
          <div className="flex items-center justify-between gap-4 font-semibold">
            <span>Total</span>
            <span className="tabular-nums">${total.toFixed(2)}</span>
          </div>
        </>
      )}
    </div>
  );
}
