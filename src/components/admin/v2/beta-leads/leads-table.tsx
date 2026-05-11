/**
 * LeadsTable — vista tabular dos mesmos leads do KanbanBoard.
 *
 * Reutiliza `EnrichedLead` (não faz fetch). Cada linha abre o `LeadDetailSheet`
 * via `onOpenDetail`, partilhando o mesmo sheet com a vista Pipeline.
 */

import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Inbox, Search } from "lucide-react";
import {
  KANBAN_COLUMNS,
  type EnrichedLead,
} from "@/lib/admin/kanban-columns";
import { interpretFeedback } from "@/lib/admin/feedback-intent";
import {
  FILTER_CHIPS,
  matchesChip,
  matchesQuery,
  type FilterChipKey,
} from "@/lib/admin/lead-filter-chips";
import { LEAD_MAGNET_DISPLAY } from "@/lib/admin/lead-magnet-display";

interface LeadsTableProps {
  leads: EnrichedLead[];
  onOpenDetail: (lead: EnrichedLead) => void;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> =
  Object.fromEntries(
    KANBAN_COLUMNS.map((c) => [c.key, { label: c.label, color: c.color }]),
  );

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

function StatusPill({ status }: { status: string }) {
  const meta = STATUS_LABELS[status];
  if (!meta) {
    return (
      <span className="text-[12px] text-admin-text-tertiary">{status}</span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap"
      style={{
        backgroundColor: `${meta.color}1a`,
        color: meta.color,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: meta.color }}
      />
      {meta.label}
    </span>
  );
}

function FeedbackCell({ lead }: { lead: EnrichedLead }) {
  if (!lead.feedback) {
    return <span className="text-[12px] text-admin-text-tertiary">—</span>;
  }
  const intent = interpretFeedback(lead.feedback);
  const color =
    intent.accent === "revenue"
      ? "rgb(var(--admin-revenue-500))"
      : intent.accent === "expense"
        ? "rgb(var(--admin-expense-500))"
        : "rgb(var(--admin-neutral-600))";
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[12px] font-medium tabular-nums"
      style={{ color }}
    >
      {lead.feedback.usefulness_score}/5
      <span className="text-[11px] font-normal text-admin-text-tertiary">
        · {intent.label}
      </span>
    </span>
  );
}

function LeadMagnetCell({ lead }: { lead: EnrichedLead }) {
  const lm = lead.lead_magnet;
  if (!lm || lm.status === "none") {
    return <span className="text-[12px] text-admin-text-tertiary">—</span>;
  }
  const display = LEAD_MAGNET_DISPLAY[lm.status];
  const color =
    display.variant === "revenue"
      ? "rgb(var(--admin-revenue-500))"
      : display.variant === "info"
        ? "rgb(var(--admin-info-500))"
        : display.variant === "signal"
          ? "rgb(var(--admin-signal-500))"
          : "rgb(var(--admin-neutral-600))";
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap"
      style={{ backgroundColor: `${color}1a`, color }}
      title={display.hint}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {lm.status === "active"
        ? "Activo"
        : lm.status === "completed"
          ? "Completo"
          : "Saltado"}
    </span>
  );
}

