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
      <div
        style={{
          padding: "1.5rem",
          border: "0.5px solid rgb(var(--admin-neutral-100))",
          borderRadius: 12,
          backgroundColor: "#ffffff",
        }}
      >
        <CockpitShell />
      </div>
    </>
  );
}