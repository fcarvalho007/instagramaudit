/**
 * /admin/sistema — stub. Inclui um link discreto para o cockpit legado
 * enquanto as outras tabs não estão implementadas.
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { StubTab } from "@/components/admin/v2/stub-tab";

export const Route = createFileRoute("/admin/sistema")({
  component: () => (
    <StubTab
      title="Sistema"
      subtitle="Diagnóstico Apify, allowlist, kill-switch e alertas."
    >
      <Link
        to="/admin/sistema/cockpit-legado"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 12,
          color: "rgb(var(--admin-info-700))",
          textDecoration: "underline",
          textUnderlineOffset: 3,
        }}
      >
        Abrir cockpit legado →
      </Link>
    </StubTab>
  ),
});