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

import { AdminSectionHeader } from "../admin-section-header";
import { AdminCard } from "../admin-card";
import { AdminBadge } from "../admin-badge";
import { AdminActionButton } from "../admin-action-button";
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

const FILTER_LABELS: Record<ReportFilter, string> = {
  all: "Todos",
  delivered: "Entregues",
  in_progress: "Em curso",
  failed: "Falhados",
};

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

  const counts = MOCK_REPORTS_COUNTS;

  const rows = useMemo(
    () => MOCK_REPORTS_LIST.filter((r) => matchesFilter(filter, r.status)),
    [filter],
  );

  const filterCounts: Record<ReportFilter, number> = {
    all: counts.all,
    delivered: counts.delivered,
    in_progress: counts.inProgress,
    failed: counts.failed,
  };

  return (
    <section>
      <div className="mb-3.5 flex flex-wrap items-end justify-between gap-3">
        <div className="-mb-3.5">
          {/*
           * `AdminSectionHeader` traz `mb-3.5` interno; compensamos para
           * evitar dupla margem quando o header está num wrapper flex.
           */}
          <AdminSectionHeader
            title="Relatórios"
            subtitle="histórico, estado e custo por pedido"
            accent="revenue"
            info="Histórico completo de relatórios pedidos com estado actual, duração e custo por execução. Filtros pill no topo direito."
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {(Object.keys(FILTER_LABELS) as ReportFilter[]).map((f) => (
            <FilterPill
              key={f}
              active={filter === f}
              onClick={() => setFilter(f)}
              label={FILTER_LABELS[f]}
              count={filterCounts[f]}
            />
          ))}
        </div>
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
                <ReportRow key={r.id} report={r} />
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
    </section>
  );
}

function FilterPill({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <AdminActionButton
      size="sm"
      variant={active ? "active" : "default"}
      onClick={onClick}
      aria-pressed={active}
    >
      {label}{" "}
      <span
        className={
          active
            ? "ml-1 text-admin-text-secondary"
            : "ml-1 text-admin-text-tertiary"
        }
      >
        · {count}
      </span>
    </AdminActionButton>
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

function ReportRow({ report }: { report: MockReport }) {
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
        <ActionsCell status={report.status} />
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

function ActionsCell({ status }: { status: ReportStatus }) {
  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex items-center justify-end gap-2 text-admin-text-tertiary">
        {status === "failed" ? (
          <ActionIcon
            label="Investigar falha"
            icon={<AlertCircle size={16} strokeWidth={1.75} />}
            tone="danger"
          />
        ) : null}
        {status === "delivered" || status === "failed" ? (
          <>
            <ActionIcon
              label="Re-gerar PDF"
              icon={<RefreshCw size={16} strokeWidth={1.75} />}
            />
            {status === "delivered" ? (
              <ActionIcon
                label="Re-enviar email"
                icon={<RotateCw size={16} strokeWidth={1.75} />}
              />
            ) : null}
          </>
        ) : null}
        <ActionIcon
          label="Ver detalhe"
          icon={<Eye size={16} strokeWidth={1.75} />}
        />
      </div>
    </TooltipProvider>
  );
}

function ActionIcon({
  label,
  icon,
  tone,
}: {
  label: string;
  icon: React.ReactNode;
  tone?: "danger";
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
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