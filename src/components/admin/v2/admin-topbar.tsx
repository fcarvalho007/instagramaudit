/**
 * AdminTopbar — barra superior fixa do cockpit `/admin`.
 *
 * Substitui o badge `ExecutionMode` flutuante e o hamburger isolado, juntando
 * num único componente:
 *   - hamburger (mobile) que dispara `admin:sidebar-open`
 *   - título da página derivado do pathname
 *   - trigger do command palette (⌘K)
 *   - badge do modo de execução (cache-only / fresh)
 *
 * Renderizado uma vez em `src/routes/admin.tsx`, sticky `top-0`.
 */

import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Menu, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getExecutionMode } from "@/server/admin/execution-mode.functions";

const TITLES: Record<string, string> = {
  "/admin": "Visão geral",
  "/admin/visao-geral": "Visão geral",
  "/admin/receita": "Receita",
  "/admin/leads": "Contactos",
  "/admin/beta-requests": "Pedidos de relatório",
  "/admin/automacoes": "Automações",
  "/admin/relatorios": "Relatórios",
  "/admin/perfis": "Perfis",
  "/admin/conhecimento": "Conhecimento",
  "/admin/report-lab": "Report Lab",
  "/admin/email-lab": "Email Lab",
  "/admin/sistema": "Sistema",
  "/admin/sistema/cockpit-legado": "Cockpit legado",
};

function deriveTitle(pathname: string): string {
  if (TITLES[pathname]) return TITLES[pathname];
  // Try parent for dynamic segments
  const segs = pathname.split("/").filter(Boolean);
  while (segs.length > 1) {
    segs.pop();
    const candidate = "/" + segs.join("/");
    if (TITLES[candidate]) return TITLES[candidate];
  }
  return "Admin";
}

function isMac(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPod|iPhone|iPad/.test(navigator.platform);
}

function openSidebar() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("admin:sidebar-open"));
}

function openCommandPalette() {
  if (typeof document === "undefined") return;
  document.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "k",
      bubbles: true,
      metaKey: isMac(),
      ctrlKey: !isMac(),
    }),
  );
}

function ExecutionModeBadge() {
  const { data } = useQuery({
    queryKey: ["admin", "execution-mode"],
    queryFn: () => getExecutionMode(),
    staleTime: 10_000,
  });
  const mode = data?.mode ?? "cache_only";
  const isCacheOnly = mode === "cache_only";

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] sm:text-[11px] font-medium whitespace-nowrap"
      style={{
        background: isCacheOnly
          ? "rgb(var(--admin-revenue-500) / 0.12)"
          : "rgb(var(--admin-expense-400) / 0.12)",
        color: isCacheOnly
          ? "rgb(var(--admin-revenue-400))"
          : "rgb(var(--admin-expense-400))",
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{
          background: isCacheOnly
            ? "rgb(var(--admin-revenue-400))"
            : "rgb(var(--admin-expense-400))",
        }}
      />
      <span className="hidden sm:inline">
        {isCacheOnly ? "Cache-only · sem custos" : "Fresh · APIs pagas"}
      </span>
      <span className="sm:hidden">{isCacheOnly ? "Cache" : "Fresh"}</span>
    </span>
  );
}

export function AdminTopbar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const title = deriveTitle(pathname);
  const [mac, setMac] = useState(false);
  useEffect(() => {
    setMac(isMac());
  }, []);

  return (
    <header
      className="sticky top-0 z-30 h-14 flex items-center gap-2 px-3 sm:px-5 md:pl-7 md:pr-7 md:ml-[var(--admin-sidebar-width)]"
      style={{
        background: "rgb(var(--admin-surface-base, 250 251 253))",
        borderBottom: "1px solid rgb(var(--admin-sidebar-border) / 0.10)",
        backdropFilter: "saturate(1.1) blur(4px)",
        WebkitBackdropFilter: "saturate(1.1) blur(4px)",
      }}
    >
      <button
        type="button"
        onClick={openSidebar}
        aria-label="Abrir menu"
        className="md:hidden inline-flex items-center justify-center h-11 w-11 rounded-lg border text-[rgb(var(--admin-neutral-800))]"
        style={{
          borderColor: "rgb(var(--admin-sidebar-border) / 0.12)",
          background: "rgb(var(--admin-sidebar-bg))",
        }}
      >
        <Menu size={20} />
      </button>

      <h2
        className="min-w-0 truncate text-[16px] sm:text-[14px] font-semibold text-[rgb(var(--admin-neutral-900))]"
        title={title}
      >
        {title}
      </h2>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={openCommandPalette}
          className="inline-flex items-center gap-2 rounded-md px-2.5 h-10 sm:h-8 text-[12px] text-[rgb(var(--admin-neutral-600))] hover:text-[rgb(var(--admin-neutral-900))] transition-colors"
          style={{
            background: "rgb(var(--admin-sidebar-bg))",
            border: "1px solid rgb(var(--admin-sidebar-border) / 0.12)",
          }}
          aria-label="Abrir paleta de comandos"
        >
          <Search size={14} />
          <span className="hidden sm:inline">Procurar</span>
          <kbd
            className="hidden md:inline-flex items-center justify-center h-5 px-1.5 rounded text-[10px] font-medium tabular-nums"
            style={{
              background: "rgb(var(--admin-sidebar-border) / 0.10)",
              color: "rgb(var(--admin-neutral-600))",
            }}
          >
            {mac ? "⌘K" : "Ctrl+K"}
          </kbd>
        </button>
        <ExecutionModeBadge />
      </div>
    </header>
  );
}
