/**
 * Secção 5 — Sinais de intenção.
 * Duas colunas: pesquisas repetidas + últimos relatórios.
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { AdminCard } from "../admin-card";
import { AdminBadge } from "../admin-badge";
import { ReportDrawer } from "../report-drawer";
import { AdminSectionHeader } from "../admin-section-header";
import { adminFetch } from "@/lib/admin/fetch";

interface RepeatedRow {
  handle: string;
  count: number;
  last_at: string;
  lead: { email: string | null; name: string | null } | null;
}
interface RecentReportRow {
  id: string;
  instagram_username: string;
  request_status: string;
  pdf_status: string;
  delivery_status: string;
  is_free_request: boolean;
  created_at: string;
  lead: { email: string | null; name: string | null } | null;
}

function fmtAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function deriveStatus(r: RecentReportRow): "delivered" | "processing" | "queued" | "failed" {
  if (r.delivery_status === "sent") return "delivered";
  if (r.request_status === "failed" || r.pdf_status === "failed" || r.delivery_status === "failed") return "failed";
  if (r.request_status === "processing" || r.pdf_status === "generating") return "processing";
  return "queued";
}

export function IntentSection() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  function openReport(id: string) {
    setSelectedReportId(id);
    setDrawerOpen(true);
  }

  const repeatedQ = useQuery<{ success: boolean; rows: RepeatedRow[] }>({
    queryKey: ["admin", "repeated-searches"],
    queryFn: async () => {
      const res = await adminFetch("/api/admin/repeated-searches?days=30&limit=6");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    staleTime: 60_000,
  });

  const recentQ = useQuery<{ success: boolean; rows: RecentReportRow[] }>({
    queryKey: ["admin", "recent-reports", 4],
    queryFn: async () => {
      const res = await adminFetch("/api/admin/recent-reports?limit=4");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    staleTime: 30_000,
  });

  const repeated = repeatedQ.data?.rows ?? [];
  const recent = recentQ.data?.rows ?? [];

  return (
    <section className="flex flex-col gap-4">
      <AdminSectionHeader
        title="Sinais de intenção"
        subtitle="oportunidades quentes"
        accent="signal"
        info="Sinais comportamentais que indicam intenção de compra elevada. Pesquisas repetidas são leads quentes."
      />
      <div className="grid gap-3.5 grid-cols-1 lg:grid-cols-2">
        {/* Pesquisas repetidas */}
        <AdminCard>
          <CardHeader
            title="Pesquisas repetidas"
            eyebrowRight="leads quentes"
            subtitle="Mesmo perfil pesquisado várias vezes — sinal forte de intenção."
          />
          {repeatedQ.isLoading ? (
            <p className="mt-4 text-[12px] text-admin-text-tertiary">A carregar…</p>
          ) : repeated.length === 0 ? (
            <p className="mt-4 text-[12px] text-admin-text-tertiary">
              Sem perfis com 2+ pesquisas nos últimos 30 dias.
            </p>
          ) : (
            <ul className="m-0 mt-4 flex list-none flex-col gap-1.5 p-0">
              {repeated.map((row) => (
                <Row key={row.handle}>
                  <div>
                    <p className="m-0 text-[13px] font-medium text-admin-text-primary">
                      @{row.handle}
                    </p>
                    <p className="mt-px text-[12px] text-admin-text-secondary">
                      {row.lead?.name ? (
                        <>por <span className="text-admin-text-primary">{row.lead.name}</span></>
                      ) : (
                        <span className="text-admin-text-tertiary">sem lead associado</span>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="m-0 text-sm font-medium text-admin-signal-500">{row.count}×</p>
                    <p className="mt-px text-[12px] text-admin-text-tertiary">{fmtAgo(row.last_at)}</p>
                  </div>
                </Row>
              ))}
            </ul>
          )}
        </AdminCard>

        {/* Últimos relatórios */}
        <AdminCard>
          <CardHeader
            title="Últimos relatórios"
            eyebrowRight="clica para detalhe"
            subtitle="Pedidos pagos e seu estado de entrega."
          />
          {recentQ.isLoading ? (
            <p className="mt-4 text-[12px] text-admin-text-tertiary">A carregar…</p>
          ) : recent.length === 0 ? (
            <p className="mt-4 text-[12px] text-admin-text-tertiary">
              Sem pedidos de relatório ainda.
            </p>
          ) : (
            <ul className="m-0 mt-4 flex list-none flex-col gap-1.5 p-0">
              {recent.map((row) => {
                const status = deriveStatus(row);
                const statusLabel =
                  status === "delivered" ? "entregue" :
                  status === "failed" ? "falhou" :
                  status === "queued" ? "em fila" : "a processar";
                const statusVariant =
                  status === "delivered" ? "revenue" :
                  status === "failed" ? "danger" : "expense";
                return (
                  <li key={row.id} className="list-none">
                    <button
                      type="button"
                      onClick={() => openReport(row.id)}
                      aria-label={`Ver detalhe do report ${row.id}`}
                      className="flex w-full items-center justify-between gap-3 rounded-lg bg-admin-neutral-50 px-3 py-2.5 text-left transition-colors hover:bg-[var(--color-admin-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-leads-500"
                    >
                      <div className="min-w-0">
                        <p className="m-0 truncate text-[13px] font-medium text-admin-text-primary">
                          @{row.instagram_username}
                        </p>
                        <p className="mt-px truncate text-[12px] text-admin-text-secondary">
                          <span className="text-admin-text-primary">
                            {row.lead?.name ?? row.lead?.email ?? "—"}
                          </span>{" "}
                          · {row.is_free_request ? "grátis" : "pago"}
                        </p>
                      </div>
                      <AdminBadge variant={statusVariant}>{statusLabel}</AdminBadge>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </AdminCard>
      </div>

      <ReportDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        reportId={selectedReportId}
      />
    </section>
  );
}

function CardHeader({
  title,
  subtitle,
  eyebrowRight,
}: {
  title: string;
  subtitle: string;
  eyebrowRight: string;
}) {
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between">
        <p className="m-0 text-sm font-medium text-admin-text-primary">
          {title}
        </p>
        <span className="text-[12px] text-admin-text-tertiary">
          {eyebrowRight}
        </span>
      </div>
      <p className="mt-1 text-[12px] text-admin-text-tertiary">{subtitle}</p>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg bg-admin-neutral-50 px-3 py-2.5">
      {children}
    </li>
  );
}