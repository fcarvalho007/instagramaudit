/**
 * AdminCommandPalette — pesquisa rápida de leads beta em qualquer rota /admin/*.
 *
 * Atalho ⌘K / Ctrl+K. Reutiliza a mesma query (`['admin','beta-leads']`) que o
 * Kanban usa para evitar um endpoint dedicado. Selecionar uma lead navega para
 * `/admin/beta-leads?lead=<id>` e a `KanbanBoard` abre a `LeadDetailSheet`.
 */

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import type { EnrichedLead } from "@/lib/admin/kanban-columns";
import { getLifecycleMeta } from "@/lib/admin/lead-lifecycle";
import { adminFetch } from "@/lib/admin/fetch";

async function fetchLeads(): Promise<EnrichedLead[]> {
  const res = await adminFetch("/api/admin/leads-kanban");
  if (!res.ok) throw new Error("Falha ao carregar leads");
  const json = await res.json();
  return (json.leads ?? []) as EnrichedLead[];
}

export function AdminCommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  // Atalho global ⌘K / Ctrl+K
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const { data: leads = [], isLoading, error } = useQuery({
    queryKey: ["admin", "beta-leads"],
    queryFn: fetchLeads,
    enabled: open,
    staleTime: 30_000,
  });

  const sortedLeads = useMemo(() => {
    return [...leads]
      .sort(
        (a, b) =>
          new Date(b.last_interaction).getTime() -
          new Date(a.last_interaction).getTime(),
      )
      .slice(0, 50);
  }, [leads]);

  const handleSelect = (id: string) => {
    setOpen(false);
    navigate({ to: "/admin/beta-leads", search: { lead: id } });
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Pesquisar lead por nome, email, handle ou empresa..." />
      <CommandList className="max-h-[420px]">
        {isLoading ? (
          <div className="px-4 py-8 text-center text-[12px] text-admin-text-tertiary">
            A carregar leads...
          </div>
        ) : error ? (
          <div className="px-4 py-8 text-center text-[12px] text-admin-text-tertiary">
            Não foi possível carregar a lista de leads.
          </div>
        ) : (
          <>
            <CommandEmpty>Nenhuma lead encontrada.</CommandEmpty>
            {sortedLeads.length > 0 && (
              <CommandGroup heading={`${sortedLeads.length} leads recentes`}>
                {sortedLeads.map((lead) => {
                  const meta = getLifecycleMeta(lead.commercial_status);
                  const initial = (lead.name || lead.email || "?")
                    .trim()
                    .charAt(0)
                    .toUpperCase();
                  const value = [
                    lead.name,
                    lead.email,
                    lead.handle,
                    lead.company,
                    meta.label,
                  ]
                    .filter(Boolean)
                    .join(" ");
                  return (
                    <CommandItem
                      key={lead.id}
                      value={`${value} ${lead.id}`}
                      onSelect={() => handleSelect(lead.id)}
                      className="flex cursor-pointer items-center gap-3"
                    >
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold"
                        style={{
                          background: "rgb(var(--admin-neutral-100))",
                          color: "rgb(var(--admin-neutral-700))",
                        }}
                      >
                        {initial}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-[13px] font-semibold text-admin-text-primary">
                            {lead.name || lead.email}
                          </span>
                          <span
                            className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                            style={{
                              background: `${meta.color}1A`,
                              color: meta.color,
                            }}
                          >
                            {meta.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-admin-text-tertiary">
                          <span className="truncate">{lead.email}</span>
                          {lead.handle && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="truncate">@{lead.handle}</span>
                            </>
                          )}
                          {lead.company && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="truncate">{lead.company}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </>
        )}
      </CommandList>
      <div className="flex items-center gap-2 border-t px-3 py-2 text-[11px] text-admin-text-tertiary">
        <kbd className="admin-code rounded border px-1.5 py-0.5 text-[10px]">
          ⌘K
        </kbd>
        <span>abrir ·</span>
        <kbd className="admin-code rounded border px-1.5 py-0.5 text-[10px]">
          ↑↓
        </kbd>
        <span>navegar ·</span>
        <kbd className="admin-code rounded border px-1.5 py-0.5 text-[10px]">
          ↵
        </kbd>
        <span>abrir ficha ·</span>
        <kbd className="admin-code rounded border px-1.5 py-0.5 text-[10px]">
          ESC
        </kbd>
        <span>fechar</span>
      </div>
    </CommandDialog>
  );
}