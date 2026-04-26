import { createFileRoute } from "@tanstack/react-router";
import { StubTab } from "@/components/admin/v2/stub-tab";

export const Route = createFileRoute("/admin/perfis")({
  component: () => (
    <StubTab
      title="Perfis"
      subtitle="Histórico de análises por handle e custo unitário."
    />
  ),
});