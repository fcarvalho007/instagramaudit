/**
 * /admin/beta-requests — queue for managing incoming beta analysis requests.
 */

import { useState, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminFetch } from "@/lib/admin/fetch";
import { AdminPageHeader } from "@/components/admin/v2/admin-page-header";
import { AdminActionButton } from "@/components/admin/v2/admin-action-button";
import { BetaRequestFilters } from "@/components/admin/v2/beta-requests/beta-request-filters";
import { BetaRequestsTable } from "@/components/admin/v2/beta-requests/beta-requests-table";
import { AdminSearchInput } from "@/components/admin/v2/admin-search-input";
import { ConfirmDialog } from "@/components/admin/v2/confirm-dialog";
import type { BetaRequestRow } from "@/components/admin/v2/beta-requests/beta-request-actions";

export const Route = createFileRoute("/admin/beta-requests")({
  component: BetaRequestsPage,
});

interface ApiResponse {
  success: boolean;
  rows: BetaRequestRow[];
  total: number;
  page: number;
  pageSize: number;
}

function BetaRequestsPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [generateTarget, setGenerateTarget] = useState<BetaRequestRow | null>(null);
  const [generating, setGenerating] = useState(false);

  const queryKey = ["admin", "beta-requests", status, search, page];

  const { data, isLoading, error } = useQuery<ApiResponse>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("source", "beta_form");
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (status) params.set("status", status);
      if (search) params.set("q", search);

      const res = await adminFetch(`/api/admin/report-requests?${params}`);
      if (!res.ok) throw new Error("Falha ao carregar pedidos");
      return res.json();
    },
    refetchInterval: 30_000,
  });

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  const handleStatusChange = useCallback(
    async (id: string, newStatus: string, markContacted?: boolean) => {
      try {
        const body: Record<string, unknown> = { request_status: newStatus };
        if (markContacted) body.mark_contacted = true;

        const res = await adminFetch(`/api/admin/report-requests/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) throw new Error("Falha");
        toast.success("Pedido atualizado");
        queryClient.invalidateQueries({ queryKey: ["admin", "beta-requests"] });
      } catch {
        toast.error("Erro ao atualizar pedido");
      }
    },
    [queryClient],
  );

  const handleGenerateReport = useCallback(
    async () => {
      if (!generateTarget) return;
      setGenerating(true);
      try {
        const res = await adminFetch("/api/admin/generate-beta-report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ report_request_id: generateTarget.id }),
        });

        const data = await res.json() as { success: boolean; error?: string; preflight_blocked?: string };

        if (!res.ok || !data.success) {
          const msg = data.error ?? "Erro desconhecido";
          toast.error(msg);
          return;
        }

        toast.success(`Relatório gerado para @${generateTarget.instagram_username}`);
        queryClient.invalidateQueries({ queryKey: ["admin", "beta-requests"] });
      } catch {
        toast.error("Erro de rede ao gerar relatório");
      } finally {
        setGenerating(false);
        setGenerateTarget(null);
      }
    },
    [generateTarget, queryClient],
  );

  const pendingCount = rows.filter((r) => r.request_status === "pending_review").length;

  return (
    <>
      <AdminPageHeader
        title="Beta Requests"
        subtitle={`${total} pedidos · ${pendingCount} pendentes`}
        actions={
          <AdminSearchInput
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Pesquisar handle ou email..."
          />
        }
      />

      <div className="mb-4">
        <BetaRequestFilters
          status={status}
          onStatusChange={(s) => {
            setStatus(s);
            setPage(1);
          }}
        />
      </div>

      {isLoading && (
        <div className="py-12 text-center text-sm" style={{ color: "#888780" }}>
          A carregar pedidos...
        </div>
      )}

      {error && (
        <div className="py-8 text-center text-sm" style={{ color: "#A32D2D" }}>
          Erro ao carregar pedidos. Verifica a sessão.
        </div>
      )}

      {!isLoading && !error && (
        <>
          <BetaRequestsTable
            rows={rows}
            onStatusChange={handleStatusChange}
            onGenerateReport={(row) => setGenerateTarget(row)}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-[12px]" style={{ color: "#888780" }}>
              <span>
                Página {page} de {totalPages} ({total} resultados)
              </span>
              <div className="flex gap-2">
                <AdminActionButton
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  ← Anterior
                </AdminActionButton>
                <AdminActionButton
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Seguinte →
                </AdminActionButton>
              </div>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={!!generateTarget}
        onOpenChange={(open) => { if (!open) setGenerateTarget(null); }}
        title="Gerar relatório"
        description={
          generateTarget
            ? `Esta ação vai gerar uma análise Fresh para @${generateTarget.instagram_username}. Pode gerar custos reais (Apify). Continuar?`
            : undefined
        }
        confirmLabel="Gerar agora"
        variant="danger"
        loading={generating}
        onConfirm={handleGenerateReport}
      />
    </>
  );
}