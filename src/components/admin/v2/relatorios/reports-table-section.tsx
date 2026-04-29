/**
 * Secção 4 — Tabela de relatórios.
 *
 * Header com filtros pill (Todos / Entregues / Em curso / Falhados) +
 * tabela 8 colunas + rodapé com paginação mock.
 *
 * Estado das linhas com badges semânticos. Acções por ícone com tooltip
 * Radix.
 */

import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  RefreshCw,
  RotateCw,
} from "lucide-react";

import { DemoOnlySection } from "../demo-only-section";
import { AdminCard } from "../admin-card";
import { AdminBadge } from "../admin-badge";
import { AdminActionButton } from "../admin-action-button";
import { FilterPills, type FilterOption } from "../filter-pills";
import { ReportDrawer } from "../report-drawer";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  MOCK_REPORTS_COUNTS,
  MOCK_REPORTS_LIST,
  type MockReport,
  type ReportOrigin,
  type ReportStatus,
} from "@/lib/admin/mock-data";

type ReportFilter = "all" | "delivered" | "in_progress" | "failed";

function matchesFilter(filter: ReportFilter, status: ReportStatus): boolean {
  if (filter === "all") return true;
  if (filter === "delivered") return status === "delivered";
  if (filter === "in_progress") return status === "processing" || status === "queued";
  return status === "failed";
}

const ORIGIN_LABEL: Record<ReportOrigin, string> = {
  subscription: "subscrição",
  one_off: "avulso",
};

