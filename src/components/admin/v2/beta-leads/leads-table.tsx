/**
 * LeadsTable — vista tabular dos mesmos leads do KanbanBoard.
 *
 * Reutiliza `EnrichedLead` (não faz fetch). Cada linha abre o `LeadDetailSheet`
 * via `onOpenDetail`, partilhando o mesmo sheet com a vista Pipeline.
 */

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Inbox, Loader2, Search, Trash2, X } from "lucide-react";
import { adminFetch } from "@/lib/admin/fetch";
import {
  KANBAN_COLUMNS,
  COMMERCIAL_STATUS_OPTIONS,
  deriveKanbanColumn,
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

type SortKey = "recent" | "oldest" | "name" | "status";
const HARD_CONFIRM_PHRASE = "APAGAR";

const STATUS_LABELS: Record<string, { label: string; color: string }> =
  Object.fromEntries(
    COMMERCIAL_STATUS_OPTIONS.map((c) => [c.key, { label: c.label, color: c.color }]),
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
  const [sort, setSort] = useState<SortKey>("recent");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const queryClient = useQueryClient();

  const filtered = useMemo(
    () =>
      [...leads]
        .filter((l) => matchesChip(l, chip) && matchesQuery(l, query))
        .sort((a, b) => {
          if (sort === "name") {
            return (a.name?.trim() || a.email).localeCompare(
              b.name?.trim() || b.email,
              "pt",
            );
          }
          if (sort === "status") {
            return a.commercial_status.localeCompare(b.commercial_status);
          }
          const ta = new Date(a.last_interaction).getTime();
          const tb = new Date(b.last_interaction).getTime();
          return sort === "oldest" ? ta - tb : tb - ta;
        }),
    [leads, chip, query, sort],
  );

  const hasFilters = chip !== "todos" || query.trim() !== "";
  const isEmptyByFilter = filtered.length === 0 && leads.length > 0;
  const isEmpty = leads.length === 0;
  const activeFiltersCount = (chip !== "todos" ? 1 : 0) + (query.trim() ? 1 : 0);

  const clearFilters = () => {
    setChip("todos");
    setQuery("");
  };

  const counterLabel = hasFilters
    ? `${filtered.length} de ${leads.length} contactos`
    : `${leads.length} contactos`;

  // Mantém apenas selecções visíveis nos filtros actuais.
  const filteredIds = useMemo(() => new Set(filtered.map((l) => l.id)), [filtered]);
  useEffect(() => {
    setSelectedIds((prev) => {
      let changed = false;
      const next = new Set<string>();
      for (const id of prev) {
        if (filteredIds.has(id)) next.add(id);
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [filteredIds]);

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((l) => selectedIds.has(l.id));
  const someFilteredSelected =
    !allFilteredSelected && filtered.some((l) => selectedIds.has(l.id));

  const toggleAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        for (const l of filtered) next.delete(l.id);
      } else {
        for (const l of filtered) next.add(l.id);
      }
      return next;
    });
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const selectedLeads = useMemo(
    () => filtered.filter((l) => selectedIds.has(l.id)),
    [filtered, selectedIds],
  );

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await adminFetch("/api/admin/leads-bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        throw new Error(json?.error ?? `Falha ao apagar (HTTP ${res.status})`);
      }
      return json as { deleted: number };
    },
    onSuccess: (data) => {
      toast.success(
        data.deleted === 1
          ? "1 contacto apagado"
          : `${data.deleted} contactos apagados`,
      );
      clearSelection();
      setConfirmOpen(false);
      setConfirmText("");
      queryClient.invalidateQueries({ queryKey: ["admin", "beta-leads"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Falha ao apagar contactos");
    },
  });

  const confirmDisabled =
    confirmText.trim().toUpperCase() !== HARD_CONFIRM_PHRASE ||
    deleteMutation.isPending;

  const onOpenConfirmChange = (open: boolean) => {
    if (!open && deleteMutation.isPending) return;
    setConfirmOpen(open);
    if (!open) setConfirmText("");
  };

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
          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-medium rounded-md text-admin-text-secondary hover:bg-admin-surface-muted transition-colors"
              aria-label="Limpar filtros"
            >
              <X size={12} />
              Limpar ({activeFiltersCount})
            </button>
          )}
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
              placeholder="Pesquisar nome, email ou @handle…"
              aria-label="Pesquisar contactos"
              className="pl-8 pr-3 h-9 text-[13px] bg-white border border-[var(--color-admin-border)] rounded-lg w-full sm:w-[280px] outline-none focus:border-[var(--color-admin-info-500)] focus:ring-1 focus:ring-[var(--color-admin-info-500)]/30"
            />
          </div>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger
              className="h-9 w-[170px] text-[12px]"
              aria-label="Ordenar contactos"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Mais recentes</SelectItem>
              <SelectItem value="oldest">Mais antigos</SelectItem>
              <SelectItem value="name">Nome (A→Z)</SelectItem>
              <SelectItem value="status">Estado</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-[12px] text-admin-text-tertiary tabular-nums whitespace-nowrap">
            {counterLabel}
          </span>
        </div>
      </div>

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div
          className="flex items-center justify-between gap-3 px-3 py-2 border-b border-[var(--color-admin-border)] bg-[var(--admin-board-chip-active-bg)]/50"
          role="region"
          aria-label="Acções em massa"
        >
          <div className="text-[12px] font-medium text-admin-text-primary">
            {selectedIds.size === 1
              ? "1 contacto seleccionado"
              : `${selectedIds.size} contactos seleccionados`}
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={clearSelection}>
              Limpar selecção
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setConfirmOpen(true)}
              className="gap-1.5"
            >
              <Trash2 size={14} />
              Apagar ({selectedIds.size})
            </Button>
          </div>
        </div>
      )}

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
            <TableHead className="w-[40px] px-3">
              <Checkbox
                checked={
                  allFilteredSelected
                    ? true
                    : someFilteredSelected
                      ? "indeterminate"
                      : false
                }
                onCheckedChange={toggleAllFiltered}
                aria-label="Seleccionar contactos filtrados"
              />
            </TableHead>
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
          {filtered.map((lead) => {
            const isSelected = selectedIds.has(lead.id);
            return (
            <TableRow
              key={lead.id}
              data-state={isSelected ? "selected" : undefined}
              className="cursor-pointer hover:bg-[var(--admin-board-column-bg)] data-[state=selected]:bg-[var(--admin-board-chip-active-bg)]/40"
              onClick={() => onOpenDetail(lead)}
              aria-label={`Abrir ficha de ${lead.name?.trim() || lead.email}`}
            >
              <TableCell
                className="w-[40px] px-3"
                onClick={(e) => e.stopPropagation()}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleOne(lead.id)}
                  aria-label={`Seleccionar ${lead.name?.trim() || lead.email}`}
                />
              </TableCell>
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
            );
          })}
        </TableBody>
        </Table>
        </div>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={onOpenConfirmChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedIds.size === 1
                ? "Apagar 1 contacto permanentemente?"
                : `Apagar ${selectedIds.size} contactos permanentemente?`}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-[13px] text-admin-text-secondary">
                <ul className="rounded-md border border-[var(--color-admin-border)] bg-admin-surface-muted/40 p-2 text-[12px] max-h-[140px] overflow-auto">
                  {selectedLeads.slice(0, 5).map((l) => (
                    <li key={l.id} className="truncate">
                      <span className="font-medium text-admin-text-primary">
                        {l.name?.trim() || "Sem nome"}
                      </span>{" "}
                      · {l.email}
                    </li>
                  ))}
                  {selectedLeads.length > 5 && (
                    <li className="text-admin-text-tertiary pt-1">
                      + {selectedLeads.length - 5} mais
                    </li>
                  )}
                </ul>
                <div>
                  Esta acção é{" "}
                  <span className="font-semibold text-admin-text-primary">
                    permanente
                  </span>
                  . Vão ser removidos também: relatórios pedidos, snapshots,
                  feedback beta e eventos associados. Os perfis ligados ficam
                  sem referência ao contacto.
                </div>
                <div>
                  Escreve{" "}
                  <code className="px-1 py-0.5 rounded bg-admin-surface-muted text-admin-text-primary font-mono text-[12px]">
                    {HARD_CONFIRM_PHRASE}
                  </code>{" "}
                  para confirmar:
                </div>
                <input
                  type="text"
                  autoFocus
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" &&
                      !confirmDisabled &&
                      selectedLeads.length > 0
                    ) {
                      deleteMutation.mutate(selectedLeads.map((l) => l.id));
                    }
                  }}
                  placeholder={HARD_CONFIRM_PHRASE}
                  className="w-full h-9 px-3 text-[13px] bg-white border border-[var(--color-admin-border)] rounded-md outline-none focus:border-[var(--color-admin-expense-500)] focus:ring-1 focus:ring-[var(--color-admin-expense-500)]/30"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={confirmDisabled}
              onClick={(e) => {
                e.preventDefault();
                if (confirmDisabled || selectedLeads.length === 0) return;
                deleteMutation.mutate(selectedLeads.map((l) => l.id));
              }}
              className="bg-[rgb(var(--admin-expense-500))] text-white hover:bg-[rgb(var(--admin-expense-500))]/90"
            >
              {deleteMutation.isPending ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 size={14} className="animate-spin" />A apagar…
                </span>
              ) : (
                "Apagar definitivamente"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
