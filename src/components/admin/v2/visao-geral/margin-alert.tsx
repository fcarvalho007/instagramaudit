/**
 * MarginAlert — banner condicional de margem negativa.
 *
 * Visível enquanto `margin_per_lead < 0`. Texto em linguagem de negócio:
 * o problema, a causa, a próxima ação. Desaparece assim que a margem
 * passar a verde (checkout ligado + receita > custo).
 */

import { useQuery } from "@tanstack/react-query";
import { AdminCallout } from "../admin-callout";
import { adminFetch } from "@/lib/admin/fetch";
import type { OverviewKpis } from "@/routes/api/admin/overview-kpis";

export function MarginAlert() {
  const { data } = useQuery<OverviewKpis>({
    queryKey: ["admin", "overview-kpis"],
    queryFn: async () => {
      const res = await adminFetch("/api/admin/overview-kpis");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    staleTime: 30_000,
  });

  if (!data) return null;

  const costPerLead = data.cost_per_lead ?? 0;
  const costPerAnalysis = data.cost_per_analysis ?? 0;

  // Sem receita activa → card informativo, não alerta de margem.
  if (!data.revenue_active) {
    return (
      <AdminCallout variant="info" title="Receita ainda não activa">
        Cada lead custa ~${costPerLead.toFixed(2)} e cada análise ~$
        {costPerAnalysis.toFixed(2)}. A margem por lead só será calculada
        quando o checkout estiver ligado e existirem pagamentos reais.
      </AdminCallout>
    );
  }

  if (data.margin_status !== "negative" || data.margin_per_lead === null) {
    return null;
  }

  return (
    <AdminCallout title="Margem negativa por lead">
      Cada lead custa ~${costPerLead.toFixed(2)} mas a receita por lead é
      inferior — rever pricing ou eficiência de custo.
    </AdminCallout>
  );
}