export function ReportsTableSection() {
  const [filter, setFilter] = useState<ReportFilter>("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  function openReport(id: string) {
    setSelectedReportId(id);
    setDrawerOpen(true);
  }

  const counts = MOCK_REPORTS_COUNTS;

  const rows = useMemo(
    () => MOCK_REPORTS_LIST.filter((r) => matchesFilter(filter, r.status)),
    [filter],
  );

  const filterOptions: ReadonlyArray<FilterOption<ReportFilter>> = [
    { value: "all", label: "Todos", count: counts.all },
    { value: "delivered", label: "Entregues", count: counts.delivered },
    { value: "in_progress", label: "Em curso", count: counts.inProgress },
    { value: "failed", label: "Falhados", count: counts.failed },
  ];

  return (
    <DemoOnlySection
      title="Relatórios"
      subtitle="histórico, estado e custo por pedido"
      accent="revenue"
      info={"Histórico completo de relatórios pedidos com estado actual, duração e custo por execução. Filtros pill no topo direito."}
      pendingReason={"A tabela de relatórios lê `report_requests`. Está vazia até existirem pedidos reais — usa Modo demonstração para ver as colunas e ações disponíveis."}
    >
      <section>
      <div className="mb-3.5 flex flex-wrap items-end justify-between gap-3">
        <div className="-mb-3.5">
          {/*
           * `AdminSectionHeader` traz `mb-3.5` interno; compensamos para
           * evitar dupla margem quando o header está num wrapper flex.
           */}
        </div>
        <FilterPills
          options={filterOptions}
          value={filter}
          onChange={setFilter}
          ariaLabel="Filtros de relatório"
        />
      </div>

      <AdminCard className="!p-0">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-[12px]">
            <thead>
              <tr className="text-admin-text-tertiary">
                <Th>Pedido</Th>
                <Th>Perfil</Th>
                <Th>Origem</Th>
                <Th>Estado</Th>
                <Th>Início</Th>
                <Th>Duração</Th>
                <Th align="right">Custo</Th>
                <Th align="right">Acções</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <ReportRow key={r.id} report={r} onView={() => openReport(r.id)} />
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-8 text-center text-[12px] text-admin-text-tertiary"
                  >
                    Sem relatórios para este filtro.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-admin-border px-6 py-3.5">
          <p className="m-0 text-[11px] text-admin-text-tertiary">
            A mostrar {rows.length} de {counts.all} · ordenado por mais recente
          </p>
          <div className="flex items-center gap-1.5">
            <AdminActionButton size="sm" aria-label="Página anterior">
              <ChevronLeft size={14} strokeWidth={1.75} />
            </AdminActionButton>
            <AdminActionButton size="sm" aria-label="Página seguinte">
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
    </DemoOnlySection>
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

function ReportRow({ report, onView }: { report: MockReport; onView: () => void }) {
  return (
    <tr className="border-t border-admin-border transition-colors hover:bg-[var(--color-admin-surface-muted)]">
      <td className="px-6 py-3.5 align-top">
        <p className="m-0 font-mono text-[12px] text-admin-text-primary">
          #{report.id}
        </p>
        <p className="mt-0.5 text-[12px] text-admin-text-secondary">
          {report.customer}
        </p>
      </td>
      <td className="px-6 py-3.5 align-top">
        <span className="inline-flex items-center gap-1 text-[13px] text-admin-text-primary">
          {report.profile}
          <ArrowUpRight
            size={12}
            strokeWidth={1.75}
            className="text-admin-text-tertiary"
          />
        </span>
      </td>
      <td className="px-6 py-3.5 align-top">
        <AdminBadge variant={report.origin === "subscription" ? "revenue" : "expense"}>
          {ORIGIN_LABEL[report.origin]}
        </AdminBadge>
      </td>
      <td className="px-6 py-3.5 align-top">
        <StatusBadge status={report.status} />
      </td>
      <td className="px-6 py-3.5 align-top font-mono text-[12px] text-admin-text-secondary">
        {report.startedAt}
      </td>
      <td className="px-6 py-3.5 align-top font-mono text-[12px] text-admin-text-secondary">
        {report.duration ?? "—"}
      </td>
      <td className="px-6 py-3.5 text-right align-top font-mono text-[12px] text-admin-text-primary">
        {report.cost ?? "—"}
      </td>
      <td className="px-6 py-3.5 align-top">
        <ActionsCell status={report.status} onView={onView} />
      </td>
    </tr>
  );
}

function StatusBadge({ status }: { status: ReportStatus }) {
  if (status === "delivered") {
    return <AdminBadge variant="revenue">entregue</AdminBadge>;
  }
  if (status === "processing") {
    return (
      <AdminBadge variant="signal" className="gap-1">
        <Loader2 size={10} strokeWidth={2.25} className="animate-spin" />
        a processar
      </AdminBadge>
    );
  }
  if (status === "queued") {
    return <AdminBadge variant="info">em fila</AdminBadge>;
  }
  return <AdminBadge variant="danger">falhou</AdminBadge>;
}

function ActionsCell({ status, onView }: { status: ReportStatus; onView: () => void }) {
  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex items-center justify-end gap-2 text-admin-text-tertiary">
        {status === "failed" ? (
          <ActionIcon
            label="Investigar falha"
            icon={<AlertCircle size={16} strokeWidth={1.75} />}
            tone="danger"
            onClick={onView}
          />
        ) : null}
        {status === "delivered" || status === "failed" ? (
          <>
            <ActionIcon
              label="Re-gerar PDF"
              icon={<RefreshCw size={16} strokeWidth={1.75} />}
              onClick={onView}
            />
            {status === "delivered" ? (
              <ActionIcon
                label="Re-enviar email"
                icon={<RotateCw size={16} strokeWidth={1.75} />}
                onClick={onView}
              />
            ) : null}
          </>
        ) : null}
        <ActionIcon
          label="Ver detalhe"
          icon={<Eye size={16} strokeWidth={1.75} />}
          onClick={onView}
        />
      </div>
    </TooltipProvider>
  );
}

function ActionIcon({
  label,
  icon,
  tone,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  tone?: "danger";
  onClick?: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={onClick}
          className={`inline-flex h-6 w-6 items-center justify-center rounded-md transition-colors hover:bg-[var(--color-admin-surface-muted)] hover:text-admin-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-revenue-500 ${
            tone === "danger" ? "text-admin-danger-500" : ""
          }`}
        >
          {icon}
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="bg-admin-neutral-900 text-[11px] text-white"
      >
        {label}
      </TooltipContent>
    </Tooltip>
  );
}