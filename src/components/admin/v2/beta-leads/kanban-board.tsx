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
import { KANBAN_COLUMNS, type EnrichedLead } from "@/lib/admin/kanban-columns";
import { LeadCard } from "./lead-card";

interface KanbanBoardProps {
  leads: EnrichedLead[];
  onUpdate: (id: string, updates: Record<string, unknown>) => void;
}

export function KanbanBoard({ leads, onUpdate }: KanbanBoardProps) {
  const [editingLead, setEditingLead] = useState<EnrichedLead | null>(null);
  const [notesText, setNotesText] = useState("");

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
                style={{ width: 270 }}
              >
                {/* Column header */}
                <div
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
                  style={{
                    borderLeft: `3px solid ${col.color}`,
                    backgroundColor: `${col.color}10`,
                  }}
                >
                  <span
                    className="text-[12px] font-medium"
                    style={{ color: col.color }}
                  >
                    {col.label}
                  </span>
                  <span
                    className="ml-auto text-[11px] font-mono rounded-full px-1.5 py-0.5"
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
                      className="rounded-lg border border-dashed py-6 text-center text-[12px]"
                      style={{
                        borderColor: "#D3D1C7",
                        color: "#B4B2A9",
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
            <SheetTitle className="text-sm">
              Notas — {editingLead?.email}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 flex flex-col gap-3">
            <Textarea
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              rows={8}
              placeholder="Notas internas sobre este lead..."
              className="text-sm"
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