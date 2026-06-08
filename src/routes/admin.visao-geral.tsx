/**
 * /admin/visao-geral — executive dashboard.
 *
 * Topo responde às 4 perguntas da manhã (KPIs), alerta de margem,
 * funil + custos lado a lado, operacional em baixo. Detalhe pesado
 * vive em /admin/sistema e /admin/receita.
 */

import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminPageHeader } from "@/components/admin/v2/admin-page-header";
import { PeriodSelect, type AdminPeriod } from "@/components/admin/v2/period-select";
import { AdminActionButton } from "@/components/admin/v2/admin-action-button";
import { OverviewKpiRow } from "@/components/admin/v2/visao-geral/overview-kpi-row";
import { MarginAlert } from "@/components/admin/v2/visao-geral/margin-alert";
import { AcquisitionFunnel } from "@/components/admin/v2/visao-geral/acquisition-funnel";
import { CostSummaryCard } from "@/components/admin/v2/visao-geral/cost-summary-card";
import { AnalysisWindowCard } from "@/components/admin/v2/visao-geral/analysis-window-card";
import { PriorityFollowups } from "@/components/admin/v2/visao-geral/priority-followups";
import { IntentSection } from "@/components/admin/v2/visao-geral/intent-section";
import { getExecutionMode } from "@/lib/admin/execution-mode.functions";
import { adminFetch } from "@/lib/admin/fetch";

export const Route = createFileRoute("/admin/visao-geral")({
  component: VisaoGeralPage,
});

 function ExecutionModeStrip() {
   const { data } = useQuery({
     queryKey: ["admin", "execution-mode"],
     queryFn: () => getExecutionMode(),
     staleTime: 10_000,
   });
   const { data: cacheStats } = useQuery<{ hit_rate_pct: number; cache_hits: number; analyses_total: number }>({
     queryKey: ["admin", "cache-stats"],
     queryFn: async () => {
       const res = await adminFetch("/api/admin/cache-stats?period=30d");
       if (!res.ok) throw new Error(`HTTP ${res.status}`);
       return res.json();
     },
     staleTime: 30_000,
   });
   const mode = data?.mode ?? "cache_only";
   const isCacheOnly = mode === "cache_only";
 
   return (
     <div
       className="rounded-lg border px-4 py-2.5 flex items-center justify-between gap-4 text-[12px]"
       style={{
         borderColor: isCacheOnly
           ? "rgb(var(--admin-revenue-500) / 0.3)"
           : "rgb(var(--admin-expense-400) / 0.3)",
         background: isCacheOnly
           ? "rgb(var(--admin-revenue-500) / 0.06)"
           : "rgb(var(--admin-expense-400) / 0.06)",
       }}
     >
       <div className="flex items-center gap-3 min-w-0">
         <span
           className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[12px] font-medium shrink-0"
           style={{
             background: isCacheOnly
               ? "rgb(var(--admin-revenue-500) / 0.15)"
               : "rgb(var(--admin-expense-400) / 0.15)",
             color: isCacheOnly
               ? "rgb(var(--admin-revenue-400))"
               : "rgb(var(--admin-expense-400))",
           }}
         >
           <span
             className="h-1.5 w-1.5 rounded-full"
             style={{
               background: isCacheOnly
                 ? "rgb(var(--admin-revenue-400))"
                 : "rgb(var(--admin-expense-400))",
             }}
           />
           {isCacheOnly ? "Sem custos de API" : "Pode gerar custos"}
         </span>
         <span className="text-admin-text-secondary truncate">
           {isCacheOnly
             ? "Cache-only ativo — a Visão Geral usa apenas dados em cache. Nenhuma API paga será chamada."
             : "Fresh ativo — as próximas análises podem chamar Apify, OpenAI e DataForSEO."}
         </span>
       </div>
        <div className="flex items-center gap-2 shrink-0">
          {cacheStats && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full border border-admin-border px-2 py-0.5 text-[12px] font-medium text-admin-text-secondary"
              title={`${cacheStats.cache_hits} hits de cache em ${cacheStats.analyses_total} análises (30d)`}
            >
              Cache {cacheStats.hit_rate_pct.toFixed(0)}%
            </span>
          )}
          <Link
            to="/admin/sistema"
            className="rounded-md border border-admin-border px-2.5 py-1 text-[12px] font-medium text-admin-text-secondary hover:text-admin-text-primary hover:bg-admin-surface-elevated transition-colors"
          >
            Abrir Sistema
          </Link>
        </div>
     </div>
   );
 }
 
function VisaoGeralPage() {
  const [period, setPeriod] = useState<AdminPeriod>("30d");
  const queryClient = useQueryClient();
  return (
    <>
      <AdminPageHeader
        title="Visão geral"
        subtitle="O essencial do negócio · últimos 30 dias"
        actions={
          <>
            <PeriodSelect value={period} onChange={setPeriod} />
            <AdminActionButton onClick={() => queryClient.invalidateQueries({ queryKey: ["admin"] })}>
              ↻ Atualizar
            </AdminActionButton>
          </>
        }
      />
      <div className="flex flex-col gap-8">
        <ExecutionModeStrip />
        <OverviewKpiRow />
        <AnalysisWindowCard />
        <MarginAlert />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AcquisitionFunnel />
          <CostSummaryCard />
        </div>
        <PriorityFollowups />
        <IntentSection />
      </div>
    </>
  );
}