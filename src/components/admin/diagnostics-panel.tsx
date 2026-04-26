import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DeliveryStatusBadge,
  PdfStatusBadge,
  RequestStatusBadge,
} from "@/components/admin/status-badge";
import type {
  DeliveryStatus,
  PdfStatus,
  RequestStatus,
} from "@/lib/admin/labels";

interface DiagnosticsResponse {
  success: true;
  secrets: {
    APIFY_TOKEN: boolean;
    RESEND_API_KEY: boolean;
    INTERNAL_API_TOKEN: boolean;
  };
  apify: {
    enabled: boolean;
    cost_per_profile_usd: number;
    cost_per_post_usd: number;
  };
  testing_mode: {
    active: boolean;
    allowlist: string[];
  };
  snapshots: {
    total: number | null;
    latest_at: string | null;
    latest_username: string | null;
    latest_status: string | null;
    latest_provider: string | null;
    latest_data_source: "fresh" | "cache" | "stale" | null;
    error: string | null;
  };
  report_requests: {
    total: number | null;
    latest_at: string | null;
    latest_request_status: string | null;
    latest_pdf_status: string | null;
    latest_delivery_status: string | null;
    latest_pdf_error: string | null;
    latest_email_error: string | null;
    error: string | null;
  };
  analytics: {
    last_24h: ActivityWindow;
    last_7d: ActivityWindow;
    unique_profiles_7d: number;
    error: string | null;
  };
  top_profiles: {
    rows: TopProfileRow[];
    error: string | null;
  };
  recent_events: {
    rows: RecentEventRow[];
    error: string | null;
  };
  recent_provider_calls: {
    rows: RecentProviderCallRow[];
    error: string | null;
  };
  alerts: {
    rows: AlertRow[];
    error: string | null;
  };
  generated_at: string;
}

interface ActivityWindow {
  events: number;
  fresh: number;
  cache: number;
  failed: number;
  blocked: number;
  estimated_cost_usd: number;
}

interface TopProfileRow {
  network: string;
  handle: string;
  display_name: string | null;
  followers_last_seen: number | null;
  analyses_total: number;
  analyses_fresh: number;
  analyses_cache: number;
  analyses_failed: number;
  estimated_cost_usd_total: number;
  last_analyzed_at: string;
  last_outcome: string | null;
  last_data_source: string | null;
}

interface RecentEventRow {
  id: string;
  created_at: string;
  network: string;
  handle: string;
  outcome: string;
  data_source: string;
  estimated_cost_usd: number | null;
  duration_ms: number | null;
  error_code: string | null;
}

interface RecentProviderCallRow {
  id: string;
  created_at: string;
  actor: string;
  handle: string;
  status: string;
  http_status: number | null;
  duration_ms: number | null;
  posts_returned: number;
  estimated_cost_usd: number | null;
}

interface AlertRow {
  id: string;
  created_at: string;
  severity: string;
  kind: string;
  handle: string | null;
  metric_name: string;
  metric_value: number;
  threshold_value: number;
}

const dateFormatter = new Intl.DateTimeFormat("pt-PT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const numberFormatter = new Intl.NumberFormat("pt-PT");

function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return numberFormatter.format(n);
}

function formatCost(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  // 5 decimals to match DB scale; trim trailing zeros for readability.
  const fixed = n.toFixed(5).replace(/0+$/, "").replace(/\.$/, "");
  return `$${fixed === "" ? "0" : fixed}`;
}

function outcomeVariant(
  o: string,
): "default" | "success" | "warning" | "danger" | "accent" {
  if (o === "success") return "success";
  if (o === "blocked_allowlist" || o === "provider_disabled") return "warning";
  if (
    o === "provider_error" ||
    o === "not_found" ||
    o === "invalid_input"
  )
    return "danger";
  return "default";
}

function severityVariant(
  s: string,
): "default" | "success" | "warning" | "danger" | "accent" {
  if (s === "critical") return "danger";
  if (s === "warning") return "warning";
  if (s === "info") return "accent";
  return "default";
}

function providerStatusVariant(
  s: string,
): "default" | "success" | "warning" | "danger" | "accent" {
  if (s === "success") return "success";
  if (s === "timeout" || s === "network_error") return "warning";
  if (s === "http_error" || s === "config_error") return "danger";
  return "default";
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return dateFormatter.format(d);
}

