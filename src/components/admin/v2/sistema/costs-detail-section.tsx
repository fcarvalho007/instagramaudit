/**
 * Custos detalhados — dados reais via API.
 */

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { AdminCard } from "@/components/admin/v2/admin-card";
import { VisualCoverDebugCard } from "@/components/admin/v2/sistema/visual-cover-debug-card";
import { AdminBadge } from "@/components/admin/v2/admin-badge";
import { AdminSectionHeader } from "@/components/admin/v2/admin-section-header";
import { KPICard } from "@/components/admin/v2/kpi-card";
import {
  ACCENT_500,
  ACCENT_BG_50,
  type AdminAccent,
} from "@/components/admin/v2/admin-tokens";
import {
  SectionEmpty,
  SectionError,
  SectionSkeleton,
} from "@/components/admin/v2/section-state";
import { adminFetch } from "@/lib/admin/fetch";
import type {
  AlertRow,
  ApifyActorBreakdown,
  Cost24hMetrics,
  ProviderCallRow,
} from "@/lib/admin/system-queries.server";
import type { CommentScraperMetrics, EnrichmentJobSummary } from "@/lib/admin/system-queries.server";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await adminFetch(url);
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return (await res.json()) as T;
}

const PROVIDER_BADGE: Record<string, AdminAccent> = {
  apify: "expense",
  openai: "info",
  dataforseo: "signal",
};

const STATUS_BADGE: Record<
  ProviderCallRow["status"],
  { label: string; variant: AdminAccent }
> = {
  success: { label: "Sucesso", variant: "revenue" },
  cache: { label: "Cache", variant: "expense" },
  failure: { label: "Falha", variant: "danger" },
};

const ALERT_ACCENT: Record<AlertRow["severity"], AdminAccent> = {
  warning: "signal",
  critical: "danger",
  info: "info",
};
const ALERT_EYEBROW: Record<AlertRow["severity"], string> = {
  warning: "AVISO",
  critical: "CRÍTICO",
  info: "INFO",
};

function httpToneClass(http: number | null | undefined): string {
  if (http === null || http === undefined) return "text-admin-text-secondary";
  if (http >= 500) return "text-admin-danger-700";
  if (http >= 400) return "text-admin-expense-700";
  if (http >= 200 && http < 300) return "text-admin-revenue-700";
  return "text-admin-text-secondary";
}

