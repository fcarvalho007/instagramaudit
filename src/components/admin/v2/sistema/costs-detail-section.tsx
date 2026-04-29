/**
 * Custos detalhados — dados reais via API.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { AdminCard } from "@/components/admin/v2/admin-card";
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
import type {
  AlertRow,
  Cost24hMetrics,
  ProviderCallRow,
} from "@/lib/admin/system-queries.server";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
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
      const res = await fetch(`/api/admin/sistema/alerts/${id}/ack`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "sistema", "alerts"] }),
  });

  return (
    <section>
      <AdminSectionHeader
        accent="expense"
        title="Custos detalhados"
        info="Custos reais agregados de provider_call_logs e cost_daily."
      />

      {/* KPIs */}
      {metrics.isLoading ? (
        <SectionSkeleton rows={1} rowHeight={96} />
      ) : metrics.error ? (
        <SectionError error={metrics.error} onRetry={() => metrics.refetch()} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                        className={`pb-3 font-mono text-[10px] uppercase tracking-[0.08em] text-admin-text-tertiary ${
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
                    <td className="py-3 pr-4 font-mono text-[12px] tabular-nums text-admin-text-primary">
                      {call.when}
                    </td>
                    <td className="py-3 pr-4">
                      <AdminBadge variant={PROVIDER_BADGE[call.provider] ?? "neutral"}>
                        {call.provider}
                      </AdminBadge>
                    </td>
                    <td className="py-3 pr-4 font-mono text-[12px] text-admin-text-secondary">
                      {call.model}
                    </td>
                    <td className="py-3 pr-4 font-mono text-[12px] text-admin-text-primary">
                      {call.handle}
                    </td>
                    <td className="py-3 pr-4">
                      <AdminBadge variant={STATUS_BADGE[call.status].variant}>
                        {STATUS_BADGE[call.status].label}
                      </AdminBadge>
                    </td>
                    <td className={`py-3 pr-4 font-mono text-[12px] tabular-nums ${httpToneClass(call.http)}`}>
                      {call.http ?? "—"}
                    </td>
                    <td className="py-3 pr-4 text-right font-mono text-[12px] tabular-nums text-admin-text-secondary">
                      {call.duration}
                    </td>
                    <td className="py-3 text-right font-mono text-[12px] tabular-nums text-admin-text-primary">
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
                    <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-admin-text-tertiary">
                      {ALERT_EYEBROW[alert.severity]}
                    </span>
                    <span className="text-[11px] text-admin-text-tertiary">
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
                      className="text-[11px] font-medium text-admin-info-700 hover:underline disabled:opacity-50"
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
    </section>
  );
}
