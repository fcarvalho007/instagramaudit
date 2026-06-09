/**
 * LeadsTable — vista tabular dos mesmos leads do KanbanBoard.
 *
 * Fila de trabalho (não lista): ordenada por prioridade (crédito esgotado →
 * leads quentes → recentes), QA escondido por defeito, e uma acção sugerida
 * por linha. A definição de "quente" e a acção sugerida vivem em
 * `lead-classification.ts` — partilhadas com KPIs e follow-ups.
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
import { Archive, Inbox, Loader2, Search, Trash2, X } from "lucide-react";
import { adminFetch } from "@/lib/admin/fetch";
import {
  COMMERCIAL_STATUS_OPTIONS,
  type EnrichedLead,
} from "@/lib/admin/kanban-columns";
import {
  FILTER_CHIPS,
  matchesChip,
  matchesQuery,
  type FilterChipKey,
} from "@/lib/admin/lead-filter-chips";
import {
  isQaLead,
  priorityScore,
  suggestedAction,
  formatAgeShort,
  type SuggestedActionKey,
} from "@/lib/admin/lead-classification";

interface LeadsTableProps {
  leads: EnrichedLead[];
  onOpenDetail: (lead: EnrichedLead) => void;
}

type SortKey = "priority" | "recent" | "oldest" | "name" | "status";
const HARD_CONFIRM_PHRASE = "APAGAR";

/** Subconjunto de chips renderizados na tabela. Pela ordem do screenshot. */
const TABLE_CHIP_KEYS: FilterChipKey[] = [
  "todos",
  "quentes",
  "credito_esgotado",
  "sem_feedback",
  "novos_hoje",
];

const STATUS_LABELS: Record<string, { label: string; color: string }> =
  Object.fromEntries(
    COMMERCIAL_STATUS_OPTIONS.map((c) => [c.key, { label: c.label, color: c.color }]),
  );

function StatusPill({ status }: { status: string }) {
  const meta = STATUS_LABELS[status];
  if (!meta) {
    return (
      <span className="text-[12px] text-admin-text-tertiary">{status}</span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[12px] font-medium whitespace-nowrap"
      style={{ color: meta.color }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: meta.color }}
      />
      {meta.label}
    </span>
  );
}

function CreditsCell({ lead }: { lead: EnrichedLead }) {
  const granted = lead.credits_granted ?? 0;
  const used = lead.credits_used ?? 0;
  const remaining = lead.credits_remaining ?? 0;
  if (granted === 0 && used === 0) {
    return <span className="text-[12px] text-admin-text-tertiary">—</span>;
  }
  const exhausted = granted > 0 && remaining <= 0;
  const color = exhausted
    ? "rgb(var(--admin-expense-500))"
    : "rgb(var(--admin-text-secondary))";
  return (
    <div className="flex flex-col leading-tight">
      <span
        className="text-[13px] font-semibold tabular-nums"
        style={{ color }}
      >
        {used}/{granted}
      </span>
      {exhausted && (
        <span className="text-[10.5px] uppercase tracking-wider text-[rgb(var(--admin-expense-500))]">
          crédito esgotado
        </span>
      )}
    </div>
  );
}

function ActionButton({
  lead,
  onClick,
}: {
  lead: EnrichedLead;
  onClick: (lead: EnrichedLead, action: SuggestedActionKey) => void;
}) {
  const action = suggestedAction(lead);
  const base =
    "inline-flex items-center justify-center rounded-md px-2.5 py-1 text-[12px] font-medium whitespace-nowrap transition-colors";
  let cls = base;
  let style: React.CSSProperties | undefined;
  if (action.intent === "primary") {
    style = {
      backgroundColor: "rgb(var(--admin-info-500))",
      color: "#fff",
    };
  } else if (action.intent === "signal") {
    style = {
      backgroundColor: "rgb(var(--admin-signal-500))",
      color: "#fff",
    };
  } else {
    cls += " border border-[var(--color-admin-border)] text-admin-text-secondary hover:bg-admin-surface-muted";
  }
  return (
    <button
      type="button"
      className={cls}
      style={style}
      onClick={(e) => {
        e.stopPropagation();
        onClick(lead, action.key);
      }}
      aria-label={`${action.label} — ${lead.name?.trim() || lead.email}`}
    >
      {action.label}
    </button>
  );
}

