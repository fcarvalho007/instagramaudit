/**
 * /admin/clientes — redirect para /admin/beta-leads (área Contactos).
 *
 * Mantido apenas para compatibilidade com bookmarks/links antigos.
 * O CRM real vive em /admin/beta-leads (Pipeline + Tabela).
 */

import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/clientes")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/beta-leads", replace: true });
  },
});