/**
 * Diagnóstico — saúde técnica e configuração.
 * Read-only. Nunca expõe valores de segredos, apenas presença.
 */

import { Badge } from "@/components/ui/badge";

import {
  DataSourceBadge,
  PresenceBadge,
  ProviderStatusBadge,
} from "../cockpit-badges";
import {
  formatCost,
  formatDate,
  formatDuration,
  formatNumber,
} from "../cockpit-formatters";
import type { CockpitData } from "../cockpit-types";
import { DataTable, type DataTableColumn } from "../parts/data-table";
import { EmptyState } from "../parts/empty-state";

interface Props {
  data: CockpitData | null;
}

const SECRET_LABELS: Array<{ key: keyof CockpitData["secrets"]; label: string }> = [
  { key: "APIFY_TOKEN", label: "APIFY_TOKEN" },
  { key: "RESEND_API_KEY", label: "RESEND_API_KEY" },
  { key: "INTERNAL_API_TOKEN", label: "INTERNAL_API_TOKEN" },
];

export function DiagnosticsPanel({ data }: Props) {
  if (!data) return <PanelSkeleton />;

  const providerCalls = data.recent_provider_calls.rows;
  const callColumns: DataTableColumn<(typeof providerCalls)[number]>[] = [
    { key: "created_at", header: "Quando", render: (r) => formatDate(r.created_at) },
    { key: "actor", header: "Actor", render: (r) => <span className="font-mono text-xs">{r.actor}</span> },
    { key: "handle", header: "Handle", render: (r) => <span className="font-mono">@{r.handle}</span> },
    { key: "status", header: "Estado", render: (r) => <ProviderStatusBadge value={r.status} /> },
    { key: "http", header: "HTTP", align: "right", render: (r) => formatNumber(r.http_status) },
    { key: "duration", header: "Duração", align: "right", render: (r) => formatDuration(r.duration_ms) },
    { key: "posts", header: "Posts", align: "right", render: (r) => formatNumber(r.posts_returned) },
    { key: "cost", header: "Custo", align: "right", render: (r) => <span className="font-mono">{formatCost(r.estimated_cost_usd)}</span> },
  ];

  return (
    <div className="space-y-6">
      <Section title="Segredos" description="Apenas estado. Os valores nunca são expostos.">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {SECRET_LABELS.map((s) => (
            <div
              key={s.key}
              className="flex items-center justify-between rounded-lg border border-border-subtle bg-surface-elevated px-4 py-3"
            >
              <span className="font-mono text-xs text-content-secondary">{s.label}</span>
              <PresenceBadge present={data.secrets[s.key]} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Apify" description="Estado do provedor e tarifas usadas para estimar custo.">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <KV label="Kill-switch">
            <Badge variant={data.apify.enabled ? "success" : "warning"} dot>
              {data.apify.enabled ? "Ativo" : "Desligado"}
            </Badge>
          </KV>
          <KV label="Custo / perfil">
            <span className="font-mono">{formatCost(data.apify.cost_per_profile_usd)}</span>
          </KV>
          <KV label="Custo / post">
            <span className="font-mono">{formatCost(data.apify.cost_per_post_usd)}</span>
          </KV>
        </div>
      </Section>

      <Section
        title="Modo de teste"
        description="Quando ativo, só os handles na allowlist disparam chamadas reais ao provedor."
      >
        <div className="rounded-lg border border-border-subtle bg-surface-elevated p-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-content-tertiary">
              Estado
            </span>
            <Badge variant={data.testing_mode.active ? "accent" : "default"} dot>
              {data.testing_mode.active ? "Ativo" : "Inativo"}
            </Badge>
          </div>
          {data.testing_mode.allowlist.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {data.testing_mode.allowlist.map((h) => (
                <span
                  key={h}
                  className="rounded-md border border-border-subtle bg-surface-base px-2 py-0.5 font-mono text-xs text-content-secondary"
                >
                  @{h}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs text-content-tertiary">Allowlist vazia.</p>
          )}
        </div>
      </Section>

      <Section title="Última snapshot" description="Estado da última análise armazenada.">
        {data.snapshots.error ? (
          <ErrorBox message={data.snapshots.error} />
        ) : data.snapshots.latest_at ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <KV label="Handle">
              <span className="font-mono">@{data.snapshots.latest_username}</span>
            </KV>
            <KV label="Fonte">
              <DataSourceBadge value={data.snapshots.latest_data_source} />
            </KV>
            <KV label="Provider">
              <span className="font-mono text-xs">{data.snapshots.latest_provider}</span>
            </KV>
            <KV label="Atualizada">{formatDate(data.snapshots.latest_at)}</KV>
          </div>
        ) : (
          <EmptyState title="Sem snapshots." description="Ainda nenhuma análise foi armazenada." />
        )}
        <p className="mt-2 text-xs text-content-tertiary">
          Total de snapshots: <span className="font-mono">{formatNumber(data.snapshots.total)}</span>
        </p>
      </Section>

      <Section
        title="Últimas chamadas ao provedor"
        description="Para investigar timeouts, falhas HTTP ou erros de configuração."
      >
        {data.recent_provider_calls.error ? (
          <ErrorBox message={data.recent_provider_calls.error} />
        ) : (
          <DataTable
            columns={callColumns}
            rows={providerCalls}
            rowKey={(r) => r.id}
            empty={<EmptyState title="Sem chamadas registadas." />}
          />
        )}
      </Section>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="font-display text-base text-content-primary">{title}</h3>
        {description ? (
          <p className="text-xs text-content-tertiary">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function KV({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-elevated px-4 py-3">
      <p className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-content-tertiary">
        {label}
      </p>
      <div className="mt-1.5 text-sm text-content-primary">{children}</div>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-signal-danger/30 bg-signal-danger/10 p-3 text-xs text-signal-danger">
      {message}
    </div>
  );
}

function PanelSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-20 animate-pulse rounded-lg border border-border-subtle bg-surface-elevated"
        />
      ))}
    </div>
  );
}