function MiniKpi({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string | number;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className="flex flex-col gap-1 rounded-lg border px-3 py-2.5"
      style={{
        borderColor: highlight
          ? "rgb(var(--admin-signal-500))"
          : "var(--color-admin-border)",
        backgroundColor: highlight
          ? "rgb(var(--admin-signal-50))"
          : "#fff",
      }}
    >
      <span className="text-eyebrow-sm text-admin-text-tertiary">{label}</span>
      <span className="text-[20px] font-semibold tabular-nums text-admin-text-primary leading-none">
        {value}
      </span>
      {sub && (
        <span className="text-[11px] text-admin-text-tertiary">{sub}</span>
      )}
    </div>
  );
}

export function LeadsTable({ leads, onOpenDetail }: LeadsTableProps) {
  const [query, setQuery] = useState("");
  const [chip, setChip] = useState<FilterChipKey>("todos");
  const [sort, setSort] = useState<SortKey>("priority");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [forcePaid, setForcePaid] = useState(false);
  const [hideQa, setHideQa] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const v = window.localStorage.getItem("admin.leads.hideQa");
    return v === null ? true : v === "1";
  });
  const queryClient = useQueryClient();

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("admin.leads.hideQa", hideQa ? "1" : "0");
    }
  }, [hideQa]);

  // Divide QA vs reais primeiro — os KPIs e contadores só usam reais.
  const { realLeads, qaLeads } = useMemo(() => {
    const real: EnrichedLead[] = [];
    const qa: EnrichedLead[] = [];
    for (const l of leads) (isQaLead(l) ? qa : real).push(l);
    return { realLeads: real, qaLeads: qa };
  }, [leads]);

  const visibleSource = hideQa ? realLeads : leads;

  const filtered = useMemo(() => {
    const base = visibleSource.filter(
      (l) => matchesChip(l, chip) && matchesQuery(l, query),
    );
    const now = Date.now();
    return [...base].sort((a, b) => {
      if (sort === "priority") {
        const pb = priorityScore(b, now);
        const pa = priorityScore(a, now);
        if (pb !== pa) return pb - pa;
        return (
          new Date(b.last_interaction).getTime() -
          new Date(a.last_interaction).getTime()
        );
      }
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
    });
  }, [visibleSource, chip, query, sort]);

  // KPIs calculados a partir dos reais (independente do filtro de chip),
  // para serem estáveis enquanto se navega por chips.
  const kpis = useMemo(() => {
    const now = Date.now();
    const needsAction = realLeads.filter((l) => priorityScore(l, now) >= 2).length;
    const reportViewed = realLeads.filter((l) => (l.report_views ?? 0) > 0).length;
    const reportToAccount = realLeads.length
      ? Math.round((reportViewed / realLeads.length) * 100)
      : 0;
    const paid = realLeads.filter(
      (l) => (l.payment_summary?.paid_products?.length ?? 0) > 0,
    ).length;
    const accountToPaid = realLeads.length
      ? Math.round((paid / realLeads.length) * 100)
      : 0;
    return { needsAction, reportToAccount, accountToPaid, reportViewed, paid };
  }, [realLeads]);

  const hasFilters = chip !== "todos" || query.trim() !== "";
  const isEmptyByFilter = filtered.length === 0 && visibleSource.length > 0;
  const isEmpty = leads.length === 0;
  const activeFiltersCount = (chip !== "todos" ? 1 : 0) + (query.trim() ? 1 : 0);

  const clearFilters = () => {
    setChip("todos");
    setQuery("");
  };

  const counterLabel = hasFilters
    ? `${filtered.length} de ${visibleSource.length} contactos`
    : `${visibleSource.length} contactos`;

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
      if (allFilteredSelected) for (const l of filtered) next.delete(l.id);
      else for (const l of filtered) next.add(l.id);
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
    mutationFn: async (args: { ids: string[]; force_paid?: boolean }) => {
      const res = await adminFetch("/api/admin/leads-bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: args.ids,
          mode: "purge",
          force_paid: args.force_paid ?? false,
        }),
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
          ? "1 conta de teste apagada definitivamente"
          : `${data.deleted} contas de teste apagadas definitivamente`,
      );
      clearSelection();
      setConfirmOpen(false);
      setConfirmText("");
      setForcePaid(false);
      queryClient.invalidateQueries({ queryKey: ["admin", "leads"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Falha ao apagar contactos");
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await adminFetch("/api/admin/leads-bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, mode: "archive" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        throw new Error(json?.error ?? `Falha ao arquivar (HTTP ${res.status})`);
      }
      return json as { archived: number };
    },
    onSuccess: (data) => {
      const n = data.archived ?? 0;
      toast.success(
        n === 1 ? "1 contacto arquivado" : `${n} contactos arquivados`,
      );
      clearSelection();
      queryClient.invalidateQueries({ queryKey: ["admin", "leads"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Falha ao arquivar contactos");
    },
  });

  const confirmDisabled =
    confirmText.trim().toUpperCase() !== HARD_CONFIRM_PHRASE ||
    deleteMutation.isPending;

  const onOpenConfirmChange = (open: boolean) => {
    if (!open && deleteMutation.isPending) return;
    setConfirmOpen(open);
    if (!open) {
      setConfirmText("");
      setForcePaid(false);
    }
  };

  const handleActionClick = (lead: EnrichedLead, _action: SuggestedActionKey) => {
    // Por agora abre a ficha de detalhe — espaço para mutations futuras.
    onOpenDetail(lead);
  };

  const tableChips = TABLE_CHIP_KEYS.map((key) =>
    FILTER_CHIPS.find((c) => c.key === key)!,
  );

  return (
    <div className="flex flex-col gap-4">
      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <MiniKpi
          label="Contactos reais"
          value={realLeads.length}
          sub={qaLeads.length > 0 ? `+${qaLeads.length} em QA${hideQa ? " ocultos" : ""}` : undefined}
        />
        <MiniKpi
          label="Report → Conta"
          value={`${kpis.reportToAccount}%`}
          sub={`${kpis.reportViewed} de ${realLeads.length}`}
        />
        <MiniKpi
          label="Conta → Pago"
          value={`${kpis.accountToPaid}%`}
          sub={kpis.paid === 0 ? "checkout por ligar" : `${kpis.paid} pagos`}
        />
        <MiniKpi
          label="Precisam de acção"
          value={kpis.needsAction}
          sub={kpis.needsAction === 0 ? "tudo em dia" : "quentes ou sem crédito"}
          highlight={kpis.needsAction > 0}
        />
      </div>

      <div className="border border-[var(--color-admin-border)] rounded-xl bg-white overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 flex-wrap px-3 py-2.5 border-b border-[var(--color-admin-border)]">
          <div className="flex items-center gap-2 flex-wrap">
            <div
              className="flex flex-wrap gap-1 p-1 bg-white border border-[var(--color-admin-border)] rounded-lg"
              role="tablist"
              aria-label="Filtros de trabalho"
            >
              {tableChips.map((c) => {
                const isActive = c.key === chip;
                const count =
                  c.key === "todos"
                    ? visibleSource.length
                    : visibleSource.filter((l) => matchesChip(l, c.key)).length;
                return (
                  <button
                    key={c.key}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setChip(c.key)}
                    className="px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors tabular-nums"
                    style={
                      isActive
                        ? {
                            backgroundColor: "var(--admin-board-chip-active-bg)",
                            color: "var(--admin-board-chip-active-text)",
                          }
                        : { color: "var(--color-admin-text-secondary)" }
                    }
                  >
                    {c.label} · {count}
                  </button>
                );
              })}
            </div>
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[12px] font-medium rounded-md text-admin-text-secondary hover:bg-admin-surface-muted transition-colors"
              >
                <X size={12} />
                Limpar ({activeFiltersCount})
              </button>
            )}
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <button
              type="button"
              onClick={() => setHideQa((v) => !v)}
              className="inline-flex items-center gap-1.5 px-2.5 h-9 text-[12px] font-medium rounded-md border border-[var(--color-admin-border)] text-admin-text-secondary hover:bg-admin-surface-muted transition-colors"
              aria-pressed={hideQa}
            >
              {hideQa ? "Mostrar QA" : "Ocultar QA"}
              {qaLeads.length > 0 && (
                <span className="text-admin-text-tertiary tabular-nums">
                  · {qaLeads.length}
                </span>
              )}
            </button>
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
                className="pl-8 pr-3 h-9 text-[13px] bg-white border border-[var(--color-admin-border)] rounded-lg w-full sm:w-[240px] outline-none focus:border-[var(--color-admin-info-500)] focus:ring-1 focus:ring-[var(--color-admin-info-500)]/30"
              />
            </div>
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger
                className="h-9 w-[160px] text-[12px]"
                aria-label="Ordenar contactos"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="priority">Prioridade</SelectItem>
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
                variant="outline"
                onClick={() =>
                  archiveMutation.mutate(selectedLeads.map((l) => l.id))
                }
                disabled={archiveMutation.isPending || selectedLeads.length === 0}
                className="gap-1.5"
              >
                {archiveMutation.isPending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Archive size={14} />
                )}
                Arquivar ({selectedIds.size})
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setConfirmOpen(true)}
                className="gap-1.5"
                title="Apagar definitivamente — só para contas de teste"
              >
                <Trash2 size={14} />
                Apagar definitivamente ({selectedIds.size})
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
                  <TableHead className="text-eyebrow-sm text-admin-text-tertiary">Contacto</TableHead>
                  <TableHead className="text-eyebrow-sm text-admin-text-tertiary">Perfil</TableHead>
                  <TableHead className="text-eyebrow-sm text-admin-text-tertiary">Estado</TableHead>
                  <TableHead className="text-eyebrow-sm text-admin-text-tertiary">Créditos</TableHead>
                  <TableHead className="text-eyebrow-sm text-admin-text-tertiary">Visto há</TableHead>
                  <TableHead className="text-eyebrow-sm text-admin-text-tertiary text-right pr-3">Acção</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((lead) => {
                  const isSelected = selectedIds.has(lead.id);
                  const score = priorityScore(lead);
                  const isHighlight = score >= 2;
                  return (
                    <TableRow
                      key={lead.id}
                      data-state={isSelected ? "selected" : undefined}
                      className="cursor-pointer hover:bg-[var(--admin-board-column-bg)] data-[state=selected]:bg-[var(--admin-board-chip-active-bg)]/40"
                      style={
                        isHighlight
                          ? {
                              backgroundColor: "rgb(var(--admin-signal-50))",
                              boxShadow:
                                "inset 2px 0 0 0 rgb(var(--admin-signal-500))",
                            }
                          : undefined
                      }
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
                      <TableCell>
                        <div className="flex flex-col leading-tight">
                          <span className="text-[13px] font-medium text-admin-text-primary">
                            {lead.name?.trim() || "Sem nome"}
                          </span>
                          <span className="text-[11.5px] text-admin-text-tertiary truncate max-w-[220px]">
                            {lead.email}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-[12.5px] text-admin-text-secondary">
                        {lead.handle ? `@${lead.handle}` : "—"}
                      </TableCell>
                      <TableCell>
                        <StatusPill status={lead.commercial_status} />
                      </TableCell>
                      <TableCell>
                        <CreditsCell lead={lead} />
                      </TableCell>
                      <TableCell className="text-[12px] text-admin-text-secondary tabular-nums">
                        {formatAgeShort(lead.last_interaction)}
                      </TableCell>
                      <TableCell className="text-right pr-3">
                        <ActionButton lead={lead} onClick={handleActionClick} />
                      </TableCell>
                    </TableRow>
                  );
                })}

                {hideQa && qaLeads.length > 0 && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell
                      colSpan={7}
                      className="px-3 py-2 text-[11.5px] text-admin-text-tertiary"
                    >
                      <span className="inline-flex items-center gap-2">
                        <span className="tabular-nums">{qaLeads.length}</span>
                        {qaLeads.length === 1
                          ? " contacto de QA oculto · "
                          : " contactos de QA ocultos · "}
                        <button
                          type="button"
                          onClick={() => setHideQa(false)}
                          className="underline underline-offset-2 hover:text-admin-text-secondary"
                        >
                          mostrar
                        </button>
                      </span>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}

        <AlertDialog open={confirmOpen} onOpenChange={onOpenConfirmChange}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {selectedIds.size === 1
                  ? "Apagar definitivamente 1 conta de teste?"
                  : `Apagar definitivamente ${selectedIds.size} contas de teste?`}
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
                      permanente e destinada a contas de teste
                    </span>
                    . Vão ser removidos: o utilizador de autenticação
                    (auth.users), todos os relatórios pedidos, snapshots,
                    pagamentos, créditos, entitlements, unlocks, feedback beta
                    e eventos associados. Para arquivar sem destruir, usa o
                    botão <span className="font-medium">Arquivar</span>.
                  </div>
                  <div className="rounded-md border border-amber-300 bg-amber-50 px-2.5 py-2 text-[12px] text-amber-900">
                    Se algum contacto tiver pagamentos confirmados, a operação
                    é bloqueada por defeito. Activa a opção abaixo só se sabes
                    o que estás a fazer.
                  </div>
                  <label className="flex items-center gap-2 text-[12px] text-admin-text-secondary">
                    <input
                      type="checkbox"
                      checked={forcePaid}
                      onChange={(e) => setForcePaid(e.target.checked)}
                      className="h-3.5 w-3.5"
                    />
                    Forçar mesmo com pagamentos pagos (destrutivo)
                  </label>
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
                        deleteMutation.mutate({
                          ids: selectedLeads.map((l) => l.id),
                          force_paid: forcePaid,
                        });
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
                  deleteMutation.mutate({
                    ids: selectedLeads.map((l) => l.id),
                    force_paid: forcePaid,
                  });
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
    </div>
  );
}
