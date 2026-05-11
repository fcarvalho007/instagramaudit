/**
 * KanbanBoard — horizontal scrollable board for beta leads.
 */

import { useState } from "react";
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
import { KANBAN_COLUMNS, type EnrichedLead } from "@/lib/admin/kanban-columns";
import { LeadCard } from "./lead-card";

interface KanbanBoardProps {
  leads: EnrichedLead[];
  onUpdate: (id: string, updates: Record<string, unknown>) => void;
  /** Controlado pelo pai: callback ao abrir o detalhe de um lead. */
  onOpenDetail: (lead: EnrichedLead) => void;
}

type FilterChipKey =
  | "todos"
  | "em_analise"
  | "com_relatorio"
  | "com_feedback"
  | "potencial"
  | "arquivados";

const FILTER_CHIPS: { key: FilterChipKey; label: string; statuses: string[] | null }[] = [
  { key: "todos", label: "Todos", statuses: null },
  { key: "em_analise", label: "Em análise", statuses: ["novo_pedido", "em_analise"] },
  {
    key: "com_relatorio",
    label: "Com relatório",
    statuses: ["relatorio_gerado", "link_enviado", "relatorio_visto"],
  },
  {
    key: "com_feedback",
    label: "Com feedback",
    statuses: ["feedback_pedido", "feedback_recebido"],
  },
  {
    key: "potencial",
    label: "Potencial cliente",
    statuses: ["interessado", "potencial_cliente", "convertido"],
  },
  { key: "arquivados", label: "Arquivados", statuses: ["arquivado"] },
];

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
    KANBAN_COLUMNS[0]?.key ?? null
  );

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
  const visibleColumns = activeChip.statuses
    ? KANBAN_COLUMNS.filter((c) => activeChip.statuses!.includes(c.key))
    : KANBAN_COLUMNS;

  const q = search.trim().toLowerCase();
  const filteredLeads = q
    ? leads.filter(
        (l) =>
          (l.name && l.name.toLowerCase().includes(q)) ||
          l.email.toLowerCase().includes(q) ||
          (l.handle && l.handle.toLowerCase().includes(q))
      )
    : leads;

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
        <div
          className="flex flex-wrap gap-1 p-1 bg-white border border-[var(--color-admin-border)] rounded-lg"
          role="tablist"
        >
          {FILTER_CHIPS.map((chip) => {
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
                    : {
                        color: "var(--color-admin-text-secondary)",
                      }
                }
              >
                {chip.label}
              </button>
            );
          })}
        </div>
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
            className="pl-8 pr-3 h-9 text-[13px] bg-white border border-[var(--color-admin-border)] rounded-lg w-full sm:w-[260px] outline-none focus:border-[var(--color-admin-info-500)] focus:ring-1 focus:ring-[var(--color-admin-info-500)]/30"
          />
        </div>
      </div>

      {/* Mobile: accordion */}
      <div className="md:hidden flex flex-col gap-2">
        {visibleColumns.map((col) => {
          const colLeads = filteredLeads.filter((l) => l.commercial_status === col.key);
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
              (l) => l.commercial_status === col.key
            );
            return (
              <div
                key={col.key}
                className="flex flex-col shrink-0"
                style={{ width: 272 }}
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
                        <LeadCard
                          key={lead.id}
                          lead={lead}
                          onUpdate={onUpdate}
                          onEditNotes={openNotes}
                          onOpenDetail={onOpenDetail}
                        />
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
              Notas — {editingLead?.email}
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