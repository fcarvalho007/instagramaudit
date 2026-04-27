/**
 * /admin/receita — tab Receita do admin v2.
 *
 * 5 secções: métricas → waterfall → planos → cohort → faturas.
 * Header tem selector de período + Exportar CSV (acções mock).
 */

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

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

export const Route = createFileRoute("/admin/receita")({
  component: ReceitaPage,
});

function ReceitaPage() {
  const [period, setPeriod] = useState<AdminPeriod>("30d");

  return (
    <>
      <AdminPageHeader
        title="Receita"
        subtitle="Subscrições, avulso, cohorts e projecções"
        actions={
          <>
            <PeriodSelect value={period} onChange={setPeriod} />
            <ExportCsvButton
              onExport={() => {
                // Mock por agora — endpoint CSV virá numa próxima iteração.
                // eslint-disable-next-line no-console
                console.info("[admin/receita] export CSV", { period });
              }}
            />
          </>
        }
      />
      <div className="flex flex-col gap-7">
        <MetricsSection />
        <WaterfallSection />
        <PlansSection />
        <CohortSection />
        <InvoicesSection />
      </div>
    </>
  );
}