export function CostsDetailSection() {
  const qc = useQueryClient();
  const metrics = useQuery({
    queryKey: ["admin", "sistema", "cost-metrics-24h"],
    queryFn: () =>
      fetchJson<Cost24hMetrics>("/api/admin/sistema/cost-metrics-24h"),
    refetchInterval: 60_000,
  });
  const calls = useQuery({
    queryKey: ["admin", "sistema", "provider-calls"],
    queryFn: () =>
      fetchJson<ProviderCallRow[]>("/api/admin/sistema/provider-calls?limit=20"),
    refetchInterval: 60_000,
  });
  const alerts = useQuery({
    queryKey: ["admin", "sistema", "alerts"],
    queryFn: () => fetchJson<AlertRow[]>("/api/admin/sistema/alerts"),
    refetchInterval: 60_000,
  });
  const ackMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await adminFetch(`/api/admin/sistema/alerts/${id}/ack`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "sistema", "alerts"] }),
  });

  const enrichmentJobs = useQuery({
    queryKey: ["admin", "sistema", "enrichment-jobs"],
    queryFn: () =>
      fetchJson<EnrichmentJobSummary>("/api/admin/sistema/enrichment-jobs"),
    refetchInterval: 30_000,
  });

  return (
    <section>
      <AdminSectionHeader
        accent="expense"
        title="Custos detalhados"
        info="Custos reais agregados de provider_call_logs nas últimas 24h. Mesma fonte e regra que a secção Despesa da Visão Geral (apenas a janela difere: 24h aqui vs 30d na Visão Geral)."
      />

      {/* KPIs */}
      {metrics.isLoading ? (
        <SectionSkeleton rows={1} rowHeight={96} />
      ) : metrics.error ? (
        <SectionError error={metrics.error} onRetry={() => metrics.refetch()} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <KPICard
            eyebrow="Custo Apify · 24h"
            value={`$${metrics.data!.apify.amount_usd.toFixed(2)}`}
            sub={`${metrics.data!.apify.calls} chamada(s)`}
            size="lg"
          />
          <KPICard
            eyebrow="Custo OpenAI · 24h"
            value={`$${metrics.data!.openai.amount_usd.toFixed(2)}`}
            sub={`${metrics.data!.openai.calls} chamada(s)`}
            size="lg"
          />
          <KPICard
            eyebrow="Custo DataForSEO · 24h"
            value={`$${metrics.data!.dataforseo.amount_usd.toFixed(2)}`}
            sub={`${metrics.data!.dataforseo.calls} chamada(s)`}
            size="lg"
          />
          <KPICard
            eyebrow="Cache hits · 24h"
            value={String(metrics.data!.cache_hits)}
            sub="análises servidas do cache"
            size="lg"
          />
          <KPICard
            eyebrow="Poupança · cache"
            value={`$${metrics.data!.cache_savings_usd.toFixed(2)}`}
            sub="vs sem cache"
            size="lg"
          />
        </div>
      )}

      {!metrics.isLoading && !metrics.error ? (
        <p className="text-eyebrow-sm mt-2 text-admin-text-tertiary">
          Janela: últimas 24h · fonte: provider_call_logs · status: success + cache · custo: actual_cost_usd ?? estimated_cost_usd
        </p>
      ) : null}

      {/* Apify actor breakdown */}
      {!metrics.isLoading && !metrics.error && (
        <ApifyActorBreakdownSection actors={metrics.data!.apify_actors} />
      )}

      {/* Últimas chamadas */}
      <AdminCard className="mt-4">
        <div className="mb-4">
          <h3 className="m-0 text-[15px] font-medium text-admin-text-primary">
            Últimas chamadas ao provedor
          </h3>
          <p className="m-0 mt-0.5 text-[12px] text-admin-text-tertiary">
            Para investigar timeouts, falhas HTTP ou erros de configuração
          </p>
        </div>

        {calls.isLoading ? (
          <SectionSkeleton rows={6} rowHeight={36} />
        ) : calls.error ? (
          <SectionError error={calls.error} onRetry={() => calls.refetch()} />
        ) : (calls.data ?? []).length === 0 ? (
          <SectionEmpty message="Sem chamadas ao provedor registadas ainda." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr>
                  {["Quando", "Provedor", "Actor / Modelo", "Handle", "Estado", "HTTP", "Duração", "Custo"].map(
                    (label, idx) => (
                      <th
                        key={label}
                        className={`pb-3 text-eyebrow-sm text-admin-text-tertiary ${
                          idx >= 6 ? "text-right" : "text-left"
                        }`}
                      >
                        {label}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {(calls.data ?? []).map((call, idx) => (
                  <tr
                    key={call.id}
                    className={`${idx === 0 ? "" : "border-t border-admin-border"} hover:bg-admin-surface-muted/60`}
                  >
                    <td className="py-3 pr-4 admin-code tabular-nums text-admin-text-primary">
                      {call.when}
                    </td>
                    <td className="py-3 pr-4">
                      <AdminBadge variant={PROVIDER_BADGE[call.provider] ?? "neutral"}>
                        {call.provider}
                      </AdminBadge>
                    </td>
                    <td className="py-3 pr-4 admin-code text-admin-text-secondary">
                      {call.model}
                    </td>
                    <td className="py-3 pr-4 admin-code text-admin-text-primary">
                      {call.handle}
                    </td>
                    <td className="py-3 pr-4">
                      <AdminBadge variant={STATUS_BADGE[call.status].variant}>
                        {STATUS_BADGE[call.status].label}
                      </AdminBadge>
                    </td>
                    <td className={`py-3 pr-4 admin-code tabular-nums ${httpToneClass(call.http)}`}>
                      {call.http ?? "—"}
                    </td>
                    <td className="py-3 pr-4 text-right admin-code tabular-nums text-admin-text-secondary">
                      {call.duration}
                    </td>
                    <td className="py-3 text-right admin-code tabular-nums text-admin-text-primary">
                      {call.cost ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>

      {/* Alertas */}
      <AdminCard className="mt-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="m-0 text-[15px] font-medium text-admin-text-primary">
            Alertas
          </h3>
          <AdminBadge
            variant={
              (alerts.data ?? []).some((a) => a.severity === "critical")
                ? "danger"
                : "expense"
            }
          >
            {(alerts.data ?? []).length} abertos
          </AdminBadge>
        </div>
        {alerts.isLoading ? (
          <SectionSkeleton rows={2} rowHeight={64} />
        ) : alerts.error ? (
          <SectionError error={alerts.error} onRetry={() => alerts.refetch()} />
        ) : (alerts.data ?? []).length === 0 ? (
          <SectionEmpty message="Sem alertas abertos. Tudo dentro dos limites." />
        ) : (
          <div className="flex flex-col gap-3">
            {(alerts.data ?? []).map((alert) => {
              const accent = ALERT_ACCENT[alert.severity];
              return (
                <article
                  key={alert.id}
                  className="rounded-lg px-4 py-3.5"
                  style={{
                    backgroundColor: ACCENT_BG_50[accent],
                    borderLeft: `3px solid ${ACCENT_500[accent]}`,
                  }}
                >
                  <header className="mb-1 flex items-center justify-between gap-3">
                    <span className="text-eyebrow-sm text-admin-text-tertiary">
                      {ALERT_EYEBROW[alert.severity]}
                    </span>
                    <span className="text-[12px] text-admin-text-tertiary">
                      {alert.when}
                    </span>
                  </header>
                  <p className="m-0 text-[13px] font-medium text-admin-text-primary">
                    {alert.title}
                  </p>
                  <p className="m-0 mt-1 text-[12px] text-admin-text-secondary">
                    {alert.detail}
                  </p>
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => ackMut.mutate(alert.id)}
                      disabled={ackMut.isPending}
                      className="text-[12px] font-medium text-admin-info-700 hover:underline disabled:opacity-50"
                    >
                      Marcar como visto
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </AdminCard>

      {/* ─── Enrichment Jobs ──────────────────────────── */}
      <AdminCard accent="info">
        <h3 className="text-eyebrow text-admin-text-tertiary mb-3">Enrichment Jobs — Comentários</h3>
        {enrichmentJobs.isLoading ? (
          <SectionSkeleton rows={1} rowHeight={64} />
        ) : enrichmentJobs.error ? (
          <SectionError error={enrichmentJobs.error} onRetry={() => enrichmentJobs.refetch()} />
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <KPICard eyebrow="Pendente" value={String(enrichmentJobs.data!.pending)} size="sm" accent="signal" />
              <KPICard eyebrow="Em execução" value={String(enrichmentJobs.data!.running)} size="sm" accent="info" />
              <KPICard eyebrow="Concluído" value={String(enrichmentJobs.data!.success)} size="sm" accent="revenue" />
              <KPICard eyebrow="Erro" value={String(enrichmentJobs.data!.error)} size="sm" accent="danger" />
            </div>
            {enrichmentJobs.data!.recent_failures.length > 0 && (
              <div className="space-y-2">
                <p className="text-eyebrow-sm text-admin-text-tertiary">Falhas recentes</p>
                {enrichmentJobs.data!.recent_failures.map((f) => (
                  <div key={f.id} className="rounded-md border border-admin-border bg-admin-surface-muted/40 px-3 py-2 text-[12px]">
                    <span className="font-mono text-admin-text-primary">@{f.handle}</span>
                    <span className="ml-2 text-admin-text-secondary">{f.enrichment_type}</span>
                    <span className="ml-2 text-admin-text-tertiary">tentativas: {f.attempts}</span>
                    {f.error_message && (
                      <p className="mt-1 text-admin-danger-700 text-[12px] truncate">{f.error_message}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </AdminCard>

      {/* ─── P07 Visual Cover Debug ──────────────────────── */}
      <VisualCoverDebugCard />

    </section>
  );
}

/* ============================================ Apify Actor Breakdown ===== */

const COST_SOURCE_BADGE: Record<
  ApifyActorBreakdown["cost_source"],
  { text: string; variant: AdminAccent }
> = {
  actual: { text: "Real", variant: "revenue" },
  estimated: { text: "Estimado", variant: "signal" },
  mixed: { text: "Misto", variant: "info" },
  unavailable: { text: "Indisponível", variant: "neutral" },
};

function fmtAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff) || diff < 0) return "—";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "< 1h";
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function ApifyActorBreakdownSection({
  actors,
}: {
  actors: ApifyActorBreakdown[];
}) {
  // Fetch comment scraper config for the config details
  const csConfig = useQuery({
    queryKey: ["admin", "sistema", "comment-scraper"],
    queryFn: () =>
      fetchJson<CommentScraperMetrics>("/api/admin/sistema/comment-scraper"),
    refetchInterval: 60_000,
  });

  return (
    <AdminCard className="mt-4">
      <div className="mb-4">
        <h3 className="m-0 text-[15px] font-medium text-admin-text-primary">
          Apify — decomposição por actor
        </h3>
        <p className="m-0 mt-0.5 text-[12px] text-admin-text-tertiary">
          Custo por actor nas últimas 24h · fonte: provider_call_logs · displayCost = actual_cost_usd ?? estimated_cost_usd
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {actors.map((actor) => (
          <ActorDetailCard
            key={actor.actor}
            actor={actor}
            csConfig={
              actor.actor === "apify/instagram-comment-scraper"
                ? csConfig.data ?? null
                : null
            }
          />
        ))}
      </div>
    </AdminCard>
  );
}

function ActorDetailCard({
  actor,
  csConfig,
}: {
  actor: ApifyActorBreakdown;
  csConfig: CommentScraperMetrics | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const source = COST_SOURCE_BADGE[actor.cost_source];
  const noRuns = actor.run_count === 0 && actor.error_count === 0;

  return (
    <div className="rounded-lg border border-admin-border bg-admin-surface-muted/30 overflow-hidden">
      {/* Header — always visible, clickable */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-admin-surface-muted/60 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-eyebrow-sm text-admin-text-secondary uppercase truncate">
            {actor.label}
          </span>
          <AdminBadge variant={source.variant}>
            {noRuns ? "Sem execuções" : source.text}
          </AdminBadge>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {!noRuns && (
            <span className="font-mono text-[14px] font-semibold tabular-nums text-admin-text-primary">
              ${actor.total_cost_usd.toFixed(2)}
            </span>
          )}
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-admin-text-tertiary" />
          ) : (
            <ChevronDown className="h-4 w-4 text-admin-text-tertiary" />
          )}
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-admin-border px-4 py-3 space-y-3">
          {noRuns ? (
            <p className="text-[12px] text-admin-text-tertiary italic m-0">
              Nenhuma execução registada neste período. O actor aparecerá aqui quando for utilizado.
            </p>
          ) : (
            <>
              {/* KPI grid */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                <KPICard
                  eyebrow="Custo total"
                  value={`$${actor.total_cost_usd.toFixed(2)}`}
                  sub={source.text}
                  size="sm"
                />
                <KPICard
                  eyebrow="Execuções"
                  value={String(actor.run_count)}
                  sub={
                    actor.error_count > 0
                      ? `+ ${actor.error_count} erro(s)`
                      : "com sucesso"
                  }
                  size="sm"
                />
                <KPICard
                  eyebrow="Resultados"
                  value={actor.total_results.toLocaleString("pt-PT")}
                  sub="itens devolvidos"
                  size="sm"
                />
                <KPICard
                  eyebrow="Custo / run"
                  value={
                    actor.avg_cost_per_run != null
                      ? `$${actor.avg_cost_per_run.toFixed(3)}`
                      : "—"
                  }
                  sub="média"
                  size="sm"
                />
              </div>

              {/* Cost source breakdown */}
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-admin-text-secondary">
                <span>
                  Real:{" "}
                  <span className="font-mono tabular-nums text-admin-revenue-700">
                    ${actor.actual_total_usd.toFixed(3)}
                  </span>
                </span>
                <span>
                  Estimado:{" "}
                  <span className="font-mono tabular-nums text-admin-signal-700">
                    ${actor.estimated_total_usd.toFixed(3)}
                  </span>
                </span>
                {actor.unavailable_count > 0 && (
                  <span>
                    Indisponível:{" "}
                    <span className="text-admin-text-tertiary">
                      {actor.unavailable_count} run(s)
                    </span>
                  </span>
                )}
                {actor.cost_per_1k_results != null && (
                  <span>
                    Custo/1K resultados:{" "}
                    <span className="font-mono tabular-nums text-admin-text-primary">
                      ${actor.cost_per_1k_results.toFixed(3)}
                    </span>
                  </span>
                )}
              </div>

              {/* Last run */}
              {actor.last_run_at && (
                <p className="text-[12px] text-admin-text-tertiary m-0">
                  Última execução: {fmtAgo(actor.last_run_at)} ·{" "}
                  {actor.last_run_status === "success" || actor.last_run_status === "ok"
                    ? "sucesso"
                    : actor.last_run_status ?? "—"}
                  {actor.last_run_cost_usd != null
                    ? ` · $${actor.last_run_cost_usd.toFixed(4)}`
                    : " · custo não disponível"}
                </p>
              )}
            </>
          )}

          {/* Comment scraper config — only for that specific actor */}
          {csConfig && (
            <div className="border-t border-admin-border pt-3 mt-2">
              <p className="m-0 text-eyebrow-sm text-admin-text-tertiary">
                CONFIGURAÇÃO DO ACTOR
              </p>
              <div className="mt-1.5 flex flex-wrap gap-x-6 gap-y-1 text-[12px] text-admin-text-secondary">
                <span>
                  Limite total alvo:{" "}
                  <span className="font-mono tabular-nums text-admin-text-primary">
                    {csConfig.max_total_results} comentários
                  </span>
                </span>
                <span>
                  Limite por post calculado:{" "}
                  <span className="font-mono tabular-nums text-admin-text-primary">
                    {csConfig.max_posts > 0
                      ? Math.ceil(csConfig.max_total_results / csConfig.max_posts)
                      : "—"}
                  </span>
                </span>
                <span>
                  Posts por análise:{" "}
                  <span className="font-mono tabular-nums text-admin-text-primary">
                    até {csConfig.max_posts}
                  </span>
                </span>
                <span>
                  Hard max:{" "}
                  <span className="font-mono tabular-nums text-admin-text-primary">
                    ${csConfig.hard_max_cost_usd.toFixed(2)}/run
                  </span>
                </span>
                <span>
                  Alvo:{" "}
                  <span className="font-mono tabular-nums text-admin-text-primary">
                    ${csConfig.target_cost_usd.toFixed(2)}/análise
                  </span>
                </span>
                <span>
                  Replies:{" "}
                  <span
                    className={`font-medium ${csConfig.include_replies ? "text-admin-revenue-700" : "text-admin-text-tertiary"}`}
                  >
                    {csConfig.include_replies ? "sim" : "não"}
                  </span>
                </span>
                <span>
                  Timeout:{" "}
                  <span className="font-mono tabular-nums text-admin-text-primary">
                    {csConfig.timeout_ms / 1000}s
                  </span>
                </span>
                <span>
                  Feature flag:{" "}
                  <span
                    className={`font-medium ${csConfig.enabled ? "text-admin-revenue-700" : "text-admin-text-tertiary"}`}
                  >
                    {csConfig.enabled ? "ativo" : "desativado"}
                  </span>
                </span>
              </div>
              <p className="mt-1.5 text-[12px] text-admin-text-tertiary m-0 italic">
                O resultsLimit do Apify é aplicado por post URL. O sistema calcula o limite por post a partir do limite total alvo ÷ número de posts.
              </p>
            </div>
          )}

          <p className="text-[12px] text-admin-text-tertiary m-0 italic">
            Incluído no relatório gratuito
          </p>
        </div>
      )}
    </div>
  );
}
