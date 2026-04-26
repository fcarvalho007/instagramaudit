/**
 * Perfis — rollup por handle a partir de social_profiles.
 */

import { Badge } from "@/components/ui/badge";

import { DataSourceBadge, OutcomeBadge } from "../cockpit-badges";
import {
  formatCompact,
  formatCost,
  formatDate,
  formatNumber,
} from "../cockpit-formatters";
import type { CockpitData, TopProfileRow } from "../cockpit-types";
import { DataTable, type DataTableColumn } from "../parts/data-table";
import { EmptyState } from "../parts/empty-state";

interface Props {
  data: CockpitData | null;
}

export function ProfilesPanel({ data }: Props) {
  if (!data) return <PanelSkeleton />;

  const repeatedThreshold = data.alert_thresholds?.repeated_profile_per_hour ?? 5;

  const columns: DataTableColumn<TopProfileRow>[] = [
    {
      key: "handle",
      header: "Handle",
      render: (r) => (
        <div className="flex flex-col">
          <span className="font-mono text-content-primary">@{r.handle}</span>
          {r.display_name ? (
            <span className="text-xs text-content-tertiary">{r.display_name}</span>
          ) : null}
        </div>
      ),
    },
    {
      key: "followers",
      header: "Seguidores",
      align: "right",
      render: (r) => <span className="font-mono">{formatCompact(r.followers_last_seen)}</span>,
    },
    {
      key: "total",
      header: "Análises",
      align: "right",
      render: (r) => (
        <div className="inline-flex items-center justify-end gap-2">
          <span className="font-mono">{formatNumber(r.analyses_total)}</span>
          {r.analyses_total >= repeatedThreshold ? (
            <Badge variant="warning" size="sm">
              Repetido
            </Badge>
          ) : null}
        </div>
      ),
    },
    { key: "fresh", header: "Fresh", align: "right", render: (r) => <span className="font-mono">{formatNumber(r.analyses_fresh)}</span> },
    { key: "cache", header: "Cache", align: "right", render: (r) => <span className="font-mono">{formatNumber(r.analyses_cache)}</span> },
    { key: "failed", header: "Falhas", align: "right", render: (r) => <span className="font-mono">{formatNumber(r.analyses_failed)}</span> },
    {
      key: "cost",
      header: "Custo total",
      align: "right",
      render: (r) => <span className="font-mono">{formatCost(r.estimated_cost_usd_total)}</span>,
    },
    { key: "last", header: "Última", render: (r) => formatDate(r.last_analyzed_at) },
    {
      key: "last_outcome",
      header: "Resultado",
      render: (r) => (r.last_outcome ? <OutcomeBadge value={r.last_outcome} /> : <span className="text-content-tertiary">—</span>),
    },
    {
      key: "last_source",
      header: "Fonte",
      render: (r) => <DataSourceBadge value={r.last_data_source} />,
    },
  ];

  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-display text-base text-content-primary">Top 10 perfis</h3>
        <p className="text-xs text-content-tertiary">
          Ordenados por nº total de análises. Handles com ≥ {repeatedThreshold} análises são marcados como
          "Repetido" (sinal informativo, não bloqueia ninguém).
        </p>
      </div>
      {data.top_profiles.error ? (
        <div className="rounded-lg border border-signal-danger/30 bg-signal-danger/10 p-3 text-xs text-signal-danger">
          {data.top_profiles.error}
        </div>
      ) : (
        <DataTable
          columns={columns}
          rows={data.top_profiles.rows}
          rowKey={(r) => `${r.network}:${r.handle}`}
          empty={
            <EmptyState
              title="Sem perfis ainda."
              description="Após a primeira análise o handle aparece aqui."
            />
          }
        />
      )}
    </div>
  );
}

function PanelSkeleton() {
  return (
    <div className="h-64 animate-pulse rounded-lg border border-border-subtle bg-surface-elevated" />
  );
}