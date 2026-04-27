/**
 * AdminTabsNav — navegação principal das 6 tabs do admin v2.
 *
 * Mono: o sublinhado da tab activa é sempre `text-primary`, sem cores
 * temáticas (a cor temática vive dentro da tab, na barra do
 * `AdminSectionHeader`). Reduz ruído visual e foco no que importa.
 */

import { Link } from "@tanstack/react-router";

interface TabDef {
  to:
    | "/admin/visao-geral"
    | "/admin/receita"
    | "/admin/clientes"
    | "/admin/relatorios"
    | "/admin/perfis"
    | "/admin/sistema";
  label: string;
}

const TABS: TabDef[] = [
  { to: "/admin/visao-geral", label: "Visão geral" },
  { to: "/admin/receita", label: "Receita" },
  { to: "/admin/clientes", label: "Clientes" },
  { to: "/admin/relatorios", label: "Relatórios" },
  { to: "/admin/perfis", label: "Perfis" },
  { to: "/admin/sistema", label: "Sistema" },
];

const TAB_BASE =
  "inline-block py-2.5 text-[13px] no-underline transition-colors hover:text-admin-text-primary -mb-px border-b-2 border-transparent";

export function AdminTabsNav() {
  return (
    <nav
      aria-label="Secções do admin"
      className="mb-7 border-b border-admin-border"
    >
      <ul className="m-0 flex flex-wrap gap-6 list-none p-0">
        {TABS.map((tab) => (
          <li key={tab.to}>
            <Link
              to={tab.to}
              className={`${TAB_BASE} text-admin-text-secondary`}
              activeProps={{
                className: `${TAB_BASE} font-medium text-admin-text-primary !border-admin-text-primary`,
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