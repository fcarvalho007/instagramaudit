/**
 * /admin/receita — tab Receita do admin v2.
 *
 * 5 secções: métricas → waterfall → planos → cohort → faturas.
 * Header tem selector de período + Exportar CSV (acções mock).
 */

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { AdminPageHeader } from "@/components/admin/v2/admin-page-header";
import {
  PeriodSelect,
  ExportCsvButton,
  type AdminPeriod,
} from "@/components/admin/v2/period-select";
import { MetricsSection } from "@/components/admin/v2/receita/metrics-section";
import { WaterfallSection } from "@/components/admin/v2/receita/waterfall-section";
import { PlansSection } from "@/components/admin/v2/receita/plans-section";
import { CohortSection } from "@/components/admin/v2/receita/cohort-section";
import { InvoicesSection } from "@/components/admin/v2/receita/invoices-section";
import { ExpenseSection } from "@/components/admin/v2/visao-geral/expense-section";

export const Route = createFileRoute("/admin/receita")({
  component: ReceitaPage,
});

function ReceitaPage() {
  const [period, setPeriod] = useState<AdminPeriod>("30d");

  return (
    <>
      <AdminPageHeader
        title="Receita e despesas"
        subtitle="Subscrições, avulso e custos reais por fornecedor (Apify, OpenAI, DataForSEO)"
        actions={
          <>
            <PeriodSelect value={period} onChange={setPeriod} />
            <ExportCsvButton
              onExport={() => {
                toast.info("Exportação CSV ainda não disponível — em breve.");
              }}
            />
          </>
        }
      />
      <div className="flex flex-col gap-14">
        <MetricsSection />
        <WaterfallSection />
        <ExpenseSection />
        <PlansSection />
        <CohortSection />
        <InvoicesSection />
      </div>
    </>
  );
}