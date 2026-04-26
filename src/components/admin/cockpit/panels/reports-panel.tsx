/**
 * Relatórios — listagem operacional dos snapshots disponíveis para
 * pré-visualização administrativa, com retenção de 5 dias.
 *
 * - Lê de `GET /api/admin/reports`.
 * - Cada linha liga a `/admin/report-preview/{handle}`.
 * - Mostra o estado de retenção (Ativo / A expirar / Expirado) calculado
 *   sobre `created_at`.
 * - Botão "Limpar relatórios expirados" pede confirmação e chama
 *   `POST /api/admin/reports/cleanup-expired`. NÃO corre automaticamente.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, FileText, RefreshCw, Trash2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

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
} from "@/components/ui/alert-dialog";
import { adminFetch } from "@/lib/admin/fetch";

import { formatDate, formatNumber } from "../cockpit-formatters";
import { DataTable, type DataTableColumn } from "../parts/data-table";
import { EmptyState } from "../parts/empty-state";

interface ReportRow {
  id: string;
  instagram_username: string;
  competitors_count: number;
  created_at: string;
  updated_at: string;
  cache_expires_at: string | null;
  retention_expires_at: string;
  retention_status: "active" | "expiring" | "expired";
  posts_count: number;
  dominant_format: string | null;
  engagement_rate: number | null;
  provider: string;
  analysis_status: string;
}

interface ReportsListResponse {
  success: true;
  retention_days: number;
  generated_at: string;
  total: number;
  rows: ReportRow[];
}

interface CleanupResponse {
  success: true;
  retention_days: number;
  cutoff: string;
  deleted: number;
  deleted_ids: string[];
}

type LoadState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; data: ReportsListResponse }
  | { kind: "error"; message: string };

function statusBadge(status: ReportRow["retention_status"]) {
  if (status === "active") {
    return (
      <Badge variant="success" size="sm" dot>
        Ativo
      </Badge>
    );
  }
  if (status === "expiring") {
    return (
      <Badge variant="warning" size="sm" dot>
        A expirar
      </Badge>
    );
  }
  return (
    <Badge variant="danger" size="sm" dot>
      Expirado
    </Badge>
  );
}

function formatPercent(v: number | null): string {
  if (v === null || !Number.isFinite(v)) return "—";
  return `${v.toFixed(2).replace(".", ",")}%`;
}

export function ReportsPanel() {
  const [state, setState] = useState<LoadState>({ kind: "idle" });
  const [confirming, setConfirming] = useState(false);
  const [cleaning, setCleaning] = useState(false);

  const refresh = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const res = await adminFetch("/api/admin/reports");
      const body = (await res.json().catch(() => ({}))) as
        | ReportsListResponse
        | { success: false; message?: string };
      if (!res.ok || !("success" in body) || !body.success) {
        const message =
          (body as { message?: string }).message ?? `Erro ${res.status}`;
        setState({ kind: "error", message });
        return;
      }
      setState({ kind: "ready", data: body });
    } catch (e) {
      setState({
        kind: "error",
        message: e instanceof Error ? e.message : "Erro desconhecido.",
      });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const expiredCount = useMemo(() => {
    if (state.kind !== "ready") return 0;
    return state.data.rows.filter((r) => r.retention_status === "expired").length;
  }, [state]);

  async function runCleanup() {
    setCleaning(true);
    try {
      const res = await adminFetch("/api/admin/reports/cleanup-expired", {
        method: "POST",
      });
      const body = (await res.json().catch(() => ({}))) as
        | CleanupResponse
        | { success: false; message?: string };
      if (!res.ok || !("success" in body) || !body.success) {
        const message =
          (body as { message?: string }).message ?? `Erro ${res.status}`;
        toast.error("Falha ao limpar relatórios expirados", {
          description: message,
        });
        return;
      }
      toast.success(
        body.deleted > 0
          ? `${body.deleted} relatório(s) expirado(s) removido(s).`
          : "Nada para remover — nenhum relatório expirado.",
      );
      setConfirming(false);
      await refresh();
    } catch (e) {
      toast.error("Falha ao limpar relatórios expirados", {
        description: e instanceof Error ? e.message : "Erro desconhecido.",
      });
    } finally {
      setCleaning(false);
    }
  }

  const columns: DataTableColumn<ReportRow>[] = [
    {
      key: "handle",
      header: "Perfil",
      render: (r) => (
        <div className="flex flex-col">
          <span className="font-mono text-content-primary">
            @{r.instagram_username}
          </span>
          <span className="text-xs text-content-tertiary">
            {r.provider} · {r.analysis_status}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Retenção",
      render: (r) => (
        <div className="flex flex-col gap-1">
          {statusBadge(r.retention_status)}
          <span className="font-mono text-[0.6875rem] uppercase tracking-wide text-content-tertiary">
            até {formatDate(r.retention_expires_at)}
          </span>
        </div>
      ),
    },
    {
      key: "competitors",
      header: "Concorrentes",
      align: "right",
      render: (r) => <span className="font-mono">{formatNumber(r.competitors_count)}</span>,
    },
    {
      key: "posts",
      header: "Posts",
      align: "right",
      render: (r) => <span className="font-mono">{formatNumber(r.posts_count)}</span>,
    },
    {
      key: "format",
      header: "Formato dominante",
      render: (r) =>
        r.dominant_format ? (
          <span>{r.dominant_format}</span>
        ) : (
          <span className="text-content-tertiary">—</span>
        ),
    },
    {
      key: "engagement",
      header: "Envolvimento",
      align: "right",
      render: (r) => <span className="font-mono">{formatPercent(r.engagement_rate)}</span>,
    },
    {
      key: "created_at",
      header: "Criado",
      render: (r) => formatDate(r.created_at),
    },
    {
      key: "updated_at",
      header: "Atualizado",
      render: (r) => formatDate(r.updated_at),
    },
    {
      key: "cache",
      header: "Cache até",
      render: (r) =>
        r.cache_expires_at ? (
          <span className="font-mono text-xs">{formatDate(r.cache_expires_at)}</span>
        ) : (
          <span className="text-content-tertiary">—</span>
        ),
    },
    {
      key: "open",
      header: "Ação",
      render: (r) => (
        <Link
          to="/admin/report-preview/$username"
          params={{ username: r.instagram_username }}
          className="inline-flex items-center gap-1 font-mono text-xs text-accent-primary hover:underline"
        >
          Ver relatório
          <ExternalLink className="size-3" />
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="font-display text-base text-content-primary">
            Relatórios disponíveis
          </h3>
          <p className="text-sm text-content-secondary">
            Por sustentabilidade, os relatórios ficam disponíveis durante 5 dias
            após a geração. Após esse período, devem ser removidos manualmente.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refresh()}
            disabled={state.kind === "loading"}
          >
            <RefreshCw
              className={`mr-2 size-3.5 ${state.kind === "loading" ? "animate-spin" : ""}`}
            />
            Atualizar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirming(true)}
            disabled={cleaning || state.kind === "loading"}
          >
            <Trash2 className="mr-2 size-3.5" />
            Limpar relatórios expirados
            {expiredCount > 0 ? (
              <span className="ml-1 font-mono text-[0.6875rem] text-content-tertiary">
                ({expiredCount})
              </span>
            ) : null}
          </Button>
        </div>
      </div>

      {state.kind === "error" ? (
        <div className="rounded-lg border border-signal-danger/30 bg-signal-danger/10 p-3 text-xs text-signal-danger">
          {state.message}
        </div>
      ) : null}

      {state.kind === "ready" ? (
        <>
          <div className="flex flex-wrap items-center gap-3 text-xs text-content-tertiary">
            <span>
              <span className="font-mono text-content-primary">
                {state.data.total}
              </span>{" "}
              relatório{state.data.total === 1 ? "" : "s"} dentro da janela de{" "}
              {state.data.retention_days} dias
            </span>
            <span>· atualizado a {formatDate(state.data.generated_at)}</span>
          </div>
          <DataTable
            columns={columns}
            rows={state.data.rows}
            rowKey={(r) => r.id}
            empty={
              <EmptyState
                icon={<FileText className="size-4" />}
                tone="ok"
                title="Sem relatórios nos últimos 5 dias."
                description="Quando uma análise gera um snapshot, aparece aqui com a janela de retenção e um link para a pré-visualização."
              />
            }
          />
        </>
      ) : state.kind === "loading" || state.kind === "idle" ? (
        <PanelSkeleton />
      ) : null}

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover relatórios expirados?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove apenas snapshots com mais de 5 dias da tabela
              de relatórios. Eventos de análise, registos do provedor e métricas
              do cockpit não são afetados. A ação é irreversível.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cleaning}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void runCleanup();
              }}
              disabled={cleaning}
            >
              {cleaning ? "A remover…" : "Remover expirados"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PanelSkeleton() {
  return (
    <div className="h-64 animate-pulse rounded-lg border border-border-subtle bg-surface-elevated" />
  );
}
