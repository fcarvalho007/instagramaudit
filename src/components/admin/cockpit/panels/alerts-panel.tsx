/**
 * Alertas — sinais não bloqueantes a partir de usage_alerts.
 * Esta versão é só leitura; o ack/arquivamento fica para mais tarde.
 */

import { ShieldCheck, Info } from "lucide-react";

import { AlertKindBadge, SeverityBadge } from "../cockpit-badges";
import { formatDate, formatNumber } from "../cockpit-formatters";
import type { AlertRow, CockpitData } from "../cockpit-types";
import { DataTable, type DataTableColumn } from "../parts/data-table";
import { EmptyState } from "../parts/empty-state";
import { StatCard } from "../parts/stat-card";

interface Props {
  data: CockpitData | null;
}

export function AlertsPanel({ data }: Props) {
  if (!data) return <PanelSkeleton />;

  const rows = data.alerts.rows;
  const thresholds = data.alert_thresholds;

  const columns: DataTableColumn<AlertRow>[] = [
    { key: "created_at", header: "Quando", render: (r) => formatDate(r.created_at) },
    { key: "severity", header: "Severidade", render: (r) => <SeverityBadge value={r.severity} /> },
    { key: "kind", header: "Tipo", render: (r) => <AlertKindBadge value={r.kind} /> },
    {
      key: "handle",
      header: "Handle",
      render: (r) =>
        r.handle ? (
          <span className="font-mono">@{r.handle}</span>
        ) : (
          <span className="text-content-tertiary">— global —</span>
        ),
    },
    { key: "metric_name", header: "Métrica", render: (r) => <span className="font-mono text-xs">{r.metric_name}</span> },
    {
      key: "metric_value",
      header: "Valor",
      align: "right",
      render: (r) => <span className="font-mono">{formatNumber(r.metric_value)}</span>,
    },
    {
      key: "threshold",
      header: "Limite",
      align: "right",
      render: (r) => <span className="font-mono text-content-tertiary">{formatNumber(r.threshold_value)}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="Alertas activos"
          value={formatNumber(rows.length)}
          sublabel="Não reconhecidos"
          tone={rows.length > 0 ? "warning" : "default"}
        />
        <div className="flex items-start gap-2 rounded-lg border border-border-subtle bg-surface-elevated p-4 text-sm text-content-secondary sm:col-span-2">
          <Info className="mt-0.5 size-4 shrink-0 text-accent-luminous" aria-hidden="true" />
          <p>
            Os alertas são informativos e não bloqueiam utilizadores. Servem
            para identificar perfis repetidos, picos de IP, taxas de falha
            elevadas ou custo diário acima do limite definido.
          </p>
        </div>
      </div>

      <section className="space-y-3">
        <h3 className="font-display text-base text-content-primary">
          Alertas recentes
        </h3>
        {data.alerts.error ? (
          <div className="rounded-lg border border-signal-danger/30 bg-signal-danger/10 p-3 text-xs text-signal-danger">
            {data.alerts.error}
          </div>
        ) : (
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(r) => r.id}
            empty={
              <EmptyState
                icon={<ShieldCheck className="size-4" />}
                tone="ok"
                title="Sem alertas activos."
                description="Quando algum limite for ultrapassado, o evento aparece aqui. Os alertas são informativos — não bloqueiam quem está a usar o serviço."
              />
            }
          />
        )}
      </section>

      {thresholds ? (
        <section className="space-y-3">
          <div>
            <h3 className="font-display text-base text-content-primary">
              Limites configurados
            </h3>
            <p className="text-sm text-content-secondary">
              Ajustáveis via variáveis de ambiente, sem redeploy.
            </p>
          </div>
          <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <ThresholdRow label="Perfil repetido / hora" value={`≥ ${thresholds.repeated_profile_per_hour}`} />
            <ThresholdRow label="Burst de IP / hora" value={`≥ ${thresholds.ip_burst_per_hour}`} />
            <ThresholdRow
              label="Taxa de falhas"
              value={`≥ ${Math.round(thresholds.failure_rate * 100)}% (mín. ${thresholds.failure_rate_min_events} eventos)`}
            />
            <ThresholdRow label="Custo diário (USD)" value={`≥ $${thresholds.daily_cost_usd}`} />
          </dl>
        </section>
      ) : null}
    </div>
  );
}

function ThresholdRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border-subtle bg-surface-elevated px-4 py-2.5">
      <dt className="text-sm text-content-secondary">{label}</dt>
      <dd className="font-mono text-sm tabular-nums text-content-primary">
        {value}
      </dd>
    </div>
  );
}

function PanelSkeleton() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="h-24 animate-pulse rounded-lg border border-border-subtle bg-surface-elevated" />
        <div className="h-24 animate-pulse rounded-lg border border-border-subtle bg-surface-elevated" />
      </div>
      <div className="h-48 animate-pulse rounded-lg border border-border-subtle bg-surface-elevated" />
    </div>
  );
}
