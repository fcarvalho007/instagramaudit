import { createFileRoute } from "@tanstack/react-router";
import { StubTab } from "@/components/admin/v2/stub-tab";

export const Route = createFileRoute("/admin/receita")({
  component: () => (
    <StubTab
      title="Receita"
      subtitle="MRR, avulso, evolução · breakdown completo a chegar."
    />
  ),
});