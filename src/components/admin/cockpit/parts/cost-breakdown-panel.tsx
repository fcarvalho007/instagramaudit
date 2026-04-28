/**
 * Per-snapshot provider cost breakdown for the admin preview.
 *
 * Two parts:
 *  1. Three provider cards (Apify, DataForSEO, OpenAI) showing actual /
 *     estimated cost and the cost-source label.
 *  2. A `DataTable` of every `provider_call_logs` row attributed to the
 *     snapshot window, with operation/status/cost/duration.
 *
 * Server data already arrives via `/api/admin/snapshot-by-id`. This
 * component does NOT fetch and does NOT call any provider.
 */

import { Badge } from "@/components/ui/badge";
import {
  formatCost,
  formatDate,
  formatDuration,
  providerStatusLabel,
} from "../cockpit-formatters";
import { DataTable, type DataTableColumn } from "./data-table";
import {
  costSourceLabel,
  providerLabel,
  type CostSource,
  type ProviderKey,
} from "@/lib/admin/cost-source-labels";

export interface ProviderCostBucketView {
  actual_usd: number | null;
  estimated_usd: number;
  source: CostSource;
  calls: number;
}

export interface CostSummaryView {
  apify: ProviderCostBucketView;
  dataforseo: ProviderCostBucketView;
  openai: ProviderCostBucketView;
  total_actual_usd: number;
  total_estimated_usd: number;
  confidence: "confirmado" | "parcial" | "estimado" | "sem_custos";
}

export interface ProviderCallView {
  id: string;
  provider: string;
  actor: string;
  handle: string;
  status: string;
  http_status: number | null;
  actual_cost_usd: number | null;
  estimated_cost_usd: number | null;
  cost_source: CostSource;
  duration_ms: number | null;
  created_at: string;
}

function sourceBadgeVariant(
  source: CostSource,
): "success" | "warning" | "neutral" | "danger" {
  switch (source) {
    case "provider_reported":
      return "success";
    case "calculated":
      return "success";
    case "estimated":
      return "warning";
    case "cache_hit":
      return "neutral";
    case "not_used":
      return "neutral";
  }
}

function ProviderCard({
  provider,
  bucket,
}: {
  provider: ProviderKey;
  bucket: ProviderCostBucketView;
}) {
  const isNotUsed = bucket.source === "not_used";
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-elevated p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-content-tertiary">
          {providerLabel(provider)}
        </p>
        <Badge variant={sourceBadgeVariant(bucket.source)}>
          {costSourceLabel(bucket.source)}
        </Badge>
      </div>
      <div className="mt-3 space-y-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-xs text-content-tertiary">Custo real</span>
          <span className="font-mono text-sm text-content-primary">
            {isNotUsed ? "—" : formatCost(bucket.actual_usd)}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-xs text-content-tertiary">Estimado</span>
          <span className="font-mono text-xs text-content-secondary">
            {isNotUsed ? "—" : formatCost(bucket.estimated_usd)}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-xs text-content-tertiary">Chamadas</span>
          <span className="font-mono text-xs text-content-secondary">
            {bucket.calls}
          </span>
        </div>
      </div>
    </div>
  );
}

export function CostBreakdownPanel({
  summary,
  calls,
}: {
  summary: CostSummaryView;
  calls: ProviderCallView[];
}) {
  const columns: DataTableColumn<ProviderCallView>[] = [
    {
      key: "provider",
      header: "Provedor",
      render: (r) => (
        <span className="font-mono text-xs uppercase tracking-[0.12em] text-content-secondary">
          {r.provider}
        </span>
      ),
    },
    {
      key: "actor",
      header: "Operação",
      render: (r) => (
        <span className="font-mono text-xs text-content-primary">{r.actor}</span>
      ),
    },
    {
      key: "status",
      header: "Estado",
      render: (r) => (
        <span className="text-xs">
          {providerStatusLabel(r.status)}
          {r.http_status ? (
            <span className="ml-1 font-mono text-content-tertiary">
              · {r.http_status}
            </span>
          ) : null}
        </span>
      ),
    },
    {
      key: "actual",
      header: "Custo real",
      align: "right",
      render: (r) => (
        <span className="font-mono text-xs">
          {r.cost_source === "provider_reported" ||
          r.cost_source === "calculated"
            ? formatCost(r.actual_cost_usd)
            : "—"}
        </span>
      ),
    },
    {
      key: "estimated",
      header: "Estimado",
      align: "right",
      render: (r) => (
        <span className="font-mono text-xs text-content-secondary">
          {formatCost(r.estimated_cost_usd)}
        </span>
      ),
    },
    {
      key: "source",
      header: "Fonte",
      render: (r) => (
        <Badge variant={sourceBadgeVariant(r.cost_source)}>
          {costSourceLabel(r.cost_source)}
        </Badge>
      ),
    },
    {
      key: "duration",
      header: "Duração",
      align: "right",
      render: (r) => (
        <span className="font-mono text-xs">{formatDuration(r.duration_ms)}</span>
      ),
    },
    {
      key: "created",
      header: "Criado",
      render: (r) => (
        <span className="text-xs text-content-secondary">
          {formatDate(r.created_at)}
        </span>
      ),
    },
  ];

  return (
    <section className="mx-auto max-w-7xl px-6 pb-10">
      <div className="rounded-xl border border-border-default/40 bg-surface-secondary p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-[10px] uppercase tracking-wider text-content-tertiary">
            Custos do provedor neste relatório
          </p>
          <div className="flex items-center gap-2 text-xs text-content-secondary">
            <span className="font-mono">
              total real {formatCost(summary.total_actual_usd)}
            </span>
            <span className="text-content-tertiary">·</span>
            <span className="font-mono">
              estimado {formatCost(summary.total_estimated_usd)}
            </span>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <ProviderCard provider="apify" bucket={summary.apify} />
          <ProviderCard provider="dataforseo" bucket={summary.dataforseo} />
          <ProviderCard provider="openai" bucket={summary.openai} />
        </div>

        <div className="mt-5">
          {calls.length === 0 ? (
            <p className="rounded-md border border-border-subtle bg-surface-base px-3 py-2 text-xs text-content-tertiary">
              Sem chamadas registadas a provedores na janela deste snapshot —
              relatório servido via cache ou sem chamadas externas.
            </p>
          ) : (
            <DataTable
              columns={columns}
              rows={calls}
              rowKey={(r) => r.id}
            />
          )}
        </div>
      </div>
    </section>
  );
}
