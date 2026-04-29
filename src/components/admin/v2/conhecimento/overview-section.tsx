/**
 * OverviewSection — 4 KPIs do estado da Knowledge Base.
 */

import { useQuery } from "@tanstack/react-query";
import { AdminSectionHeader } from "@/components/admin/v2/admin-section-header";
import { KPICard } from "@/components/admin/v2/kpi-card";
import { adminFetch } from "@/lib/admin/fetch";
import type { KnowledgeOverview } from "@/lib/knowledge/types";

function timeAgo(iso: string | null): string {
  if (!iso) return "——";
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / 86_400_000);
  if (days <= 0) {
    const hours = Math.floor(ms / 3_600_000);
    if (hours <= 0) return "agora mesmo";
    return `há ${hours}h`;
  }
  if (days === 1) return "ontem";
  if (days < 30) return `há ${days} dias`;
  const months = Math.floor(days / 30);
  return `há ${months} ${months === 1 ? "mês" : "meses"}`;
}

export function OverviewSection() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "knowledge", "overview"],
    queryFn: async () => {
      const res = await adminFetch("/api/admin/knowledge/overview");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as KnowledgeOverview;
    },
    refetchOnWindowFocus: false,
  });

  return (
    <section style={{ marginBottom: 36 }}>
      <AdminSectionHeader
        title="ESTADO DA KB"
        subtitle="Visão rápida do volume, cobertura e frescura das entradas editoriais."
        accent="info"
        info="Cobertura conta tiers (nano, micro, mid, macro) com 3 ou mais benchmarks documentados."
      />
      {error ? (
        <p className="text-[12px] text-admin-danger-700">
          Erro a carregar overview: {(error as Error).message}
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          eyebrow="Total de entradas"
          value={isLoading ? "—" : String(data?.total_entries ?? 0)}
          sub={
            data
              ? `${data.manual_count} manuais · ${data.system_count} sistema`
              : "—"
          }
        />
        <KPICard
          eyebrow="Cobertura por tier"
          value={
            isLoading
              ? "—"
              : `${data?.tier_coverage ?? 0} de ${data?.tier_total ?? 4}`
          }
          sub="≥3 benchmarks por tier"
        />
        <KPICard
          eyebrow="Última actualização"
          value={isLoading ? "—" : timeAgo(data?.last_update.at ?? null)}
          sub={
            data?.last_update.label
              ? `${data.last_update.label}${data.last_update.by ? ` · ${data.last_update.by}` : ""}`
              : "Sem alterações registadas"
          }
        />
        <KPICard
          eyebrow="Sugestões pendentes"
          value={isLoading ? "—" : String(data?.pending_suggestions ?? 0)}
          sub="Auto-detectadas pelo sistema"
        />
      </div>
    </section>
  );
}
