/**
 * /admin/sistema/cockpit-legado — preserva o cockpit operacional original
 * (Diagnóstico, Análises, Perfis, Custos, Alertas, Pedidos, Relatórios)
 * enquanto as novas tabs não estão prontas.
 */

import { createFileRoute } from "@tanstack/react-router";
import { CockpitShell } from "@/components/admin/cockpit/cockpit-shell";
import { AdminPageHeader } from "@/components/admin/v2/admin-page-header";

export const Route = createFileRoute("/admin/sistema/cockpit-legado")({
  component: LegacyCockpit,
});

function LegacyCockpit() {
  return (
    <>
      <AdminPageHeader
        title="Cockpit legado"
        subtitle="Vista operacional original · será reorganizada pelas novas tabs."
      />
      <div className="admin-cockpit-legacy rounded-xl border border-admin-border bg-admin-surface p-6">
        <CockpitShell />
      </div>
    </>
  );
}