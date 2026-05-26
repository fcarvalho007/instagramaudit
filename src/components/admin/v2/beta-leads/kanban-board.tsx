/**
 * KanbanBoard — horizontal scrollable board for beta leads.
 */

import { useEffect, useMemo, useState } from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Search, ChevronDown, Inbox } from "lucide-react";
import {
  KANBAN_COLUMNS,
  deriveKanbanColumn,
  type EnrichedLead,
} from "@/lib/admin/kanban-columns";
import {
  FILTER_CHIPS,
  matchesChip,
  matchesQuery,
  type FilterChipKey,
} from "@/lib/admin/lead-filter-chips";
import { LeadCard } from "./lead-card";
import { toast } from "sonner";

/**
 * Mapeia chave de coluna do board → valor a gravar em `leads.commercial_status`.
 * Coincide 1:1 com as 5 colunas (todas valores válidos do schema).
 */
function mapColumnToStatus(columnKey: string): string {
  return columnKey;
}

interface KanbanBoardProps {
  leads: EnrichedLead[];
  onUpdate: (id: string, updates: Record<string, unknown>) => void;
  /** Controlado pelo pai: callback ao abrir o detalhe de um lead. */
  onOpenDetail: (lead: EnrichedLead) => void;
}

export function KanbanBoard({
  leads,
  onUpdate,
  onOpenDetail,
}: KanbanBoardProps) {
  const [editingLead, setEditingLead] = useState<EnrichedLead | null>(null);
  const [notesText, setNotesText] = useState("");
  const [search, setSearch] = useState("");
  const [filterChip, setFilterChip] = useState<FilterChipKey>("todos");
  const [openMobileSection, setOpenMobileSection] = useState<string | null>(
    KANBAN_COLUMNS[0]?.key ?? null,
  );
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const handleDrop = (targetKey: string, leadId: string) => {
    setDragOverColumn(null);
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;
    const currentCol = deriveKanbanColumn(lead);
    if (currentCol === targetKey) return;
    const targetCol = KANBAN_COLUMNS.find((c) => c.key === targetKey);
    const label = targetCol?.label ?? targetKey;
    const previous = lead.commercial_status;
    const name = lead.name?.trim() || lead.email;
    onUpdate(leadId, { commercial_status: mapColumnToStatus(targetKey) });
    toast.success(`"${name}" movido para "${label}"`, {
      action: {
        label: "Anular",
        onClick: () => onUpdate(leadId, { commercial_status: previous }),
      },
      duration: 5000,
    });
  };

  const openNotes = (lead: EnrichedLead) => {
    setEditingLead(lead);
    setNotesText(lead.internal_notes ?? "");
  };

  const saveNotes = () => {
    if (editingLead) {
      onUpdate(editingLead.id, { internal_notes: notesText });
      setEditingLead(null);
    }
  };

  const activeChip = FILTER_CHIPS.find((c) => c.key === filterChip)!;
  const visibleColumns = activeChip.columns
    ? KANBAN_COLUMNS.filter((c) => activeChip.columns!.includes(c.key))
    : KANBAN_COLUMNS;

  const filteredLeads = useMemo(
    () =>
      [...leads]
        .filter((l) => matchesChip(l, filterChip) && matchesQuery(l, search))
        .sort(
          (a, b) =>
            new Date(b.last_interaction).getTime() -
            new Date(a.last_interaction).getTime(),
        ),
    [leads, filterChip, search],
  );

  const hasFilters = filterChip !== "todos" || search.trim() !== "";
  const counterLabel = hasFilters
    ? `${filteredLeads.length} de ${leads.length} contactos`
    : `${leads.length} contactos`;

  const clearFilters = () => {
    setFilterChip("todos");
    setSearch("");
  };

  // Mobile: re-sincronizar a secção aberta com as colunas visíveis quando o
  // chip esconde a primeira (evita accordion vazio).
  useEffect(() => {
    if (visibleColumns.length === 0) {
      setOpenMobileSection(null);
      return;
    }
    if (
      openMobileSection &&
      !visibleColumns.some((c) => c.key === openMobileSection)
    ) {
      setOpenMobileSection(visibleColumns[0]?.key ?? null);
    }
  }, [visibleColumns, openMobileSection]);

  const chipsByGroup = {
    estado: FILTER_CHIPS.filter((c) => c.group === "estado"),
    atencao: FILTER_CHIPS.filter((c) => c.group === "atencao"),
  };

  const renderChip = (chip: typeof FILTER_CHIPS[number]) => {
    const isActive = chip.key === filterChip;
    return (
      <button
        key={chip.key}
        type="button"
        role="tab"
        aria-selected={isActive}
        onClick={() => setFilterChip(chip.key)}
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
        {chip.label}
      </button>
    );
  };

  const renderColumnHeader = (col: typeof KANBAN_COLUMNS[number], count: number) => (
    <>
      <div className="h-[2px] rounded-t-xl" style={{ backgroundColor: col.color }} />
      <div className="px-3 py-2.5 bg-white border-x border-t-0 border-[var(--color-admin-border)] flex items-center justify-between">
        <span className="text-[13px] font-medium text-admin-text-primary truncate">
          {col.label}
        </span>
        <span
          className="ml-2 text-[11px] font-semibold tabular-nums px-2 py-0.5 rounded-full shrink-0"
          style={{
            backgroundColor: `${col.color}24`,
            color: col.color,
          }}
        >
          {count}
        </span>
      </div>
    </>
  );

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-8 text-admin-text-tertiary">
      <Inbox size={20} className="mb-1.5 opacity-60" />
      <span className="text-[12px]">Sem leads</span>
    </div>
  );

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <div
            className="flex flex-wrap gap-1 p-1 bg-white border border-[var(--color-admin-border)] rounded-lg"
            role="tablist"
            aria-label="Filtrar por estado"
          >
            {chipsByGroup.estado.map(renderChip)}
          </div>
          <div
            className="flex flex-wrap gap-1 p-1 bg-white border border-[var(--color-admin-border)] rounded-lg"
            role="tablist"
            aria-label="Filtros de atenção"
          >
            {chipsByGroup.atencao.map(renderChip)}
          </div>
        </div>
        <div className="flex items-center gap-3 ml-auto">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-admin-text-tertiary pointer-events-none"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar lead…"
              aria-label="Pesquisar contactos"
              className="pl-8 pr-3 h-9 text-[13px] bg-white border border-[var(--color-admin-border)] rounded-lg w-full sm:w-[260px] outline-none focus:border-[var(--color-admin-info-500)] focus:ring-1 focus:ring-[var(--color-admin-info-500)]/30"
            />
          </div>
          <span className="text-[12px] text-admin-text-tertiary tabular-nums whitespace-nowrap">
            {counterLabel}
          </span>
          {hasFilters && (
            <Button
              size="sm"
              variant="ghost"
              onClick={clearFilters}
              className="h-9 text-[12px]"
            >
              Limpar filtros
            </Button>
          )}
        </div>
      </div>

      {/* Mobile: accordion */}
      <div className="md:hidden flex flex-col gap-2">
        {visibleColumns.map((col) => {
          const colLeads = filteredLeads.filter(
            (l) => deriveKanbanColumn(l) === col.key,
          );
          const isOpen = openMobileSection === col.key;
          return (
            <div
              key={col.key}
              className="bg-white border border-[var(--color-admin-border)] rounded-xl overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setOpenMobileSection(isOpen ? null : col.key)}
                className="w-full flex items-center justify-between px-3 py-2.5 text-left"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: col.color }}
                  />
                  <span className="text-[13px] font-medium text-admin-text-primary truncate">
                    {col.label}
                  </span>
                  <span
                    className="text-[11px] font-semibold tabular-nums px-2 py-0.5 rounded-full shrink-0"
                    style={{
                      backgroundColor: `${col.color}24`,
                      color: col.color,
                    }}
                  >
                    {colLeads.length}
                  </span>
                </div>
                <ChevronDown
                  size={16}
                  className="text-admin-text-tertiary transition-transform"
                  style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                />
              </button>
              {isOpen && (
                <div
                  className="px-2 pb-2 pt-1 flex flex-col gap-2"
                  style={{ backgroundColor: "var(--admin-board-column-bg)" }}
                >
                  {colLeads.length === 0
                    ? renderEmptyState()
                    : colLeads.map((lead) => (
                        <LeadCard
                          key={lead.id}
                          lead={lead}
                          onUpdate={onUpdate}
                          onEditNotes={openNotes}
                          onOpenDetail={onOpenDetail}
                        />
                      ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop: horizontal scroll */}
      <div className="hidden md:block">
      <ScrollArea className="w-full">
        <div className="flex gap-3 pb-4" style={{ minWidth: "fit-content" }}>
          {visibleColumns.map((col) => {
            const colLeads = filteredLeads.filter(
              (l) => deriveKanbanColumn(l) === col.key,
            );
            const isDragOver = dragOverColumn === col.key;
            return (
              <div
                key={col.key}
                className={`flex flex-col shrink-0 transition-shadow rounded-xl ${
                  isDragOver
                    ? "ring-2 ring-[rgb(var(--admin-info-500))] ring-offset-2 ring-offset-transparent"
                    : ""
                }`}
                style={{ width: 272 }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (dragOverColumn !== col.key) setDragOverColumn(col.key);
                }}
                onDragLeave={(e) => {
                  if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                  setDragOverColumn((cur) => (cur === col.key ? null : cur));
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("text/plain");
                  if (id) handleDrop(col.key, id);
                }}
              >
                {/* Column header */}
                {renderColumnHeader(col, colLeads.length)}
                {/* Cards container */}
                <div
                  className="flex flex-col gap-2 p-2 border border-t-0 border-[var(--color-admin-border)] rounded-b-xl min-h-[240px]"
                  style={{ backgroundColor: "var(--admin-board-column-bg)" }}
                >
                  {colLeads.length === 0
                    ? renderEmptyState()
                    : colLeads.map((lead) => (
                        <div
                          key={lead.id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("text/plain", lead.id);
                            e.dataTransfer.effectAllowed = "move";
                          }}
                          className="cursor-grab active:cursor-grabbing"
                        >
                          <LeadCard
                            lead={lead}
                            onUpdate={onUpdate}
                            onEditNotes={openNotes}
                            onOpenDetail={onOpenDetail}
                          />
                        </div>
                      ))}
                </div>
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
      </div>

      {/* Notes editing sheet */}
      <Sheet
        open={!!editingLead}
        onOpenChange={(open) => {
          if (!open) setEditingLead(null);
        }}
      >
        <SheetContent>
          <SheetHeader>
            <SheetTitle className="admin-card-title">
              Notas — {editingLead?.name?.trim() || editingLead?.email}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 flex flex-col gap-3">
            <Textarea
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              rows={8}
              placeholder="Notas internas sobre este lead..."
              className="text-[13px]"
            />
            <Button size="sm" onClick={saveNotes}>
              Guardar notas
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}