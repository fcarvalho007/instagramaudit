/**
 * /admin — layout do admin v2.
 *
 * Antes era uma página única (cockpit). Agora é um layout com gate de auth +
 * cabeçalho global + nav de tabs + `<Outlet/>` para sub-rotas (visao-geral,
 * receita, clientes, relatorios, perfis, sistema). O cockpit legado vive em
 * `/admin/sistema/cockpit-legado`.
 *
 * Acesso via Google Sign-in (Lovable Cloud) com allowlist de emails.
 *
 * ============================================================================
 * ⚠️  TEMPORÁRIO — AUTH GATE DESACTIVADO PARA REFINAMENTOS VISUAIS
 * ============================================================================
 * O gate `AdminAuthShell` está comentado para permitir acesso directo ao
 * agente / equipa visual sem login Google. ANTES DE PUBLICAR, descomentar
 * o bloco marcado com "RESTAURAR AUTH" e remover o banner amarelo.
 * Pesquisar por TEMP_AUTH_BYPASS para encontrar todos os pontos a reverter.
 * ============================================================================
 */

import { createFileRoute, Outlet } from "@tanstack/react-router";
// TEMP_AUTH_BYPASS — re-importar quando restaurar:
// import { useState } from "react";
// import { Button } from "@/components/ui/button";
// import { AdminAuthShell } from "@/components/admin/v2/admin-auth-shell";
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
  // TEMP_AUTH_BYPASS — RESTAURAR AUTH:
  // const [logout, setLogout] = useState<(() => Promise<void>) | null>(null);
  // Envolver o <div className="admin-v2 ..."> abaixo em:
  //   <AdminAuthShell onLogoutReady={(handler) => setLogout(() => handler)}>
  //     ...
  //   </AdminAuthShell>
  // E restaurar o botão "Terminar sessão" que estava no header.

  return (
    <div className="admin-v2 min-h-screen">
      {/* TEMP_AUTH_BYPASS — REMOVER ESTE BANNER AO RESTAURAR AUTH */}
      <div
        role="status"
        style={{
          backgroundColor: "#FEF3C7",
          color: "#78350F",
          borderBottom: "1px solid #F59E0B",
          padding: "8px 16px",
          fontSize: 12,
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          textAlign: "center",
          letterSpacing: "0.04em",
        }}
      >
        ⚠️ MODO TEMPORÁRIO · Login do /admin desactivado para refinamentos
        visuais · NÃO PUBLICAR neste estado
      </div>
      <main
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "1.75rem",
        }}
      >
        <AdminTabsNav />
        <Outlet />
      </main>
      <Toaster />
    </div>
  );
}
