/**
 * /admin/visao-geral — tab principal do admin v2.
 *
 * 5 secções: funil → receita → despesa → kanban → sinais.
 */

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AdminPageHeader } from "@/components/admin/v2/admin-page-header";
import { PeriodSelect, type AdminPeriod } from "@/components/admin/v2/period-select";
import { AdminActionButton } from "@/components/admin/v2/admin-action-button";
import { FunnelSection } from "@/components/admin/v2/visao-geral/funnel-section";
import { RevenueSection } from "@/components/admin/v2/visao-geral/revenue-section";
import { ExpenseSection } from "@/components/admin/v2/visao-geral/expense-section";
import { KanbanSection } from "@/components/admin/v2/visao-geral/kanban-section";
import { IntentSection } from "@/components/admin/v2/visao-geral/intent-section";

export const Route = createFileRoute("/admin/visao-geral")({
  component: VisaoGeralPage,
});

function VisaoGeralPage() {
  const [period, setPeriod] = useState<AdminPeriod>("30d");
  return (
    <>
      <AdminPageHeader
        title="Visão geral"
        subtitle="Receita, conversão e sinais de intenção dos últimos 30 dias"
        actions={
          <>
            <PeriodSelect value={period} onChange={setPeriod} />
            <AdminActionButton>↻ Atualizar</AdminActionButton>
          </>
        }
      />
      <div className="flex flex-col gap-14">
        <FunnelSection />
        <RevenueSection />
        <ExpenseSection />
        <KanbanSection />
        <IntentSection />
      </div>
    </>
  );
}