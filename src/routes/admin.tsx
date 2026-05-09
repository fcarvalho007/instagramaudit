/**
 * /admin — layout do admin v2.
 *
 * Antes era uma página única (cockpit). Agora é um layout com gate de auth +
 * cabeçalho global + nav de tabs + `<Outlet/>` para sub-rotas (visao-geral,
 * receita, clientes, relatorios, perfis, sistema). O cockpit legado vive em
 * `/admin/sistema/cockpit-legado`.
 *
 * Acesso via Google Sign-in (Lovable Cloud) com allowlist de emails.
 */

import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AdminAuthShell } from "@/components/admin/v2/admin-auth-shell";
import { Toaster } from "@/components/ui/sonner";
import { AdminTabsNav } from "@/components/admin/v2/admin-tabs-nav";
import { DemoModeSwitch } from "@/components/admin/v2/demo-mode-switch";
import { AdminCommandPalette } from "@/components/admin/v2/admin-command-palette";
import { useDemoMode } from "@/lib/admin/demo-mode";
 import { useQuery } from "@tanstack/react-query";
 import { getExecutionMode } from "@/server/admin/execution-mode.functions";

// Side-effect import: garante que os tokens v2 estão disponíveis em todas as
// sub-rotas sem tocar em `src/styles.css` (locked).
import "@/styles/admin-tokens.css";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
  head: () => ({
    meta: [
      { title: "Admin · InstaBench" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function AdminLayout() {
  const [logout, setLogout] = useState<(() => Promise<void>) | null>(null);
  const { enabled: demoOn } = useDemoMode();

  return (
    <AdminAuthShell onLogoutReady={(handler) => setLogout(() => handler)}>
      <div
        className="admin-v2 min-h-screen overflow-x-hidden"
        data-demo={demoOn ? "on" : "off"}
      >
        <main className="mx-auto w-full max-w-[1280px] px-3 py-4 sm:px-5 sm:py-5 md:px-7 md:py-7">
          <div className="mb-2 flex flex-wrap items-center justify-end gap-2">
             <ExecutionModeBadge />
            <DemoModeSwitch />
            {logout && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => logout()}
                className="text-xs text-admin-text-secondary hover:text-admin-text-primary"
              >
                Terminar sessão
              </Button>
            )}
          </div>
          <AdminTabsNav />
          {demoOn ? (
            <details
              className="group mb-4 mt-2 rounded-md border px-3 py-2 text-[11px]"
              style={{
                borderColor: "rgba(6,182,212,0.35)",
                background: "rgba(6,182,212,0.06)",
                color: "rgb(8 145 178)",
              }}
            >
              <summary className="flex cursor-pointer items-center justify-between gap-2 list-none [&::-webkit-details-marker]:hidden">
                <span>
                  <strong className="font-medium">Modo demonstração ativo</strong>
                  <span className="hidden sm:inline"> — Receita, Clientes e Pipeline mostram dados fictícios.</span>
                </span>
                <span className="shrink-0 text-[10px] opacity-70 group-open:hidden">Ver impacto</span>
                <span className="hidden shrink-0 text-[10px] opacity-70 group-open:inline">Fechar</span>
              </summary>
              <p className="mt-2 leading-relaxed">
                Secções sem integração real (Receita, Clientes, Pipeline) mostram dados
                fictícios para visualizar o layout. Despesa, perfis analisados e métricas
                operacionais continuam reais.
              </p>
            </details>
          ) : null}
          <Outlet />
        </main>
        <AdminCommandPalette />
        <Toaster />
      </div>
    </AdminAuthShell>
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
       className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
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
       {isCacheOnly ? "Cache-only · sem custos" : "Fresh · APIs pagas ativas"}
     </span>
   );
 }
