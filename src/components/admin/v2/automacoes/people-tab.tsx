/**
 * PeopleTab — leads agrupados por fase do ciclo de vida.
 *
 * Read-only. Reusa `/api/admin/leads-kanban`. Mostra até 5 leads por fase
 * com link para `LeadDetailSheet` (`/admin/beta-leads?lead=<id>`).
 */

import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { AdminCard } from "../admin-card";
import {
  KANBAN_COLUMNS,
  type EnrichedLead,
} from "@/lib/admin/kanban-columns";
import { adminFetch } from "@/lib/admin/fetch";

const MAX_PER_STAGE = 5;

async function fetchLeads(): Promise<EnrichedLead[]> {
  const res = await adminFetch("/api/admin/leads-kanban");
  if (!res.ok) throw new Error("Falha ao carregar leads");
  const json = await res.json();
  return json.leads ?? [];
}

export function PeopleTab() {
  const { data: leads = [], isLoading, error } = useQuery({
    queryKey: ["admin", "beta-leads"],
    queryFn: fetchLeads,
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <AdminCard>
        <p className="text-[13px] text-admin-text-tertiary">A carregar leads…</p>
      </AdminCard>
    );
  }

  if (error) {
    return (
      <AdminCard>
        <p className="text-[13px] text-admin-danger-500">
          Não foi possível carregar leads. Verifica a sessão de admin.
        </p>
      </AdminCard>
    );
  }

  const byStatus = new Map<string, EnrichedLead[]>();
  for (const l of leads) {
    const k = l.commercial_status ?? "novo_pedido";
    const arr = byStatus.get(k) ?? [];
    arr.push(l);
    byStatus.set(k, arr);
  }

  const visibleColumns = KANBAN_COLUMNS.filter((c) => c.key !== "arquivado");

  return (
    <div className="flex flex-col gap-3">
      {visibleColumns.map((col) => {
        const items = byStatus.get(col.key) ?? [];
        const shown = items.slice(0, MAX_PER_STAGE);
        return (
          <AdminCard key={col.key}>
            <header className="mb-3 flex items-center gap-2">
              <span
                aria-hidden
                className="h-2 w-2 rounded-full"
                style={{ background: col.color }}
              />
              <h3 className="m-0 text-[13px] font-semibold text-admin-text-primary">
                {col.label}
              </h3>
              <span className="text-[11px] text-admin-text-tertiary">
                · {items.length}
              </span>
            </header>
            {shown.length === 0 ? (
              <p className="text-[12px] text-admin-text-tertiary">
                Sem leads nesta fase.
              </p>
            ) : (
              <ul className="flex flex-col">
                {shown.map((l) => (
                  <li
                    key={l.id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t py-2 first:border-t-0 first:pt-0"
                    style={{ borderColor: "rgb(var(--admin-border-default))" }}
                  >
                    <span className="text-[13px] font-medium text-admin-text-primary">
                      {l.name || "(sem nome)"}
                    </span>
                    <span className="text-[12px] text-admin-text-secondary truncate">
                      {l.email}
                    </span>
                    {l.handle && (
                      <span className="text-[12px] text-admin-text-tertiary">
                        @{l.handle}
                      </span>
                    )}
                    <span className="ml-auto text-[11px] text-admin-text-tertiary">
                      {formatRelative(l.last_interaction)}
                    </span>
                    <Link
                      to="/admin/beta-leads"
                      search={{ lead: l.id }}
                      className="text-[11px] font-medium text-admin-text-secondary hover:text-admin-text-primary hover:underline"
                    >
                      Abrir →
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {items.length > MAX_PER_STAGE && (
              <p className="mt-2 text-[11px] text-admin-text-tertiary">
                + {items.length - MAX_PER_STAGE} outros · ver todos em{" "}
                <Link
                  to="/admin/beta-leads"
                  className="underline hover:text-admin-text-primary"
                >
                  Beta Leads
                </Link>
                .
              </p>
            )}
          </AdminCard>
        );
      })}
    </div>
  );
}

function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diff) || diff < 0) return "agora";
  const m = Math.floor(diff / 60000);
  if (m < 1) return "há instantes";
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d}d`;
}