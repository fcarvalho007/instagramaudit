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

  return (
    <AdminAuthShell onLogoutReady={(handler) => setLogout(() => handler)}>
      <div className="admin-v2 min-h-screen">
        <main
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            padding: "1.75rem",
          }}
        >
          <div className="flex justify-end mb-2">
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
          <Outlet />
        </main>
        <Toaster />
      </div>
    </AdminAuthShell>
  );
}
