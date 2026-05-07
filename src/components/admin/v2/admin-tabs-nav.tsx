/**
 * AdminTabsNav — glassmorphism pill navigation for admin v2.
 *
 * Frosted-glass pills with backdrop-blur. Active tab gets solid white
 * with stronger shadow. Hover lifts brightness.
 */

import { Link } from "@tanstack/react-router";

interface TabDef {
  to:
    | "/admin/visao-geral"
    | "/admin/receita"
    | "/admin/clientes"
    | "/admin/beta-leads"
    | "/admin/beta-requests"
    | "/admin/relatorios"
    | "/admin/perfis"
    | "/admin/conhecimento"
    | "/admin/sistema"
    | "/admin/report-lab";
  label: string;
}

const TABS: TabDef[] = [
  { to: "/admin/visao-geral", label: "Visão geral" },
  { to: "/admin/receita", label: "Receita e despesas" },
  { to: "/admin/clientes", label: "Clientes" },
  { to: "/admin/beta-leads", label: "Beta Leads" },
  { to: "/admin/beta-requests", label: "Beta Requests" },
  { to: "/admin/relatorios", label: "Relatórios" },
  { to: "/admin/perfis", label: "Perfis" },
  { to: "/admin/conhecimento", label: "Conhecimento" },
  { to: "/admin/sistema", label: "Sistema" },
  { to: "/admin/report-lab", label: "Report Lab" },
];

const TAB_INACTIVE =
  "inline-flex items-center px-4 py-2 rounded-xl text-[13px] no-underline transition-all duration-200 backdrop-blur-md bg-white/45 border border-white/50 text-admin-text-secondary hover:bg-white/70 hover:text-admin-text-primary hover:shadow-[var(--shadow-admin-glass)]";

const TAB_ACTIVE =
  "inline-flex items-center px-4 py-2 rounded-xl text-[13px] no-underline transition-all duration-200 backdrop-blur-md bg-white/90 border border-white/70 text-admin-text-primary font-medium shadow-[var(--shadow-admin-glass-active)]";

export function AdminTabsNav() {
  return (
    <nav
      aria-label="Secções do admin"
      className="mb-7 -mx-2 px-2 py-2 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30"
    >
      <ul className="m-0 flex flex-wrap gap-1.5 list-none p-0">
        {TABS.map((tab) => (
          <li key={tab.to}>
            <Link
              to={tab.to}
              className={TAB_INACTIVE}
              activeProps={{
                className: TAB_ACTIVE,
              }}
            >
              {tab.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}