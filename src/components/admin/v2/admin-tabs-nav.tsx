/**
 * AdminTabsNav — grouped pill navigation for admin v2.
 *
 * Tabs organised into 3 functional groups with subtle separators
 * and eyebrow labels for quick scanning.
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

interface TabGroup {
  label: string;
  tabs: TabDef[];
}

const GROUPS: TabGroup[] = [
  {
    label: "Negócio",
    tabs: [
      { to: "/admin/visao-geral", label: "Visão geral" },
      { to: "/admin/receita", label: "Receita" },
      { to: "/admin/clientes", label: "Clientes" },
    ],
  },
  {
    label: "Pipeline",
    tabs: [
      { to: "/admin/beta-leads", label: "Leads" },
      { to: "/admin/beta-requests", label: "Pedidos" },
    ],
  },
  {
    label: "Produto",
    tabs: [
      { to: "/admin/relatorios", label: "Relatórios" },
      { to: "/admin/perfis", label: "Perfis" },
      { to: "/admin/conhecimento", label: "Conhecimento" },
      { to: "/admin/report-lab", label: "Report Lab" },
      { to: "/admin/sistema", label: "Sistema" },
    ],
  },
];

const TAB_INACTIVE =
  "inline-flex items-center px-3.5 py-1.5 rounded-lg text-[13px] no-underline transition-all duration-200 backdrop-blur-md bg-white/45 border border-white/50 text-admin-text-secondary hover:bg-white/70 hover:text-admin-text-primary hover:shadow-[var(--shadow-admin-glass)]";

const TAB_ACTIVE =
  "inline-flex items-center px-3.5 py-1.5 rounded-lg text-[13px] no-underline transition-all duration-200 backdrop-blur-md bg-white/90 border border-white/70 text-admin-text-primary font-medium shadow-[var(--shadow-admin-glass-active)]";

export function AdminTabsNav() {
  return (
    <nav
      aria-label="Secções do admin"
      className="mb-5 sm:mb-7 -mx-1 sm:-mx-2 rounded-2xl border border-white/30 bg-white/20 px-2 py-2 sm:px-3 sm:py-2.5 backdrop-blur-sm"
    >
      {/* Mobile: faixa única com scroll horizontal. Desktop (sm+): grupos com separadores. */}
      <div className="flex items-end gap-1 overflow-x-auto sm:flex-wrap sm:overflow-visible [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {GROUPS.map((group, gi) => (
          <div key={group.label} className="flex shrink-0 items-end sm:shrink">
            {/* Group */}
            <div className="flex flex-col gap-1.5 px-0.5 sm:px-1">
              <span className="hidden sm:block text-[10px] font-medium uppercase tracking-[0.14em] text-admin-text-tertiary pl-1 select-none">
                {group.label}
              </span>
              <ul className="m-0 flex shrink-0 list-none gap-1 p-0 sm:flex-wrap">
                {group.tabs.map((tab) => (
                  <li key={tab.to} className="shrink-0">
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
            </div>
            {/* Separator between groups */}
            {gi < GROUPS.length - 1 && (
              <div
                className="hidden sm:block self-stretch mx-2 my-1"
                style={{
                  width: 1,
                  background:
                    "linear-gradient(to bottom, transparent 10%, rgb(var(--admin-border-rgb) / 0.14) 50%, transparent 90%)",
                }}
              />
            )}
          </div>
        ))}
      </div>
    </nav>
  );
}