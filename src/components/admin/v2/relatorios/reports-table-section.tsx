/**
 * Secção 4 — Tabela de relatórios (dados reais).
 *
 * Lê `/api/admin/report-requests` (já existente, paginação server-side).
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { AdminPeriod } from "@/components/admin/v2/period-select";
import { ChevronLeft, ChevronRight, ExternalLink, Instagram } from "lucide-react";

import { AdminCard } from "../admin-card";
import { AdminBadge } from "../admin-badge";
import { AdminActionButton } from "../admin-action-button";
import { AdminSectionHeader } from "../admin-section-header";
import { FilterPills, type FilterOption } from "../filter-pills";
import { ReportDrawer } from "../report-drawer";
import { adminFetch } from "@/lib/admin/fetch";
import {
  dataSourceBadgeVariant,
  deriveWindow,
  windowBadgeVariant,
  windowLabel,
} from "@/lib/admin/analysis-window";

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
  analysis_window: string | null;
  cache_key: string | null;
  data_source: string | null;
  competitor_count: number;
  competitor_handles: string[];
  snapshot_short: string;
  estimated_cost_usd: number | null;
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
                <Th>Quem pediu</Th>
                <Th>Perfil analisado</Th>
                <Th>Janela</Th>
                <Th>Origem</Th>
                <Th>Concorrentes</Th>
                <Th>Snapshot</Th>
                <Th>Início</Th>
                <Th align="right">Acções</Th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-[12px] text-admin-text-tertiary">
                    A carregar…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-[12px] text-admin-text-tertiary">
                    Sem relatórios para este filtro.
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const win = deriveWindow(r.analysis_window, r.cache_key);
                  return (
                  <tr
                    key={r.id}
                    className="border-t border-admin-border transition-colors hover:bg-[var(--color-admin-surface-muted)]"
                  >
                    <td className="px-6 py-3.5 align-top">
                      {r.lead?.email ? (
                        <div className="flex flex-col items-start gap-0.5">
                          {r.lead.name ? (
                            <p className="m-0 text-[13px] text-admin-text-primary">
                              {r.lead.name}
                            </p>
                          ) : null}
                          <p className="m-0 text-[12px] text-admin-text-secondary">
                            {r.lead.email}
                          </p>
                        </div>
                      ) : (
                        <AdminBadge variant="neutral">anónimo</AdminBadge>
                      )}
                    </td>
                    <td className="px-6 py-3.5 align-top text-[13px] text-admin-text-primary">
                      <span className="inline-flex items-center gap-1.5">
                        <Instagram size={13} strokeWidth={1.75} className="text-admin-text-tertiary" />
                        @{r.instagram_username}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 align-top">
                      <AdminBadge variant={windowBadgeVariant(win)}>
                        {windowLabel(win)}
                      </AdminBadge>
                    </td>
                    <td className="px-6 py-3.5 align-top">
                      {r.data_source ? (
                        <AdminBadge variant={dataSourceBadgeVariant(r.data_source)}>
                          {r.data_source}
                        </AdminBadge>
                      ) : (
                        <span className="text-[12px] text-admin-text-tertiary">—</span>
                      )}
                    </td>
                    <td
                      className="px-6 py-3.5 align-top text-[12px] text-admin-text-secondary"
                      title={r.competitor_handles.map((h) => `@${h}`).join(", ")}
                    >
                      {r.competitor_count > 0 ? `${r.competitor_count}` : "—"}
                    </td>
                    <td className="px-6 py-3.5 align-top admin-code text-admin-text-secondary">
                      {r.snapshot_short || "—"}
                    </td>
                    <td className="px-6 py-3.5 align-top admin-code text-admin-text-secondary">
                      {formatDate(r.created_at)}
                    </td>
                    <td className="px-6 py-3.5 align-top text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <a
                          href={`/analyze/${r.instagram_username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Abrir análise pública do perfil"
                          className="inline-flex h-7 items-center gap-1 rounded-[6px] border border-admin-border bg-admin-surface px-2.5 text-[12px] text-admin-text-secondary transition-colors hover:border-admin-border-strong hover:text-admin-text-primary"
                        >
                          Ver perfil
                          <ExternalLink size={12} strokeWidth={1.75} />
                        </a>
                        <AdminActionButton
                          size="sm"
                          aria-label={
                            r.kind === "request"
                              ? "Ver relatório gerado"
                              : "Sem relatório gerado — análise pública sem unlock"
                          }
                          title={
                            r.kind === "request"
                              ? undefined
                              : "Sem relatório gerado — análise pública sem unlock"
                          }
                          disabled={r.kind !== "request"}
                          onClick={() => openReport(r.id)}
                          className={r.kind !== "request" ? "opacity-40 cursor-not-allowed" : ""}
                        >
                          Ver report
                        </AdminActionButton>
                      </div>
                    </td>
                  </tr>
                  );
                })
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