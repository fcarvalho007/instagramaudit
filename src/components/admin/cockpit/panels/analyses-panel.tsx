/**
 * Análises — histórico recente de eventos e janelas 24h / 7d.
 */

import { DataSourceBadge, OutcomeBadge } from "../cockpit-badges";
import {
  formatCost,
  formatDate,
  formatDuration,
  formatNumber,
} from "../cockpit-formatters";
import type { CockpitData, RecentEventRow } from "../cockpit-types";
import { DataTable, type DataTableColumn } from "../parts/data-table";
import { EmptyState } from "../parts/empty-state";
import { StatCard } from "../parts/stat-card";

interface Props {
  data: CockpitData | null;
}

export function AnalysesPanel({ data }: Props) {
  if (!data) return <PanelSkeleton />;

  const events = data.recent_events.rows;
  const columns: DataTableColumn<RecentEventRow>[] = [
    { key: "created_at", header: "Quando", render: (r) => formatDate(r.created_at) },
    {
      key: "handle",
      header: "Handle",
      render: (r) => <span className="font-mono">@{r.handle}</span>,
    },
    { key: "outcome", header: "Resultado", render: (r) => <OutcomeBadge value={r.outcome} /> },
    { key: "data_source", header: "Fonte", render: (r) => <DataSourceBadge value={r.data_source} /> },
    {
      key: "duration",
      header: "Duração",
      align: "right",
      render: (r) => formatDuration(r.duration_ms),
    },
    {
      key: "cost",
      header: "Custo est.",
      align: "right",
      render: (r) => <span className="font-mono">{formatCost(r.estimated_cost_usd)}</span>,
    },
    {
      key: "error",
      header: "Código de erro",
      render: (r) =>
        r.error_code ? (
          <span className="font-mono text-xs text-signal-danger">{r.error_code}</span>
        ) : (
          <span className="text-content-tertiary">—</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Eventos · 24h" value={formatNumber(data.analytics.last_24h.events)} />
        <StatCard label="Eventos · 7d" value={formatNumber(data.analytics.last_7d.events)} />
        <StatCard label="Perfis únicos · 7d" value={formatNumber(data.analytics.unique_profiles_7d)} />
        <StatCard
          label="Custo est. · 24h"
          value={formatCost(data.analytics.last_24h.estimated_cost_usd)}
          tone="accent"
        />
      </div>

      <section className="space-y-3">
        <div>
          <h3 className="font-display text-base text-content-primary">Últimos 20 eventos</h3>
          <p className="text-xs text-content-tertiary">
            Cada análise registada gera um evento — fresh, cache, stale ou falha.
          </p>
        </div>
        {data.recent_events.error ? (
          <div className="rounded-lg border border-signal-danger/30 bg-signal-danger/10 p-3 text-xs text-signal-danger">
            {data.recent_events.error}
          </div>
        ) : (
          <DataTable
            columns={columns}
            rows={events}
            rowKey={(r) => r.id}
            empty={
              <EmptyState
                title="Sem eventos ainda."
                description="Corra uma análise em /analyze/<handle> para começar a popular este histórico."
              />
            }
          />
        )}
      </section>
    </div>
  );
}

function PanelSkeleton() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg border border-border-subtle bg-surface-elevated" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-lg border border-border-subtle bg-surface-elevated" />
    </div>
  );
}