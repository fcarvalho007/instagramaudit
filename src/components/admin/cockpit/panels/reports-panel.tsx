/**
 * Relatórios — listagem dos snapshots de relatório dentro da janela de
 * retenção (5 dias após `updated_at`) com botão de limpeza dos expirados.
 *
 * Estado fetched de `/api/admin/reports`. A contagem do botão de limpeza
 * vem de `expired_summary.count` — não da própria lista, porque os
 * expirados são intencionalmente filtrados da tabela activa.
 *
 * "Ver relatório" navega para `/admin/report-preview/snapshot/{id}` para
 * garantir que a pré-visualização é da linha exacta listada (e não da
 * última snapshot do username, que pode divergir após upsert).
 */

import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ExternalLink, FileText, Loader2, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { adminFetch } from "@/lib/admin/fetch";
import {
  formatCompact,
  formatCost,
  formatDate,
  formatNumber,
} from "../cockpit-formatters";
import { DataTable, type DataTableColumn } from "../parts/data-table";
import { EmptyState } from "../parts/empty-state";
import {
  costConfidenceLabel,
  type CostConfidence,
  type CostSource,
} from "@/lib/admin/cost-source-labels";

// ---------------------------------------------------------------------------
// Tipos espelhados do endpoint GET /api/admin/reports
// ---------------------------------------------------------------------------

type RetentionStatus = "active" | "expiring" | "expired";

interface CostBucket {
  actual_usd: number | null;
  estimated_usd: number;
  source: CostSource;
  calls: number;
}

interface CostSummary {
  apify: CostBucket;
  dataforseo: CostBucket;
  openai: CostBucket;
  total_actual_usd: number;
  total_estimated_usd: number;
  confidence: CostConfidence;
}

interface ReportRow {
  id: string;
  instagram_username: string;
  display_name: string | null;
  followers: number | null;
  posts_analyzed: number | null;
  dominant_format: string | null;
  avg_engagement_pct: number | null;
  created_at: string;
  updated_at: string;
  retention_base_at: string;
  retention_expires_at: string;
  retention_status: RetentionStatus;
  age_days: number;
  cost_summary: CostSummary;
}

interface ExpiredSummary {
  count: number;
  oldest_updated_at: string | null;
  newest_updated_at: string | null;
}

interface ReportsResponse {
  success: boolean;
  reports: ReportRow[];
  expired_summary: ExpiredSummary;
  retention_days: number;
  generated_at: string;
  message?: string;
  error_code?: string;
}

// ---------------------------------------------------------------------------

function formatPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(1)}%`;
}

function RetentionBadge({ status }: { status: RetentionStatus }) {
  if (status === "active") {
    return (
      <Badge variant="success" dot>
        Ativo
      </Badge>
    );
  }
  if (status === "expiring") {
    return (
      <Badge variant="warning" dot>
        A expirar
      </Badge>
    );
  }
  return (
    <Badge variant="danger" dot>
      Expirado
    </Badge>
  );
}

function ConfidenceBadge({ value }: { value: CostConfidence }) {
  if (value === "confirmado") {
    return <Badge variant="success">{costConfidenceLabel(value)}</Badge>;
  }
  if (value === "parcial") {
    return <Badge variant="warning">{costConfidenceLabel(value)}</Badge>;
  }
  if (value === "estimado") {
    return <Badge variant="warning">{costConfidenceLabel(value)}</Badge>;
  }
  return <Badge variant="default">{costConfidenceLabel(value)}</Badge>;
}

export function ReportsPanel() {
  const [data, setData] = useState<ReportsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cleaning, setCleaning] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/reports");
      const body = (await res.json().catch(() => ({}))) as ReportsResponse;
      if (!res.ok || !body.success) {
        setError(body.message ?? `Erro ${res.status}`);
        setData(null);
      } else {
        setData(body);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleCleanup() {
    setCleaning(true);
    setCleanupResult(null);
    try {
      const res = await adminFetch("/api/admin/reports/cleanup-expired", {
        method: "POST",
      });
      const body = (await res.json().catch(() => ({}))) as {
        success: boolean;
        deleted_count?: number;
        message?: string;
      };
      if (!res.ok || !body.success) {
        setCleanupResult(`Falhou: ${body.message ?? `Erro ${res.status}`}`);
      } else {
        setCleanupResult(
          `Foram eliminados ${body.deleted_count ?? 0} relatórios expirados.`,
        );
        await refresh();
      }
    } catch (e) {
      setCleanupResult(
        `Falhou: ${e instanceof Error ? e.message : "Erro desconhecido."}`,
      );
    } finally {
      setCleaning(false);
    }
  }

  const expiredCount = data?.expired_summary.count ?? 0;
  const cleanupDisabled = loading || cleaning || expiredCount === 0;

  const columns: DataTableColumn<ReportRow>[] = [
    {
      key: "handle",
      header: "Handle",
      render: (r) => (
        <div className="flex flex-col">
          <span className="font-mono text-content-primary">
            @{r.instagram_username}
          </span>
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
      render: (r) => (
        <span className="font-mono">{formatCompact(r.followers)}</span>
      ),
    },
    {
      key: "posts",
      header: "Posts",
      align: "right",
      render: (r) => <span className="font-mono">{formatNumber(r.posts_analyzed)}</span>,
    },
    {
      key: "format",
      header: "Formato",
      render: (r) =>
        r.dominant_format ? (
          <span className="text-eyebrow text-content-secondary">
            {r.dominant_format}
          </span>
        ) : (
          <span className="text-content-tertiary">—</span>
        ),
    },
    {
      key: "engagement",
      header: "Eng. médio",
      align: "right",
      render: (r) => <span className="font-mono">{formatPercent(r.avg_engagement_pct)}</span>,
    },
    {
      key: "updated",
      header: "Atualizado",
      render: (r) => formatDate(r.updated_at),
    },
    {
      key: "expires",
      header: "Expira em",
      render: (r) => (
        <span
          className={
            r.retention_status === "expiring"
              ? "text-signal-warning"
              : "text-content-secondary"
          }
        >
          {formatDate(r.retention_expires_at)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Estado",
      render: (r) => <RetentionBadge status={r.retention_status} />,
    },
    {
      key: "cost_actual",
      header: "Custo (real)",
      align: "right",
      render: (r) => (
        <span className="font-mono text-xs">
          {r.cost_summary.total_actual_usd > 0
            ? formatCost(r.cost_summary.total_actual_usd)
            : "—"}
        </span>
      ),
    },
    {
      key: "cost_confidence",
      header: "Confiança",
      render: (r) => <ConfidenceBadge value={r.cost_summary.confidence} />,
    },
    {
      key: "preview",
      header: "Relatório",
      render: (r) => (
        <Link
          to="/admin/report-preview/snapshot/$snapshotId"
          params={{ snapshotId: r.id }}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-accent-primary transition-colors hover:text-accent-primary/80"
        >
          Ver relatório
          <ExternalLink className="size-3" aria-hidden="true" />
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Cabeçalho explicativo: regra de retenção e distinção cache vs retenção */}
      <div className="rounded-lg border border-border-subtle bg-surface-elevated px-4 py-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2 text-sm text-content-secondary">
            <p>
              Por sustentabilidade, os relatórios ficam disponíveis durante 5
              dias após a geração.
            </p>
            <p className="text-xs text-content-tertiary">
              A cache técnica pode expirar antes; a biblioteca admin mantém o
              relatório disponível durante 5 dias.
            </p>
            <p className="text-xs text-content-tertiary">
              <span className="text-eyebrow-sm">
                Cache
              </span>{" "}
              é a janela técnica de reuso interno (evita repetir chamadas ao
              provider).{" "}
              <span className="text-eyebrow-sm">
                Retenção
              </span>{" "}
              é a janela de visibilidade administrativa: 5 dias contados a
              partir de <span className="font-mono">updated_at</span>.
            </p>
          </div>

          <div className="flex flex-col items-start gap-2 md:items-end">
            <CleanupButton
              count={expiredCount}
              disabled={cleanupDisabled}
              cleaning={cleaning}
              onConfirm={handleCleanup}
              summary={data?.expired_summary ?? null}
            />
            {expiredCount === 0 ? (
              <p className="text-xs text-content-tertiary">
                Sem relatórios expirados.
              </p>
            ) : null}
            {cleanupResult ? (
              <p className="text-xs text-content-secondary">{cleanupResult}</p>
            ) : null}
          </div>
        </div>
      </div>

      {/* Estado de carregamento / erro */}
      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-signal-danger/30 bg-signal-danger/10 px-4 py-3 text-sm text-signal-danger"
        >
          {error}
        </div>
      ) : null}

      {/* Tabela ou empty-state */}
      {loading && !data ? (
        <div className="flex items-center gap-2 rounded-lg border border-border-subtle bg-surface-elevated px-4 py-3 text-sm text-content-tertiary">
          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          A carregar relatórios…
        </div>
      ) : data && data.reports.length > 0 ? (
        <DataTable
          columns={columns}
          rows={data.reports}
          rowKey={(r) => r.id}
        />
      ) : data ? (
        <EmptyState
          icon={<FileText className="size-4" />}
          title="Sem relatórios na janela de retenção."
          description={
            expiredCount > 0
              ? `Existem ${expiredCount} relatório${expiredCount === 1 ? "" : "s"} fora da janela. Limpa-os para libertar espaço.`
              : "Os relatórios gerados nos últimos 5 dias aparecem aqui."
          }
        />
      ) : null}
    </div>
  );
}

function CleanupButton({
  count,
  disabled,
  cleaning,
  onConfirm,
  summary,
}: {
  count: number;
  disabled: boolean;
  cleaning: boolean;
  onConfirm: () => void | Promise<void>;
  summary: ExpiredSummary | null;
}) {
  // Quando count = 0 mantemos o botão visível mas desactivado, sem dialog.
  if (count === 0) {
    return (
      <Button variant="outline" size="sm" disabled aria-disabled="true">
        <Trash2 className="mr-2 size-3.5" aria-hidden="true" />
        Limpar relatórios expirados (0)
      </Button>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          aria-busy={cleaning}
        >
          {cleaning ? (
            <Loader2 className="mr-2 size-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Trash2 className="mr-2 size-3.5" aria-hidden="true" />
          )}
          Limpar relatórios expirados ({count})
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Limpar relatórios expirados?</AlertDialogTitle>
          <AlertDialogDescription>
            Vão ser eliminados {count} snapshot
            {count === 1 ? "" : "s"} com mais de 5 dias desde a última
            actualização.
            {summary?.oldest_updated_at && summary?.newest_updated_at ? (
              <>
                {" "}Janela:{" "}
                <span className="font-mono">
                  {formatDate(summary.oldest_updated_at)}
                </span>{" "}
                até{" "}
                <span className="font-mono">
                  {formatDate(summary.newest_updated_at)}
                </span>
                .
              </>
            ) : null}{" "}
            Os eventos, logs do provider e alertas <strong>não</strong> são
            tocados — apenas os snapshots de relatório.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              void onConfirm();
            }}
          >
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}