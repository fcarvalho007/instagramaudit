/**
 * /admin/beta-leads — área de Contactos (Pipeline + Tabela).
 *
 * URL mantida por compatibilidade. Vista controlada por `?view=pipeline|tabela`
 * e abertura de ficha por `?lead=<id>`. O `LeadDetailSheet` vive aqui,
 * partilhado entre o Kanban e a tabela.
 */

import { useCallback, useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { AdminPageHeader } from "@/components/admin/v2/admin-page-header";
import { KanbanBoard } from "@/components/admin/v2/beta-leads/kanban-board";
import { LeadsTable } from "@/components/admin/v2/beta-leads/leads-table";
import { LeadDetailSheet } from "@/components/admin/v2/beta-leads/lead-detail-sheet";
import type { EnrichedLead } from "@/lib/admin/kanban-columns";

type PipelineView = "pipeline" | "tabela";

export const Route = createFileRoute("/admin/beta-leads")({
  component: BetaLeadsPage,
  validateSearch: (
    search: Record<string, unknown>,
  ): { lead?: string; view?: PipelineView } => ({
    lead: typeof search.lead === "string" ? search.lead : undefined,
    view:
      search.view === "tabela" || search.view === "pipeline"
        ? search.view
        : undefined,
  }),
});

async function fetchLeads(): Promise<EnrichedLead[]> {
  const res = await fetch("/api/admin/leads-kanban", { credentials: "include" });
  if (!res.ok) throw new Error("Falha ao carregar leads");
  const json = await res.json();
  return json.leads ?? [];
}

async function updateLead(id: string, updates: Record<string, unknown>) {
  const res = await fetch(`/api/admin/leads-kanban/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error("Falha ao atualizar lead");
  return res.json();
}

function BetaLeadsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { lead: leadParam, view: viewParam } = Route.useSearch();
  const view: PipelineView = viewParam ?? "pipeline";

  const { data: leads = [], isLoading, error } = useQuery({
    queryKey: ["admin", "beta-leads"],
    queryFn: fetchLeads,
    refetchInterval: 30_000,
  });

  const handleUpdate = useCallback(
    async (id: string, updates: Record<string, unknown>) => {
      queryClient.setQueryData<EnrichedLead[]>(
        ["admin", "beta-leads"],
        (old) =>
          old?.map((l) =>
            l.id === id
              ? {
                  ...l,
                  ...(updates.commercial_status
                    ? { commercial_status: updates.commercial_status as string }
                    : {}),
                  ...(typeof updates.internal_notes === "string"
                    ? { internal_notes: updates.internal_notes }
                    : {}),
                  ...(updates.mark_contacted
                    ? { contacted_at: new Date().toISOString() }
                    : {}),
                }
              : l,
          ),
      );

      try {
        await updateLead(id, updates);
      } catch {
        queryClient.invalidateQueries({ queryKey: ["admin", "beta-leads"] });
      }
    },
    [queryClient],
  );

  const setActiveLeadId = useCallback(
    (id: string | null) => {
      navigate({
        to: "/admin/beta-leads",
        search: {
          ...(id ? { lead: id } : {}),
          ...(view !== "pipeline" ? { view } : {}),
        },
      });
    },
    [navigate, view],
  );

  const setView = useCallback(
    (next: string) => {
      const v: PipelineView = next === "tabela" ? "tabela" : "pipeline";
      navigate({
        to: "/admin/beta-leads",
        search: {
          ...(leadParam ? { lead: leadParam } : {}),
          ...(v !== "pipeline" ? { view: v } : {}),
        },
      });
    },
    [navigate, leadParam],
  );

  const activeLead = useMemo(
    () => (leadParam ? leads.find((l) => l.id === leadParam) ?? null : null),
    [leadParam, leads],
  );

  const openDetail = useCallback(
    (lead: EnrichedLead) => setActiveLeadId(lead.id),
    [setActiveLeadId],
  );

  return (
    <>
      <AdminPageHeader
        title="Pipeline"
        subtitle="Acompanha contactos desde o primeiro relatório até à conversão."
      />

      {isLoading && (
        <div className="py-12 text-center text-sm text-admin-text-tertiary">
          A carregar contactos…
        </div>
      )}

      {error && (
        <div className="py-8 text-center text-sm text-[rgb(var(--admin-expense-500))]">
          Erro ao carregar contactos. Verifica a sessão de admin.
        </div>
      )}

      {!isLoading && !error && (
        <Tabs value={view} onValueChange={setView} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
            <TabsTrigger value="tabela">Tabela</TabsTrigger>
          </TabsList>

          <TabsContent value="pipeline" className="mt-0">
            <KanbanBoard
              leads={leads}
              onUpdate={handleUpdate}
              onOpenDetail={openDetail}
            />
          </TabsContent>

          <TabsContent value="tabela" className="mt-0">
            <LeadsTable leads={leads} onOpenDetail={openDetail} />
          </TabsContent>
        </Tabs>
      )}

      <LeadDetailSheet
        open={!!activeLead}
        onOpenChange={(open) => {
          if (!open) setActiveLeadId(null);
        }}
        lead={activeLead}
        onUpdate={handleUpdate}
      />
    </>
  );
}