function dataSourceVariant(
  v: "fresh" | "cache" | "stale" | null,
): "default" | "success" | "warning" | "danger" | "accent" {
  if (v === "fresh") return "success";
  if (v === "cache") return "accent";
  if (v === "stale") return "warning";
  return "default";
}

function dataSourceLabel(v: "fresh" | "cache" | "stale" | null): string {
  if (v === "fresh") return "Fresh";
  if (v === "cache") return "Cache";
  if (v === "stale") return "Stale";
  return "—";
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-content-tertiary">
      {children}
    </h2>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-sm text-content-secondary">{label}</span>
      <div className="text-right text-sm text-content-primary">{children}</div>
    </div>
  );
}

function SecretBadge({ present }: { present: boolean }) {
  return (
    <Badge variant={present ? "success" : "danger"} dot>
      {present ? "Configurado" : "Em falta"}
    </Badge>
  );
}

function MetricTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-md border border-border-subtle bg-surface-secondary p-3">
      <p className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-content-tertiary">
        {label}
      </p>
      <p className="mt-1 font-display text-lg text-content-primary">{value}</p>
      {hint && (
        <p className="font-mono text-[0.625rem] text-content-tertiary">
          {hint}
        </p>
      )}
    </div>
  );
}

function ActivityCard({
  title,
  window,
  hint,
}: {
  title: string;
  window: ActivityWindow;
  hint?: string;
}) {
  return (
    <Card className="space-y-3 p-5">
      <div className="flex items-center justify-between">
        <SectionTitle>{title}</SectionTitle>
        {hint && (
          <span className="font-mono text-[0.625rem] text-content-tertiary">
            {hint}
          </span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <MetricTile label="Eventos" value={formatNumber(window.events)} />
        <MetricTile label="Fresh" value={formatNumber(window.fresh)} />
        <MetricTile label="Cache" value={formatNumber(window.cache)} />
        <MetricTile label="Falhas" value={formatNumber(window.failed)} />
        <MetricTile label="Bloqueios" value={formatNumber(window.blocked)} />
        <MetricTile
          label="Custo est."
          value={formatCost(window.estimated_cost_usd)}
          hint="USD"
        />
      </div>
    </Card>
  );
}

export function DiagnosticsPanel() {
  const [data, setData] = useState<DiagnosticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/diagnostics");
      if (!res.ok) {
        setError(`Erro ${res.status}`);
        setData(null);
        return;
      }
      const json = (await res.json()) as DiagnosticsResponse;
      setData(json);
    } catch (err) {
      setError((err as Error).message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-content-tertiary">
            Estado
          </p>
          <h2 className="font-display text-lg text-content-primary">
            Diagnóstico de readiness
          </h2>
          {data && (
            <p className="font-mono text-[0.625rem] text-content-tertiary">
              Recolhido em {formatDate(data.generated_at)}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          leftIcon={<RefreshCw />}
          onClick={() => void load()}
          disabled={loading}
        >
          Atualizar
        </Button>
      </div>

      {error && (
        <Card className="p-5">
          <p className="text-sm text-content-secondary">
            Não foi possível carregar o diagnóstico: {error}
          </p>
        </Card>
      )}

      {!error && loading && !data && (
        <Card className="p-5">
          <p className="text-sm text-content-secondary">A carregar…</p>
        </Card>
      )}

      {data && (
        <>
        {/* Atividade — visão de cima */}
        <div className="grid gap-4 md:grid-cols-2">
          <ActivityCard
            title="Atividade · 24h"
            window={data.analytics.last_24h}
          />
          <ActivityCard
            title="Atividade · 7d"
            window={data.analytics.last_7d}
            hint={`${formatNumber(data.analytics.unique_profiles_7d)} perfis únicos`}
          />
          {data.analytics.error && (
            <p className="text-xs text-signal-danger md:col-span-2">
              {data.analytics.error}
            </p>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Secrets */}
          <Card className="space-y-3 p-5">
            <SectionTitle>Segredos do servidor</SectionTitle>
            <div className="divide-y divide-border-subtle">
              <Row label="APIFY_TOKEN">
                <SecretBadge present={data.secrets.APIFY_TOKEN} />
              </Row>
              <Row label="RESEND_API_KEY">
                <SecretBadge present={data.secrets.RESEND_API_KEY} />
              </Row>
              <Row label="INTERNAL_API_TOKEN">
                <SecretBadge present={data.secrets.INTERNAL_API_TOKEN} />
              </Row>
            </div>
            <p className="font-mono text-[0.625rem] text-content-tertiary">
              Apenas presença. Os valores nunca são expostos.
            </p>
          </Card>

          {/* Testing mode */}
          <Card className="space-y-3 p-5">
            <SectionTitle>Modo de teste Apify</SectionTitle>
            <div className="divide-y divide-border-subtle">
              <Row label="APIFY_ENABLED">
                <Badge
                  variant={data.apify.enabled ? "success" : "danger"}
                  dot
                >
                  {data.apify.enabled ? "Ativo" : "Desligado"}
                </Badge>
              </Row>
              <Row label="Estado">
                <Badge
                  variant={data.testing_mode.active ? "warning" : "success"}
                  dot
                >
                  {data.testing_mode.active ? "Ativo" : "Desativado"}
                </Badge>
              </Row>
              <Row label="Allowlist">
                <div className="flex flex-wrap justify-end gap-1">
                  {data.testing_mode.allowlist.length === 0 ? (
                    <span className="text-content-tertiary">—</span>
                  ) : (
                    data.testing_mode.allowlist.map((h) => (
                      <span
                        key={h}
                        className="rounded border border-border-subtle bg-surface-secondary px-1.5 py-0.5 font-mono text-[0.6875rem] text-content-primary"
                      >
                        @{h}
                      </span>
                    ))
                  )}
                </div>
              </Row>
              <Row label="Custo / perfil">
                <span className="font-mono">
                  {formatCost(data.apify.cost_per_profile_usd)}
                </span>
              </Row>
              <Row label="Custo / post">
                <span className="font-mono">
                  {formatCost(data.apify.cost_per_post_usd)}
                </span>
              </Row>
            </div>
            <p className="font-mono text-[0.625rem] text-content-tertiary">
              Para desligar testing mode: APIFY_TESTING_MODE=false. Para travar
              o provedor: APIFY_ENABLED=false.
            </p>
          </Card>

          {/* Snapshots */}
          <Card className="space-y-3 p-5">
            <SectionTitle>Snapshots de análise</SectionTitle>
            <div className="divide-y divide-border-subtle">
              <Row label="Total">
                <span className="font-mono">
                  {data.snapshots.total ?? "—"}
                </span>
              </Row>
              <Row label="Último perfil">
                {data.snapshots.latest_username ? (
                  <span className="font-mono">
                    @{data.snapshots.latest_username}
                  </span>
                ) : (
                  <span className="text-content-tertiary">—</span>
                )}
              </Row>
              <Row label="Atualizado">
                <span className="font-mono">
                  {formatDate(data.snapshots.latest_at)}
                </span>
              </Row>
              <Row label="Estado">
                {data.snapshots.latest_status ? (
                  <Badge variant="default">{data.snapshots.latest_status}</Badge>
                ) : (
                  <span className="text-content-tertiary">—</span>
                )}
              </Row>
              <Row label="Provedor">
                <span className="font-mono">
                  {data.snapshots.latest_provider ?? "—"}
                </span>
              </Row>
              <Row label="Frescura">
                <Badge
                  variant={dataSourceVariant(data.snapshots.latest_data_source)}
                  dot
                >
                  {dataSourceLabel(data.snapshots.latest_data_source)}
                </Badge>
              </Row>
            </div>
            {data.snapshots.error && (
              <p className="text-xs text-signal-danger">
                {data.snapshots.error}
              </p>
            )}
          </Card>

          {/* Report requests */}
          <Card className="space-y-3 p-5">
            <SectionTitle>Pedidos de relatório</SectionTitle>
            <div className="divide-y divide-border-subtle">
              <Row label="Total">
                <span className="font-mono">
                  {data.report_requests.total ?? "—"}
                </span>
              </Row>
              <Row label="Atualizado">
                <span className="font-mono">
                  {formatDate(data.report_requests.latest_at)}
                </span>
              </Row>
              <Row label="Pedido">
                {data.report_requests.latest_request_status ? (
                  <RequestStatusBadge
                    value={
                      data.report_requests.latest_request_status as RequestStatus
                    }
                  />
                ) : (
                  <span className="text-content-tertiary">—</span>
                )}
              </Row>
              <Row label="PDF">
                {data.report_requests.latest_pdf_status ? (
                  <PdfStatusBadge
                    value={data.report_requests.latest_pdf_status as PdfStatus}
                  />
                ) : (
                  <span className="text-content-tertiary">—</span>
                )}
              </Row>
              <Row label="Email">
                {data.report_requests.latest_delivery_status ? (
                  <DeliveryStatusBadge
                    value={
                      data.report_requests.latest_delivery_status as DeliveryStatus
                    }
                  />
                ) : (
                  <span className="text-content-tertiary">—</span>
                )}
              </Row>
            </div>
            {(data.report_requests.latest_pdf_error ||
              data.report_requests.latest_email_error) && (
              <div className="space-y-1 border-t border-border-subtle pt-2 text-xs">
                {data.report_requests.latest_pdf_error && (
                  <p className="text-signal-danger">
                    PDF: {data.report_requests.latest_pdf_error}
                  </p>
                )}
                {data.report_requests.latest_email_error && (
                  <p className="text-signal-danger">
                    Email: {data.report_requests.latest_email_error}
                  </p>
                )}
              </div>
            )}
            {data.report_requests.error && (
              <p className="text-xs text-signal-danger">
                {data.report_requests.error}
              </p>
            )}
          </Card>
        </div>

        {/* Alertas (se houver) */}
        {data.alerts.rows.length > 0 && (
          <Card className="mt-4 space-y-3 p-5">
            <SectionTitle>Alertas por reconhecer</SectionTitle>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-subtle text-left font-mono text-[0.625rem] uppercase tracking-[0.18em] text-content-tertiary">
                    <th className="py-2">Severidade</th>
                    <th className="py-2">Tipo</th>
                    <th className="py-2">Perfil</th>
                    <th className="py-2">Métrica</th>
                    <th className="py-2 text-right">Valor</th>
                    <th className="py-2 text-right">Limite</th>
                    <th className="py-2 text-right">Quando</th>
                  </tr>
                </thead>
                <tbody>
                  {data.alerts.rows.map((a) => (
                    <tr key={a.id} className="border-b border-border-subtle">
                      <td className="py-2">
                        <Badge variant={severityVariant(a.severity)} dot>
                          {a.severity}
                        </Badge>
                      </td>
                      <td className="py-2 font-mono text-xs">{a.kind}</td>
                      <td className="py-2 font-mono text-xs">
                        {a.handle ? `@${a.handle}` : "—"}
                      </td>
                      <td className="py-2 font-mono text-xs">
                        {a.metric_name}
                      </td>
                      <td className="py-2 text-right font-mono">
                        {formatNumber(a.metric_value)}
                      </td>
                      <td className="py-2 text-right font-mono text-content-tertiary">
                        {formatNumber(a.threshold_value)}
                      </td>
                      <td className="py-2 text-right font-mono text-xs text-content-tertiary">
                        {formatDate(a.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Top perfis analisados */}
        <Card className="mt-4 space-y-3 p-5">
          <SectionTitle>Perfis analisados (top 10)</SectionTitle>
          {data.top_profiles.error && (
            <p className="text-xs text-signal-danger">
              {data.top_profiles.error}
            </p>
          )}
          {data.top_profiles.rows.length === 0 ? (
            <p className="text-sm text-content-tertiary">
              Sem perfis registados.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-subtle text-left font-mono text-[0.625rem] uppercase tracking-[0.18em] text-content-tertiary">
                    <th className="py-2">Perfil</th>
                    <th className="py-2 text-right">Total</th>
                    <th className="py-2 text-right">Fresh</th>
                    <th className="py-2 text-right">Cache</th>
                    <th className="py-2 text-right">Falhas</th>
                    <th className="py-2 text-right">Custo total</th>
                    <th className="py-2 text-right">Última</th>
                  </tr>
                </thead>
                <tbody>
                  {data.top_profiles.rows.map((p) => (
                    <tr
                      key={`${p.network}:${p.handle}`}
                      className="border-b border-border-subtle"
                    >
                      <td className="py-2">
                        <div className="flex flex-col">
                          <span className="font-mono text-xs text-content-primary">
                            @{p.handle}
                          </span>
                          <span className="font-mono text-[0.625rem] text-content-tertiary">
                            {p.network}
                            {p.followers_last_seen !== null
                              ? ` · ${formatNumber(p.followers_last_seen)} seg.`
                              : ""}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 text-right font-mono">
                        {formatNumber(p.analyses_total)}
                      </td>
                      <td className="py-2 text-right font-mono">
                        {formatNumber(p.analyses_fresh)}
                      </td>
                      <td className="py-2 text-right font-mono">
                        {formatNumber(p.analyses_cache)}
                      </td>
                      <td className="py-2 text-right font-mono">
                        {formatNumber(p.analyses_failed)}
                      </td>
                      <td className="py-2 text-right font-mono">
                        {formatCost(p.estimated_cost_usd_total)}
                      </td>
                      <td className="py-2 text-right font-mono text-xs text-content-tertiary">
                        {formatDate(p.last_analyzed_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Eventos recentes */}
        <Card className="mt-4 space-y-3 p-5">
          <SectionTitle>Eventos recentes (últimos 20)</SectionTitle>
          {data.recent_events.error && (
            <p className="text-xs text-signal-danger">
              {data.recent_events.error}
            </p>
          )}
          {data.recent_events.rows.length === 0 ? (
            <p className="text-sm text-content-tertiary">
              Sem eventos registados.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-subtle text-left font-mono text-[0.625rem] uppercase tracking-[0.18em] text-content-tertiary">
                    <th className="py-2">Quando</th>
                    <th className="py-2">Perfil</th>
                    <th className="py-2">Resultado</th>
                    <th className="py-2">Origem</th>
                    <th className="py-2 text-right">Custo</th>
                    <th className="py-2 text-right">ms</th>
                    <th className="py-2">Erro</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_events.rows.map((e) => (
                    <tr key={e.id} className="border-b border-border-subtle">
                      <td className="py-2 font-mono text-xs text-content-tertiary">
                        {formatDate(e.created_at)}
                      </td>
                      <td className="py-2 font-mono text-xs">@{e.handle}</td>
                      <td className="py-2">
                        <Badge variant={outcomeVariant(e.outcome)} dot>
                          {e.outcome}
                        </Badge>
                      </td>
                      <td className="py-2">
                        <Badge
                          variant={dataSourceVariant(
                            e.data_source === "fresh" ||
                              e.data_source === "cache" ||
                              e.data_source === "stale"
                              ? e.data_source
                              : null,
                          )}
                        >
                          {e.data_source}
                        </Badge>
                      </td>
                      <td className="py-2 text-right font-mono">
                        {formatCost(e.estimated_cost_usd)}
                      </td>
                      <td className="py-2 text-right font-mono text-content-tertiary">
                        {e.duration_ms ?? "—"}
                      </td>
                      <td className="py-2 font-mono text-xs text-content-tertiary">
                        {e.error_code ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Chamadas ao provedor */}
        <Card className="mt-4 space-y-3 p-5">
          <SectionTitle>Chamadas ao provedor (últimas 15)</SectionTitle>
          {data.recent_provider_calls.error && (
            <p className="text-xs text-signal-danger">
              {data.recent_provider_calls.error}
            </p>
          )}
          {data.recent_provider_calls.rows.length === 0 ? (
            <p className="text-sm text-content-tertiary">
              Nenhuma chamada ainda. O provedor pode estar desligado.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-subtle text-left font-mono text-[0.625rem] uppercase tracking-[0.18em] text-content-tertiary">
                    <th className="py-2">Quando</th>
                    <th className="py-2">Actor</th>
                    <th className="py-2">Perfil</th>
                    <th className="py-2">Estado</th>
                    <th className="py-2 text-right">HTTP</th>
                    <th className="py-2 text-right">Posts</th>
                    <th className="py-2 text-right">ms</th>
                    <th className="py-2 text-right">Custo</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent_provider_calls.rows.map((c) => (
                    <tr key={c.id} className="border-b border-border-subtle">
                      <td className="py-2 font-mono text-xs text-content-tertiary">
                        {formatDate(c.created_at)}
                      </td>
                      <td className="py-2 font-mono text-xs">{c.actor}</td>
                      <td className="py-2 font-mono text-xs">@{c.handle}</td>
                      <td className="py-2">
                        <Badge variant={providerStatusVariant(c.status)} dot>
                          {c.status}
                        </Badge>
                      </td>
                      <td className="py-2 text-right font-mono text-content-tertiary">
                        {c.http_status ?? "—"}
                      </td>
                      <td className="py-2 text-right font-mono">
                        {formatNumber(c.posts_returned)}
                      </td>
                      <td className="py-2 text-right font-mono text-content-tertiary">
                        {c.duration_ms ?? "—"}
                      </td>
                      <td className="py-2 text-right font-mono">
                        {formatCost(c.estimated_cost_usd)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        </>
      )}
    </div>
  );
}
