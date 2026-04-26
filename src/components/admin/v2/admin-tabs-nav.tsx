/**
 * AdminTabsNav — navegação principal das 6 tabs do admin v2.
 *
 * Cada tab é um `<Link>` TanStack com `activeProps` que aplica peso 500,
 * cor primária e sublinhado 2px na cor temática da tab. A baseline da nav
 * é uma linha 0.5px; o sublinhado activo encavala-a com `margin-bottom: -0.5px`.
 */

import { Link } from "@tanstack/react-router";
import { ACCENT_500, type AdminAccent } from "./admin-tokens";

interface TabDef {
  to: "/admin/visao-geral" | "/admin/receita" | "/admin/clientes" | "/admin/relatorios" | "/admin/perfis" | "/admin/sistema";
  label: string;
  accent: AdminAccent;
}

const TABS: TabDef[] = [
  { to: "/admin/visao-geral", label: "Visão geral", accent: "leads" },
  { to: "/admin/receita", label: "Receita", accent: "revenue" },
  { to: "/admin/clientes", label: "Clientes", accent: "leads" },
  { to: "/admin/relatorios", label: "Relatórios", accent: "signal" },
  { to: "/admin/perfis", label: "Perfis", accent: "expense" },
  { to: "/admin/sistema", label: "Sistema", accent: "neutral" },
];

export function AdminTabsNav() {
  return (
    <nav
      aria-label="Secções do admin"
      style={{
        borderBottom: "0.5px solid rgb(var(--admin-neutral-100))",
        marginBottom: 28,
      }}
    >
      <ul
        style={{
          display: "flex",
          gap: 24,
          listStyle: "none",
          padding: 0,
          margin: 0,
          flexWrap: "wrap",
        }}
      >
        {TABS.map((tab) => (
          <li key={tab.to}>
            <Link
              to={tab.to}
              style={{
                display: "inline-block",
                padding: "10px 0",
                fontSize: 13,
                color: "rgb(var(--admin-neutral-600))",
                textDecoration: "none",
                marginBottom: "-0.5px",
                borderBottom: "2px solid transparent",
                transition: "color 120ms ease",
              }}
              activeProps={{
                style: {
                  display: "inline-block",
                  padding: "10px 0",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "rgb(var(--admin-neutral-900))",
                  textDecoration: "none",
                  marginBottom: "-0.5px",
                  borderBottom: `2px solid ${ACCENT_500[tab.accent]}`,
                },
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