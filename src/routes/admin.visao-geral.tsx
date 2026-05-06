/**
 * /admin/visao-geral — executive dashboard tab.
 *
 * Compact status strip + 5 secções: funil → receita → despesa → kanban → sinais.
 */

 import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
 import { Link } from "@tanstack/react-router";
 import { useQuery } from "@tanstack/react-query";
import { AdminPageHeader } from "@/components/admin/v2/admin-page-header";
import { PeriodSelect, type AdminPeriod } from "@/components/admin/v2/period-select";
import { AdminActionButton } from "@/components/admin/v2/admin-action-button";
import { FunnelSection } from "@/components/admin/v2/visao-geral/funnel-section";
import { RevenueSection } from "@/components/admin/v2/visao-geral/revenue-section";
import { ExpenseSection } from "@/components/admin/v2/visao-geral/expense-section";
import { KanbanSection } from "@/components/admin/v2/visao-geral/kanban-section";
import { IntentSection } from "@/components/admin/v2/visao-geral/intent-section";
 import { getExecutionMode } from "@/server/admin/execution-mode.functions";

export const Route = createFileRoute("/admin/visao-geral")({
  component: VisaoGeralPage,
});

 function ExecutionModeStrip() {
   const { data } = useQuery({
     queryKey: ["admin", "execution-mode"],
     queryFn: () => getExecutionMode(),
     staleTime: 10_000,
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
           className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium shrink-0"
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
       <Link
         to="/admin/sistema"
         className="shrink-0 rounded-md border border-admin-border px-2.5 py-1 text-[11px] font-medium text-admin-text-secondary hover:text-admin-text-primary hover:bg-admin-surface-elevated transition-colors"
       >
         Abrir Sistema
       </Link>
     </div>
   );
 }
 
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
         <ExecutionModeStrip />
        <FunnelSection />
        <RevenueSection />
        <ExpenseSection />
        <KanbanSection />
        <IntentSection />
      </div>
    </>
  );
}