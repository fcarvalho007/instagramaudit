/**
 * KanbanBoard — horizontal scrollable board for beta leads.
 */

import { useEffect, useState } from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { KANBAN_COLUMNS, type EnrichedLead } from "@/lib/admin/kanban-columns";
import { LeadCard } from "./lead-card";
import { LeadDetailSheet } from "./lead-detail-sheet";

interface KanbanBoardProps {
  leads: EnrichedLead[];
  onUpdate: (id: string, updates: Record<string, unknown>) => void;
  initialDetailLeadId?: string | null;
  onDetailClose?: () => void;
}

export function KanbanBoard({
  leads,
  onUpdate,
  initialDetailLeadId,
  onDetailClose,
}: KanbanBoardProps) {
  const [editingLead, setEditingLead] = useState<EnrichedLead | null>(null);
  const [notesText, setNotesText] = useState("");
  const [detailLead, setDetailLead] = useState<EnrichedLead | null>(null);

  // Sincroniza com search param `?lead=<id>` (vindo da Command Palette).
  useEffect(() => {
    if (!initialDetailLeadId) return;
    const found = leads.find((l) => l.id === initialDetailLeadId);
    if (found) setDetailLead(found);
  }, [initialDetailLeadId, leads]);

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

  return (
    <>
      <ScrollArea className="w-full">
        <div className="flex gap-3 pb-4" style={{ minWidth: "fit-content" }}>

          {KANBAN_COLUMNS.map((col) => {
            const colLeads = leads.filter(
              (l) => l.commercial_status === col.key
            );
            return (
              <div
                key={col.key}
                className="flex flex-col gap-2.5 shrink-0"
                style={{ width: 290 }}
              >
                {/* Column header */}
                <div
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg"
                  style={{
                    borderLeft: `3px solid ${col.color}`,
                    backgroundColor: `${col.color}10`,
                  }}
                >
                  <span
                    className="text-[13px] font-medium"
                    style={{ color: col.color }}
                  >
                    {col.label}
                  </span>
                  <span
                    className="ml-auto admin-code rounded-full px-2 py-0.5"
                    style={{
                      backgroundColor: `${col.color}18`,
                      color: col.color,
                    }}
                  >
                    {colLeads.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex flex-col gap-2">
                  {colLeads.length === 0 && (
                    <div
                      className="rounded-lg border border-dashed py-8 text-center admin-body"
                      style={{
                        borderColor: "rgb(var(--admin-neutral-100))",
                        color: "rgb(var(--admin-neutral-400))",
                      }}
                    >
                      Sem leads
                    </div>
                  )}
                  {colLeads.map((lead) => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      onUpdate={onUpdate}
                      onEditNotes={openNotes}
                      onOpenDetail={setDetailLead}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

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

      {/* Lead detail sheet */}
      <LeadDetailSheet
        open={!!detailLead}
        onOpenChange={(open) => {
          if (!open) setDetailLead(null);
        }}
        lead={detailLead}
        onUpdate={onUpdate}
      />
    </>
  );
}