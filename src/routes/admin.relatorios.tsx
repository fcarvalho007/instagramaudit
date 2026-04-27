/**
 * /admin/relatorios — tab Relatórios do admin v2.
 *
 * Unifica o que vivia no cockpit legado em "Análises" + "Pedidos" num
 * pipeline operacional (Pedido → Análise Apify → PDF → Email) com 4 secções:
 *   1. Pipeline operacional (4 fases + agregados)
 *   2. Métricas operacionais (4 KPIs com tooltip)
 *   3. Volume e timing diário (BarChart empilhado + LineChart com SLA)
 *   4. Tabela de relatórios (com filtros pill e acções por linha)
 */

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { AdminPageHeader } from "@/components/admin/v2/admin-page-header";
import {
  PeriodSelect,
  ExportCsvButton,
  type AdminPeriod,
} from "@/components/admin/v2/period-select";
import { PipelineSection } from "@/components/admin/v2/relatorios/pipeline-section";
import { MetricsSection } from "@/components/admin/v2/relatorios/metrics-section";
import { ChartsSection } from "@/components/admin/v2/relatorios/charts-section";
import { ReportsTableSection } from "@/components/admin/v2/relatorios/reports-table-section";

export const Route = createFileRoute("/admin/relatorios")({
  component: RelatoriosPage,
});

function RelatoriosPage() {
  const [period, setPeriod] = useState<AdminPeriod>("30d");

  return (
    <>
      <AdminPageHeader
        title="Relatórios"
        subtitle="Pipeline operacional desde o pedido até à entrega"
        actions={
          <>
            <PeriodSelect value={period} onChange={setPeriod} />
            <ExportCsvButton
              onExport={() => {
                // Mock por agora — endpoint CSV virá numa próxima iteração.
                // eslint-disable-next-line no-console
                console.info("[admin/relatorios] export CSV", { period });
              }}
            />
          </>
        }
      />
      <div className="flex flex-col gap-7">
        <PipelineSection />
        <MetricsSection />
        <ChartsSection />
        <ReportsTableSection />
      </div>
    </>
  );
}