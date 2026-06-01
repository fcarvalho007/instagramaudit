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
  if (data.margin_per_lead === null) return null;
  if (data.margin_per_lead >= 0) return null;

  const costPerLead = data.cost_per_lead ?? 0;

  return (
    <AdminCallout title="A gerar custo sem receita">
      Cada lead custa ~${costPerLead.toFixed(2)} e o checkout ainda não está
      ligado — prioridade para fechar a margem.
    </AdminCallout>
  );
}