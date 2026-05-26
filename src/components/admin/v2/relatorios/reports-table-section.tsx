/**
 * Secção 4 — Tabela de relatórios (dados reais).
 *
 * Lê `/api/admin/report-requests` (já existente, paginação server-side).
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { AdminPeriod } from "@/components/admin/v2/period-select";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";

import { AdminCard } from "../admin-card";
import { AdminBadge } from "../admin-badge";
import { AdminActionButton } from "../admin-action-button";
import { AdminSectionHeader } from "../admin-section-header";
import { FilterPills, type FilterOption } from "../filter-pills";
import { ReportDrawer } from "../report-drawer";
import { adminFetch } from "@/lib/admin/fetch";

type ReportFilter = "all" | "delivered" | "in_progress" | "failed";

interface ReportRow {
  id: string;
  kind: "snapshot" | "request";
  instagram_username: string;
  request_status: string;
  pdf_status: string;
  delivery_status: string;
  request_source: string;
  is_free_request: boolean;
  created_at: string;
  email_sent_at: string | null;
  lead: { id: string; name: string | null; email: string | null } | null;
}

interface ListApi {
  success: boolean;
  rows: ReportRow[];
  total: number;
  page: number;
  pageSize: number;
}

function deriveStatus(r: ReportRow): "snapshot" | "delivered" | "processing" | "failed" {
  if (r.kind === "snapshot") return "snapshot";
  if (r.delivery_status === "sent") return "delivered";
  if (
    r.request_status === "failed" ||
    r.pdf_status === "failed" ||
    r.delivery_status === "failed"
  )
    return "failed";
  return "processing";
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const SOURCE_LABEL: Record<string, string> = {
  public_dashboard: "Dashboard",
  public_analysis: "Análise pública",
  lead_magnet: "Lead magnet",
  public_report_gate: "Report gate",
};

function sourceLabel(s: string): string {
  return SOURCE_LABEL[s] ?? s;
}

export function ReportsTableSection({ period }: { period: AdminPeriod }) {
  const [filter, setFilter] = useState<ReportFilter>("all");
  const [page, setPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  const filterParams: Record<ReportFilter, string> = {
    all: "",
    delivered: "&email=sent",
    in_progress: "",
    failed: "&status=failed",
  };

  const { data, isLoading } = useQuery<ListApi>({
    queryKey: ["admin", "report-requests", "list", filter, page, period],
    queryFn: async () => {
      const res = await adminFetch(
        `/api/admin/report-requests?page=${page}&pageSize=25&period=${period}${filterParams[filter]}`,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    staleTime: 15_000,
  });

  let rows = data?.rows ?? [];
  // Client-side narrowing for "in_progress" (no single status maps to it)
  if (filter === "in_progress") {
    rows = rows.filter((r) => r.kind === "request" && deriveStatus(r) === "processing");
  }

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / (data?.pageSize ?? 25)));

  const filterOptions: ReadonlyArray<FilterOption<ReportFilter>> = [
    { value: "all", label: "Todos" },
    { value: "delivered", label: "Entregues" },
    { value: "in_progress", label: "Em curso" },
    { value: "failed", label: "Falhados" },
  ];

  function openReport(id: string) {
    setSelectedReportId(id);
    setDrawerOpen(true);
  }

  return (
    <section>
      <AdminSectionHeader
        title="Relatórios"
        subtitle="histórico de pedidos"
        accent="revenue"
        info="Pedidos reais de relatórios (`report_requests`) com lead associado."
      />
      <div className="mb-3.5 flex flex-wrap items-end justify-end gap-3">
        <FilterPills
          options={filterOptions}
          value={filter}
          onChange={(v) => {
            setFilter(v);
            setPage(1);
          }}
          ariaLabel="Filtros de relatório"
        />
      </div>

      <AdminCard className="!p-0">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-[12px]">
            <thead>
              <tr className="text-admin-text-tertiary">
                <Th>Registo</Th>
                <Th>Perfil</Th>
                <Th>Origem</Th>
                <Th>Estado</Th>
                <Th>Início</Th>
                <Th align="right">Acções</Th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-[12px] text-admin-text-tertiary">
                    A carregar…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-[12px] text-admin-text-tertiary">
                    Sem relatórios para este filtro.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-t border-admin-border transition-colors hover:bg-[var(--color-admin-surface-muted)]"
                  >
                    <td className="px-6 py-3.5 align-top">
                      <p className="m-0 text-[13px] text-admin-text-primary">
                        {r.lead?.name ?? "—"}
                      </p>
                      <p className="mt-0.5 text-[12px] text-admin-text-secondary">
                        {r.lead?.email ?? "—"}
                      </p>
                    </td>
                    <td className="px-6 py-3.5 align-top text-[13px] text-admin-text-primary">
                      @{r.instagram_username}
                    </td>
                    <td className="px-6 py-3.5 align-top">
                      {r.kind === "snapshot" ? (
                        <AdminBadge variant="info">análise pública</AdminBadge>
                      ) : (
                        <div className="flex flex-col items-start gap-1">
                          <AdminBadge variant="neutral">{sourceLabel(r.request_source)}</AdminBadge>
                          <AdminBadge variant={r.is_free_request ? "info" : "revenue"}>
                            {r.is_free_request ? "grátis" : "pago"}
                          </AdminBadge>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-3.5 align-top">
                      <StatusBadge status={deriveStatus(r)} />
                    </td>
                    <td className="px-6 py-3.5 align-top admin-code text-admin-text-secondary">
                      {formatDate(r.created_at)}
                    </td>
                    <td className="px-6 py-3.5 align-top admin-code text-admin-text-secondary">
                      {formatDuration(r)}
                    </td>
                    <td className="px-6 py-3.5 align-top text-right">
                      {r.kind === "request" ? (
                        <button
                          type="button"
                          aria-label="Ver detalhe"
                          onClick={() => openReport(r.id)}
                          className="inline-flex h-6 w-6 items-center justify-center rounded-md text-admin-text-tertiary transition-colors hover:bg-[var(--color-admin-surface-muted)] hover:text-admin-text-primary"
                        >
                          <Eye size={16} strokeWidth={1.75} />
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-admin-border px-6 py-3.5">
          <p className="m-0 text-[12px] text-admin-text-tertiary">
            A mostrar {rows.length} · página {page}/{totalPages} · {total} no total
          </p>
          <div className="flex items-center gap-1.5">
            <AdminActionButton
              size="sm"
              aria-label="Página anterior"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft size={14} strokeWidth={1.75} />
            </AdminActionButton>
            <AdminActionButton
              size="sm"
              aria-label="Página seguinte"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              <ChevronRight size={14} strokeWidth={1.75} />
            </AdminActionButton>
          </div>
        </div>
      </AdminCard>

      <ReportDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        reportId={selectedReportId}
      />
    </section>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`admin-eyebrow px-6 py-3 font-normal ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function StatusBadge({ status }: { status: "snapshot" | "delivered" | "processing" | "failed" }) {
  if (status === "snapshot") return <AdminBadge variant="neutral">análise</AdminBadge>;
  if (status === "delivered") return <AdminBadge variant="revenue">entregue</AdminBadge>;
  if (status === "failed") return <AdminBadge variant="danger">falhou</AdminBadge>;
  return <AdminBadge variant="signal">a processar</AdminBadge>;
}