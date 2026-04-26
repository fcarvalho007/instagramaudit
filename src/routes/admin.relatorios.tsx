import { createFileRoute } from "@tanstack/react-router";
import { StubTab } from "@/components/admin/v2/stub-tab";

export const Route = createFileRoute("/admin/relatorios")({
  component: () => (
    <StubTab
      title="Relatórios"
      subtitle="Pedidos pagos, entregas e reprocessamentos."
    />
  ),
});