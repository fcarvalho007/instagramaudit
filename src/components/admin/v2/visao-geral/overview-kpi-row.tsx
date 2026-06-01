/**
 * OverviewKpiRow — 4 KPI cards no topo de /admin/visao-geral.
 *
 * Responde às 4 perguntas da manhã:
 *   1. Quantos novos inscritos? (leads 30d, delta 7d)
 *   2. Quanto entrou? (receita 30d)
 *   3. Quanto saiu? (custo 30d)
 *   4. Estou no vermelho ou no verde? (margem por lead)
 *
 * Lê /api/admin/overview-kpis. Sem mocks. Quando `margin_per_lead < 0`
 * a card de margem ganha o accent "expense" (âmbar) para sinalizar.
 */

import { useQuery } from "@tanstack/react-query";
import { KPICard } from "../kpi-card";
import { SectionError, SectionSkeleton } from "../section-state";
import { adminFetch } from "@/lib/admin/fetch";
import type { OverviewKpis } from "@/routes/api/admin/overview-kpis";

function fmtUsd(n: number | null): string {
  if (n === null || !isFinite(n)) return "—";
  const abs = Math.abs(n);
  const sign = n < 0 ? "−" : "";
  if (abs >= 1) return `${sign}$${abs.toFixed(2)}`;
  return `${sign}$${abs.toFixed(2)}`;
}

function fmtEur(n: number): string {
  return `€${n.toFixed(2)}`;
}

export function OverviewKpiRow() {
  const { data, isLoading, error, refetch } = useQuery<OverviewKpis>({
    queryKey: ["admin", "overview-kpis"],
    queryFn: async () => {
      const res = await adminFetch("/api/admin/overview-kpis");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    staleTime: 30_000,
  });

  if (isLoading) return <SectionSkeleton rows={1} rowHeight={120} />;
  if (error || !data)
    return <SectionError error={error as Error} onRetry={() => refetch()} />;

  const marginNegative =
    data.margin_per_lead !== null && data.margin_per_lead < 0;
  const marginAccent = marginNegative
    ? "expense"
    : data.margin_per_lead && data.margin_per_lead > 0
      ? "revenue"
      : "neutral";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <KPICard
        eyebrow="Novos inscritos"
        value={data.leads_30d.toString()}
        sub={`+${data.leads_7d} esta semana`}
        accent="leads"
        variant="accent-left"
      />
      <KPICard
        eyebrow="Receita"
        value={fmtEur(data.revenue_total_30d)}
        sub={data.checkout_enabled ? "30 dias" : "checkout por ligar"}
        accent="revenue"
        variant="accent-left"
      />
      <KPICard
        eyebrow="Custo total"
        value={`$${data.cost_total_30d.toFixed(2)}`}
        sub="Apify · OpenAI · DataForSEO"
        accent="expense"
        variant="accent-left"
      />
      <KPICard
        eyebrow="Margem / lead"
        value={fmtUsd(data.margin_per_lead)}
        sub={
          data.cost_per_lead !== null
            ? `custo ${fmtUsd(data.cost_per_lead)} · receita ${fmtUsd(data.revenue_per_lead)}`
            : "sem leads no período"
        }
        accent={marginAccent}
        variant="accent-left"
      />
    </div>
  );
}