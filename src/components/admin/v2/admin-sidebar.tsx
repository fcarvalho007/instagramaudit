/**
 * AdminSidebar — fixed left navigation for /admin (light, Iconosquare-aligned).
 *
 * 12 routes grouped in 5 eyebrow sections (Negócio, Pipeline, Produto,
 * Laboratório, Sistema). Active state via TanStack Link `activeProps`.
 * Mobile: off-canvas drawer triggered by hamburger.
 */

import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Receipt,
  Columns,
  Table as TableIcon,
  Zap,
  FileText,
  AtSign,
  BookOpen,
  FlaskConical,
  MailCheck,
  Settings,
  BarChart2,
  LineChart,
  LogOut,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DemoModeSwitch } from "@/components/admin/v2/demo-mode-switch";

interface NavItem {
  to:
    | "/admin/visao-geral"
    | "/admin/receita"
    | "/admin/leads"
    | "/admin/automacoes"
    | "/admin/relatorios"
    | "/admin/perfis"
    | "/admin/conhecimento"
    | "/admin/report-lab"
    | "/admin/email-lab"
    | "/admin/estudo-mercado"
    | "/admin/sistema";
  label: string;
  icon: typeof LayoutDashboard;
  search?: { view?: "tabela" | "pipeline"; lead?: string };
  matchView?: "tabela" | "pipeline";
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const GROUPS: NavGroup[] = [
  {
    label: "Negócio",
    items: [
      { to: "/admin/visao-geral", label: "Visão geral", icon: LayoutDashboard },
      { to: "/admin/receita", label: "Receita", icon: Receipt },
    ],
  },
  {
    label: "Contactos",
    items: [
      { to: "/admin/leads", label: "Pipeline", icon: Columns },
      {
        to: "/admin/leads",
        label: "Tabela",
        icon: TableIcon,
        search: { view: "tabela" },
        matchView: "tabela",
      },
    ],
  },
  {
    label: "Produto",
    items: [
      { to: "/admin/relatorios", label: "Relatórios", icon: FileText },
      { to: "/admin/perfis", label: "Perfis", icon: AtSign },
      { to: "/admin/conhecimento", label: "Conhecimento", icon: BookOpen },
    ],
  },
  {
    label: "Laboratório",
    items: [
      { to: "/admin/report-lab", label: "Report Lab", icon: FlaskConical },
      { to: "/admin/automacoes", label: "Automações", icon: Zap },
      { to: "/admin/email-lab", label: "Templates Email + SMS", icon: MailCheck },
    ],
  },
  {
    label: "Estudo de mercado",
    items: [
      { to: "/admin/estudo-mercado", label: "Feedback agregado", icon: LineChart },
    ],
  },
  {
    label: "Sistema",
    items: [{ to: "/admin/sistema", label: "Sistema", icon: Settings }],
  },
];

const ITEM_BASE =
  "flex items-center gap-2.5 pl-[10px] pr-3 py-2.5 md:py-2 rounded-lg text-[15px] md:text-[13px] no-underline transition-colors duration-150 border-l-2 border-transparent text-[rgb(var(--admin-sidebar-item-text))] hover:bg-[rgb(var(--admin-sidebar-item-bg-hover))] hover:text-[rgb(var(--admin-sidebar-item-text-hover))]";

const ITEM_ACTIVE =
  "flex items-center gap-2.5 pl-[10px] pr-3 py-2.5 md:py-2 rounded-lg text-[15px] md:text-[13px] no-underline transition-colors duration-150 border-l-2 bg-[rgb(var(--admin-sidebar-item-bg-active))] text-[rgb(var(--admin-sidebar-item-text-active))] font-medium border-[rgb(var(--admin-sidebar-item-active-outline))] shadow-[0_0_0_1px_var(--admin-sidebar-item-active-halo)]";

interface SidebarBodyProps {
  logout: (() => Promise<void>) | null;
  onNavigate?: () => void;
}

function SidebarBody({ logout, onNavigate }: SidebarBodyProps) {
  const currentSearch = useRouterState({
    select: (s) => s.location.search as { view?: string },
  });
  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="flex flex-col h-full py-4 px-3">
      {/* Brand */}
      <div
        className="flex items-center gap-2 px-3 pb-3 mb-2"
        style={{ borderBottom: "1px solid rgb(var(--admin-sidebar-border) / 0.08)" }}
      >
        <BarChart2 size={20} className="text-[rgb(var(--admin-info-500))]" />
        <span className="text-[16px] md:text-[14px] font-semibold text-[rgb(var(--admin-neutral-900))]">
          InstaBench
        </span>
      </div>

      {/* Nav */}
      <nav aria-label="Secções do admin" className="flex-1 overflow-y-auto">
        {GROUPS.map((group, idx) => (
          <div
            key={group.label}
            className={
              idx === 0
                ? "mb-5 last:mb-0"
                : "mb-5 last:mb-0 pt-4 mt-1 border-t border-[var(--admin-sidebar-group-divider)]"
            }
          >
            <p
              className="text-[12px] md:text-[10px] font-semibold uppercase tracking-[0.14em] px-3 mb-1.5 select-none text-[rgb(var(--admin-sidebar-eyebrow))]"
            >
              {group.label}
            </p>
            <ul className="m-0 list-none p-0 space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                // For routes shared by multiple sidebar items (same `to`),
                // disambiguate active state by the `view` search param.
                const isOnPath = currentPath === item.to;
                const currentView = currentSearch?.view;
                let isActive = false;
                if (isOnPath) {
                  if (item.matchView) {
                    isActive = currentView === item.matchView;
                  } else if (item.to === "/admin/leads") {
                    // Pipeline = default (no view param or "pipeline")
                    isActive = !currentView || currentView === "pipeline";
                  } else {
                    isActive = true;
                  }
                }
                return (
                  <li key={`${item.to}-${item.label}`}>
                    <Link
                      to={item.to}
                      search={item.search ?? {}}
                      onClick={onNavigate}
                      className={isActive ? ITEM_ACTIVE : ITEM_BASE}
                    >
                      {() => (
                        <>
                          <Icon
                            size={16}
                            className={
                              isActive
                                ? "text-[rgb(var(--admin-sidebar-item-text-active))]"
                                : "text-[rgb(var(--admin-sidebar-item-icon))]"
                            }
                          />
                          <span>{item.label}</span>
                        </>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div
        className="pt-3 mt-2 space-y-2"
        style={{ borderTop: "1px solid rgb(var(--admin-sidebar-border) / 0.08)" }}
      >
        <div className="px-1">
          <DemoModeSwitch />
        </div>
        {logout && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => logout()}
            className="w-full justify-start gap-2 px-3 text-[13px] text-admin-text-secondary hover:text-admin-text-primary"
          >
            <LogOut size={15} />
            Terminar sessão
          </Button>
        )}
      </div>
    </div>
  );
}

interface AdminSidebarProps {
  logout: (() => Promise<void>) | null;
}

export function AdminSidebar({ logout }: AdminSidebarProps) {
  const [open, setOpen] = useState(false);

  // Close drawer on ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Listen for topbar hamburger trigger
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("admin:sidebar-open", onOpen);
    return () => window.removeEventListener("admin:sidebar-open", onOpen);
  }, []);

  return (
    <>
      {/* Desktop: fixed sidebar */}
      <aside
        className="hidden md:flex fixed left-0 top-0 h-screen z-40 flex-col"
        style={{
          width: "var(--admin-sidebar-width)",
          background: "rgb(var(--admin-sidebar-bg))",
          borderRight: "1px solid rgb(var(--admin-sidebar-border) / 0.08)",
        }}
      >
        <SidebarBody logout={logout} />
      </aside>

      {/* Mobile: drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0"
            style={{ background: "rgba(15,27,61,0.45)" }}
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Navegação do admin"
            className="absolute left-0 top-0 h-screen flex flex-col"
            style={{
              width: "var(--admin-sidebar-width)",
              background: "rgb(var(--admin-sidebar-bg))",
              borderRight: "1px solid rgb(var(--admin-sidebar-border) / 0.08)",
            }}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fechar menu"
              className="absolute top-3 right-3 p-1.5 rounded-md text-[rgb(var(--admin-neutral-600))] hover:text-[rgb(var(--admin-neutral-900))]"
            >
              <X size={18} />
            </button>
            <SidebarBody logout={logout} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
