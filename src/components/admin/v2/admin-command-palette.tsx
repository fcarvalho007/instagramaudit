/**
 * AdminCommandPalette — pesquisa rápida de leads beta + atalhos para páginas
 * principais do admin, em qualquer rota /admin/*.
 *
 * Atalho ⌘K / Ctrl+K. Reutiliza a mesma query (`['admin','leads']`) que o
 * Kanban usa para evitar um endpoint dedicado. Selecionar uma lead navega para
 * `/admin/leads?lead=<id>` e a `KanbanBoard` abre a `LeadDetailSheet`.
 *
 * Grupo "Páginas" lista atalhos de navegação para as páginas principais do
 * admin (Visão geral, Receita, Pipeline/Tabela de contactos, Automações,
 * Relatórios, Perfis, Report Lab, Email Lab, Sistema). Espelha a sidebar.
 */

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Receipt,
  Columns,
  Table as TableIcon,
  Zap,
  FileText,
  AtSign,
  FlaskConical,
  MailCheck,
  Settings,
  type LucideIcon,
} from "lucide-react";
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

interface PageShortcut {
  label: string;
  to: string;
  search?: Record<string, string>;
  icon: LucideIcon;
  keywords: string;
}

const PAGE_SHORTCUTS: PageShortcut[] = [
  {
    label: "Visão geral",
    to: "/admin/visao-geral",
    icon: LayoutDashboard,
    keywords: "dashboard inicio overview kpis",
  },
  {
    label: "Receita",
    to: "/admin/receita",
    icon: Receipt,
    keywords: "receita revenue mrr faturacao financeiro",
  },
  {
    label: "Contactos · Pipeline",
    to: "/admin/leads",
    search: { view: "pipeline" },
    icon: Columns,
    keywords: "contactos crm pipeline kanban leads beta",
  },
  {
    label: "Contactos · Tabela",
    to: "/admin/leads",
    search: { view: "tabela" },
    icon: TableIcon,
    keywords: "contactos crm tabela lista leads beta",
  },
  {
    label: "Automações",
    to: "/admin/automacoes",
    icon: Zap,
    keywords: "automacoes workflows fluxos",
  },
  {
    label: "Relatórios",
    to: "/admin/relatorios",
    icon: FileText,
    keywords: "relatorios reports pdf",
  },
  {
    label: "Perfis",
    to: "/admin/perfis",
    icon: AtSign,
    keywords: "perfis instagram handles social",
  },
  {
    label: "Report Lab",
    to: "/admin/report-lab",
    icon: FlaskConical,
    keywords: "report lab preview variantes editor",
  },
  {
    label: "Templates Email + SMS",
    to: "/admin/email-lab",
    icon: MailCheck,
    keywords: "email lab templates sms mensagens",
  },
  {
    label: "Sistema",
    to: "/admin/sistema",
    icon: Settings,
    keywords: "sistema diagnosticos saude logs cockpit",
  },
];

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
    queryKey: ["admin", "leads"],
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
    navigate({ to: "/admin/leads", search: { lead: id } });
  };

  const handleNavigate = (shortcut: PageShortcut) => {
    setOpen(false);
    navigate({
      to: shortcut.to,
      search: (shortcut.search ?? {}) as never,
    });
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Pesquisar lead por nome, email, handle ou empresa..." />
      <CommandList className="max-h-[420px]">
        <CommandGroup heading="Páginas">
          {PAGE_SHORTCUTS.map((shortcut) => {
            const Icon = shortcut.icon;
            return (
              <CommandItem
                key={`${shortcut.to}:${shortcut.label}`}
                value={`${shortcut.label} ${shortcut.keywords}`}
                onSelect={() => handleNavigate(shortcut)}
                className="flex cursor-pointer items-center gap-3"
              >
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                  style={{
                    background: "rgb(var(--admin-neutral-100))",
                    color: "rgb(var(--admin-neutral-700))",
                  }}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </div>
                <span className="text-[13px] font-medium text-admin-text-primary">
                  {shortcut.label}
                </span>
              </CommandItem>
            );
          })}
        </CommandGroup>
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