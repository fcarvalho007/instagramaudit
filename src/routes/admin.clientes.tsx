import { createFileRoute } from "@tanstack/react-router";
import { StubTab } from "@/components/admin/v2/stub-tab";

export const Route = createFileRoute("/admin/clientes")({
  component: () => (
    <StubTab
      title="Clientes"
      subtitle="Pipeline, segmentos e LTV · em construção."
    />
  ),
});