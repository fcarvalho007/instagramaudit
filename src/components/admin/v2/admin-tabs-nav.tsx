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
  "inline-block no-underline transition-colors hover:text-admin-text-primary -mb-px border-b-2 border-transparent";

const TAB_STYLE: React.CSSProperties = {
  padding: "12px 0",
  fontSize: 13,
  fontWeight: 400,
};

const TAB_ACTIVE_STYLE: React.CSSProperties = {
  ...TAB_STYLE,
  fontWeight: 500,
};

export function AdminTabsNav() {
  return (
    <nav
      aria-label="Secções do admin"
      className="border-b border-admin-border"
      style={{ marginBottom: 28 }}
    >
      <ul className="m-0 flex flex-wrap list-none p-0" style={{ gap: 28 }}>
        {TABS.map((tab) => (
          <li key={tab.to}>
            <Link
              to={tab.to}
              className={`${TAB_BASE} text-admin-text-secondary`}
              style={TAB_STYLE}
              activeProps={{
                className: `${TAB_BASE} text-admin-text-primary !border-admin-text-primary`,
                style: TAB_ACTIVE_STYLE,
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