export function LeadsTable({ leads, onOpenDetail }: LeadsTableProps) {
  const [query, setQuery] = useState("");
  const [chip, setChip] = useState<FilterChipKey>("todos");

  const filtered = useMemo(
    () =>
      [...leads]
        .filter((l) => matchesChip(l, chip) && matchesQuery(l, query))
        .sort(
          (a, b) =>
            new Date(b.last_interaction).getTime() -
            new Date(a.last_interaction).getTime(),
        ),
    [leads, chip, query],
  );

  const hasFilters = chip !== "todos" || query.trim() !== "";
  const isEmptyByFilter = filtered.length === 0 && leads.length > 0;
  const isEmpty = leads.length === 0;

  const clearFilters = () => {
    setChip("todos");
    setQuery("");
  };

  const counterLabel = hasFilters
    ? `${filtered.length} de ${leads.length} contactos`
    : `${leads.length} contactos`;

  return (
    <div className="border border-[var(--color-admin-border)] rounded-xl bg-white overflow-hidden">
      {/* Toolbar: chips + search + counter */}
      <div className="flex items-center justify-between gap-3 flex-wrap px-3 py-2.5 border-b border-[var(--color-admin-border)]">
        <div className="flex items-center gap-2 flex-wrap">
          {(["estado", "atencao"] as const).map((group) => (
            <div
              key={group}
              className="flex flex-wrap gap-1 p-1 bg-white border border-[var(--color-admin-border)] rounded-lg"
              role="tablist"
              aria-label={group === "estado" ? "Filtrar por estado" : "Filtros de atenção"}
            >
              {FILTER_CHIPS.filter((c) => c.group === group).map((c) => {
                const isActive = c.key === chip;
                return (
                  <button
                    key={c.key}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setChip(c.key)}
                    className="px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors"
                    style={
                      isActive
                        ? {
                            backgroundColor: "var(--admin-board-chip-active-bg)",
                            color: "var(--admin-board-chip-active-text)",
                          }
                        : { color: "var(--color-admin-text-secondary)" }
                    }
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 ml-auto">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-admin-text-tertiary pointer-events-none"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pesquisar nome, email, @handle…"
              aria-label="Pesquisar contactos"
              className="pl-8 pr-3 h-9 text-[13px] bg-white border border-[var(--color-admin-border)] rounded-lg w-full sm:w-[280px] outline-none focus:border-[var(--color-admin-info-500)] focus:ring-1 focus:ring-[var(--color-admin-info-500)]/30"
            />
          </div>
          <span className="text-[12px] text-admin-text-tertiary tabular-nums whitespace-nowrap">
            {counterLabel}
          </span>
        </div>
      </div>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-16 text-admin-text-tertiary">
          <Inbox size={24} className="mb-2 opacity-60" />
          <span className="text-[13px]">Sem contactos para mostrar.</span>
        </div>
      ) : isEmptyByFilter ? (
        <div className="flex flex-col items-center justify-center py-16 text-admin-text-tertiary gap-3">
          <Inbox size={24} className="opacity-60" />
          <span className="text-[13px]">
            Nenhum contacto corresponde aos filtros.
          </span>
          <Button size="sm" variant="ghost" onClick={clearFilters}>
            Limpar filtros
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto">
        <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-[11px] uppercase tracking-wider text-admin-text-tertiary">
              Nome
            </TableHead>
            <TableHead className="text-[11px] uppercase tracking-wider text-admin-text-tertiary">
              Email
            </TableHead>
            <TableHead className="text-[11px] uppercase tracking-wider text-admin-text-tertiary">
              Instagram
            </TableHead>
            <TableHead className="text-[11px] uppercase tracking-wider text-admin-text-tertiary">
              Estado
            </TableHead>
            <TableHead className="text-[11px] uppercase tracking-wider text-admin-text-tertiary">
              Último relatório
            </TableHead>
            <TableHead className="text-[11px] uppercase tracking-wider text-admin-text-tertiary">
              Último email
            </TableHead>
            <TableHead className="text-[11px] uppercase tracking-wider text-admin-text-tertiary">
              Feedback
            </TableHead>
            <TableHead className="text-[11px] uppercase tracking-wider text-admin-text-tertiary">
              Lead-magnet
            </TableHead>
            <TableHead className="text-[11px] uppercase tracking-wider text-admin-text-tertiary">
              Criado em
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((lead) => (
            <TableRow
              key={lead.id}
              className="cursor-pointer hover:bg-[var(--admin-board-column-bg)]"
              onClick={() => onOpenDetail(lead)}
              aria-label={`Abrir ficha de ${lead.name?.trim() || lead.email}`}
            >
              <TableCell className="font-medium text-admin-text-primary text-[13px]">
                {lead.name?.trim() || "Sem nome"}
              </TableCell>
              <TableCell className="text-[12px] text-admin-text-secondary">
                {lead.email}
              </TableCell>
              <TableCell className="text-[12px] text-admin-text-secondary">
                {lead.handle ? `@${lead.handle}` : "—"}
              </TableCell>
              <TableCell>
                <StatusPill status={lead.commercial_status} />
              </TableCell>
              <TableCell className="text-[12px] text-admin-text-secondary tabular-nums">
                {lead.report_request_id ? formatDate(lead.last_interaction) : "—"}
              </TableCell>
              <TableCell className="text-[12px] text-admin-text-secondary tabular-nums">
                {formatDate(lead.contacted_at)}
              </TableCell>
              <TableCell>
                <FeedbackCell lead={lead} />
              </TableCell>
              <TableCell>
                <LeadMagnetCell lead={lead} />
              </TableCell>
              <TableCell className="text-[12px] text-admin-text-secondary tabular-nums">
                {formatDate(lead.created_at)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        </Table>
        </div>
      )}
    </div>
  );
}
