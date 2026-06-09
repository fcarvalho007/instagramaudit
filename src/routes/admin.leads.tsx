/**
 * /admin/leads — área de Contactos (Pipeline + Tabela).
 *
 * Nova URL canónica. Vista controlada por `?view=pipeline|tabela`
 * e abertura de ficha por `?lead=<id>`. O `LeadDetailSheet` vive aqui,
 * partilhado entre o Kanban e a tabela.
 *
 * `/admin/beta-leads` continua a funcionar como redirect 301 (preserva
 * `?lead=` e `?view=`).
 */

import { useCallback, useMemo } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
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
import { LeadsConversionBanner } from "@/components/admin/v2/beta-leads/leads-conversion-banner";
import { OrphanAccountsPanel } from "@/components/admin/v2/beta-leads/orphan-accounts-panel";
import type { EnrichedLead } from "@/lib/admin/kanban-columns";
import { adminFetch } from "@/lib/admin/fetch";

type PipelineView = "pipeline" | "tabela" | "diagnostico";

export const Route = createFileRoute("/admin/leads")({
  component: LeadsPage,
  validateSearch: (
    search: Record<string, unknown>,
  ): { lead?: string; view?: PipelineView } => ({
    lead: typeof search.lead === "string" ? search.lead : undefined,
    view:
      search.view === "tabela" ||
      search.view === "pipeline" ||
      search.view === "diagnostico"
        ? search.view
        : undefined,
  }),
});

async function fetchLeads(): Promise<EnrichedLead[]> {
  const res = await adminFetch("/api/admin/leads-kanban");
  if (!res.ok) {
    let code: string | undefined;
    let message: string | undefined;
    try {
      const body = await res.json();
      code = body?.error_code ?? body?.code;
      message = body?.message ?? body?.error;
    } catch {
      /* sem body JSON */
    }
    const err = new Error(message ?? "Falha ao carregar leads") as Error & {
      status?: number;
      code?: string;
    };
    err.status = res.status;
    err.code = code;
    throw err;
  }
  const json = await res.json();
  return json.leads ?? [];
}

async function updateLead(id: string, updates: Record<string, unknown>) {
  const res = await adminFetch(`/api/admin/leads-kanban/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error("Falha ao atualizar lead");
  return res.json();
}

function LeadsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { lead: leadParam, view: viewParam } = Route.useSearch();
  const view: PipelineView = viewParam ?? "pipeline";

  const { data: leads = [], isLoading, error } = useQuery({
    queryKey: ["admin", "leads"],
    queryFn: fetchLeads,
    refetchInterval: 30_000,
  });

  const handleUpdate = useCallback(
    async (id: string, updates: Record<string, unknown>) => {
      queryClient.setQueryData<EnrichedLead[]>(
        ["admin", "leads"],
        (old) =>
          old?.map((l) =>
            l.id === id
              ? {
                  ...l,
                  ...(updates.commercial_status
                    ? {
                        commercial_status: updates.commercial_status as string,
                        last_interaction: new Date().toISOString(),
                        ...(updates.commercial_status === "arquivado"
                          ? { archived_at: new Date().toISOString() }
                          : { archived_at: null }),
                      }
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
        queryClient.invalidateQueries({ queryKey: ["admin", "leads"] });
      }
    },
    [queryClient],
  );

  const setActiveLeadId = useCallback(
    (id: string | null) => {
      navigate({
        to: "/admin/leads",
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
      const v: PipelineView =
        next === "tabela"
          ? "tabela"
          : next === "diagnostico"
            ? "diagnostico"
            : "pipeline";
      navigate({
        to: "/admin/leads",
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
        title="Contactos"
        subtitle="Acompanha contactos desde o primeiro relatório até à conversão."
      />

      <LeadsConversionBanner />

      {isLoading && (
        <div className="py-12 text-center text-sm text-admin-text-tertiary">
          A carregar contactos…
        </div>
      )}

      {error && (() => {
        const e = error as Error & { status?: number; code?: string };
        const isAuth = e.status === 401 || e.status === 403;
        return (
          <div className="py-10 flex flex-col items-center gap-3 text-center">
            <p className="text-sm text-[rgb(var(--admin-expense-500))] font-medium">
              {isAuth
                ? "Sessão de admin expirada ou em falta."
                : "Não foi possível carregar contactos."}
            </p>
            {(e.status || e.code) && (
              <p className="text-eyebrow-sm text-admin-text-tertiary">
                {e.status ? `HTTP ${e.status}` : ""}
                {e.status && e.code ? " · " : ""}
                {e.code ?? ""}
              </p>
            )}
            {isAuth ? (
              <Link
                to="/admin"
                className="inline-flex items-center px-3 py-1.5 text-[13px] font-medium rounded-md bg-[rgb(var(--admin-info-500))] text-white hover:opacity-90 transition-opacity"
              >
                Iniciar sessão
              </Link>
            ) : (
              <button
                type="button"
                onClick={() =>
                  queryClient.invalidateQueries({ queryKey: ["admin", "leads"] })
                }
                className="inline-flex items-center px-3 py-1.5 text-[13px] font-medium rounded-md border border-[var(--color-admin-border)] text-admin-text-primary hover:bg-admin-surface-muted transition-colors"
              >
                Tentar de novo
              </button>
            )}
          </div>
        );
      })()}

      {!isLoading && !error && (
        <Tabs value={view} onValueChange={setView} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
            <TabsTrigger value="tabela">Tabela</TabsTrigger>
            <TabsTrigger value="diagnostico">Diagnóstico</TabsTrigger>
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

          <TabsContent value="diagnostico" className="mt-0">
            <OrphanAccountsPanel />
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