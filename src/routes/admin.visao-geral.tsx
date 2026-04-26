/**
 * /admin/visao-geral — tab principal do admin v2.
 *
 * 5 secções: funil → receita → despesa → kanban → sinais.
 */

import { createFileRoute } from "@tanstack/react-router";
import { AdminPageHeader } from "@/components/admin/v2/admin-page-header";
import { FunnelSection } from "@/components/admin/v2/visao-geral/funnel-section";
import { RevenueSection } from "@/components/admin/v2/visao-geral/revenue-section";
import { ExpenseSection } from "@/components/admin/v2/visao-geral/expense-section";
import { KanbanSection } from "@/components/admin/v2/visao-geral/kanban-section";
import { IntentSection } from "@/components/admin/v2/visao-geral/intent-section";

export const Route = createFileRoute("/admin/visao-geral")({
  component: VisaoGeralPage,
});

function VisaoGeralPage() {
  return (
    <>
      <AdminPageHeader
        title="Visão geral"
        subtitle="Receita, conversão e sinais de intenção · últimos 30 dias."
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        <FunnelSection />
        <RevenueSection />
        <ExpenseSection />
        <KanbanSection />
        <IntentSection />
      </div>
    </>
  );
}