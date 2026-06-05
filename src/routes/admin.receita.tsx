/**
 * /admin/receita — tab Receita do admin v2.
 *
 * 3 blocos honestos:
 *  1. Despesas reais (ExpenseSection — custos por fornecedor + reconciliação)
 *  2. Sinais de pré-receita (pagamentos, intenção beta, interesse em /preços)
 *  3. Receita recorrente (placeholder consolidado — depende do checkout)
 *
 * O selector de período só afecta o bloco de despesas (único com séries
 * temporais). Sem botão de export enquanto não houver export real.
 */

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { AdminPageHeader } from "@/components/admin/v2/admin-page-header";
import {
  PeriodSelect,
  type AdminPeriod,
} from "@/components/admin/v2/period-select";
import { PreRevenueSignalsSection } from "@/components/admin/v2/receita/pre-revenue-signals-section";
import { PaymentsSection } from "@/components/admin/v2/receita/payments-section";
import { FutureRecurringRevenueCard } from "@/components/admin/v2/receita/future-recurring-revenue-card";
import { ExpenseSection } from "@/components/admin/v2/visao-geral/expense-section";

export const Route = createFileRoute("/admin/receita")({
  component: ReceitaPage,
});

function ReceitaPage() {
  const [period, setPeriod] = useState<AdminPeriod>("30d");

  return (
    <>
      <AdminPageHeader
        title="Receita e custos"
        subtitle="Hoje: custos reais por fornecedor + sinais de demanda. As métricas de subscrição acendem quando o checkout for ligado."
        actions={<PeriodSelect value={period} onChange={setPeriod} />}
      />
      <div className="flex flex-col gap-14">
        <ExpenseSection period={period} />
        <PreRevenueSignalsSection />
        <PaymentsSection />
        <FutureRecurringRevenueCard />
      </div>
    </>
  );
}