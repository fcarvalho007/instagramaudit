/**
 * /admin/beta-leads — kanban comercial para gestão de leads beta.
 */

import { useState, useCallback } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminPageHeader } from "@/components/admin/v2/admin-page-header";
import { KanbanBoard } from "@/components/admin/v2/beta-leads/kanban-board";
import type { EnrichedLead } from "@/lib/admin/kanban-columns";

export const Route = createFileRoute("/admin/beta-leads")({
  component: BetaLeadsPage,
  validateSearch: (search: Record<string, unknown>): { lead?: string } => ({
    lead: typeof search.lead === "string" ? search.lead : undefined,
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
  const { lead: leadParam } = Route.useSearch();
  const { data: leads = [], isLoading, error } = useQuery({
    queryKey: ["admin", "beta-leads"],
    queryFn: fetchLeads,
    refetchInterval: 30_000,
  });

  const handleUpdate = useCallback(
    async (id: string, updates: Record<string, unknown>) => {
      // Optimistic: update local cache
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
              : l
          )
      );

      try {
        await updateLead(id, updates);
      } catch {
        // Revert on error
        queryClient.invalidateQueries({ queryKey: ["admin", "beta-leads"] });
      }
    },
    [queryClient]
  );

  const activeCount = leads.filter(
    (l) => l.commercial_status !== "arquivado"
  ).length;

  const clearLeadParam = useCallback(() => {
    navigate({ to: "/admin/beta-leads", search: {} });
  }, [navigate]);

  return (
    <>
      <AdminPageHeader
        title="Beta Leads"
        subtitle={`${leads.length} leads · ${activeCount} ativos`}
      />

      {isLoading && (
        <div className="py-12 text-center text-sm" style={{ color: "#888780" }}>
          A carregar leads...
        </div>
      )}

      {error && (
        <div
          className="py-8 text-center text-sm"
          style={{ color: "#A32D2D" }}
        >
          Erro ao carregar leads. Verifica a sessão de admin.
        </div>
      )}

      {!isLoading && !error && (
        <KanbanBoard
          leads={leads}
          onUpdate={handleUpdate}
          initialDetailLeadId={leadParam ?? null}
          onDetailClose={clearLeadParam}
        />
      )}
    </>
  );
}