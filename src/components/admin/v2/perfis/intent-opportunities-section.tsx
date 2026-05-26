/**
 * Tab Perfis · Secção 3 — Oportunidades de conversão.
 *
 * Handles com ≥3 pesquisas na janela mas sem snapshot novo OU sem lead
 * (email submetido). Fonte: `analysis_events` + `analysis_snapshots` +
 * `report_requests.lead_id`.
 */

import { useQuery } from "@tanstack/react-query";
import { AdminCard } from "../admin-card";
import { AdminBadge } from "../admin-badge";
import { AdminSectionHeader } from "../admin-section-header";
import { adminFetch } from "@/lib/admin/fetch";
import type { AdminPeriod } from "@/components/admin/v2/period-select";

interface Row {
  handle: string;
  searches: number;
  last_search_at: string;
  has_snapshot: boolean;
  has_lead: boolean;
}

interface Api {
  success: boolean;
  rows: Row[];
  total: number;
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  return `há ${Math.floor(h / 24)} d`;
}

export function IntentOpportunitiesSection({ period }: { period: AdminPeriod }) {
  const { data, isLoading } = useQuery<Api>({
    queryKey: ["admin", "profiles", "intent-opportunities", period],
    queryFn: async () => {
      const res = await adminFetch(
        `/api/admin/profiles/intent-opportunities?period=${period}`,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    staleTime: 30_000,
  });

  const rows = data?.rows ?? [];

  return (
    <section>
      <AdminSectionHeader
        title="Oportunidades de conversão"
        subtitle={`${rows.length} handle${rows.length === 1 ? "" : "s"} sem conversão completa`}
        accent="signal"
        info="Perfis com ≥3 pesquisas na janela mas sem snapshot novo ou sem email submetido. Nota: dedup é por handle, não por utilizador (auth pública ainda não implementada)."
      />
      <AdminCard className="!p-0">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-[12px]">
            <thead>
              <tr className="text-admin-text-tertiary">
                <th className="admin-eyebrow px-6 py-3 font-normal">Handle</th>
                <th className="admin-eyebrow px-6 py-3 text-right font-normal">Pesquisas</th>
                <th className="admin-eyebrow px-6 py-3 font-normal">Estado</th>
                <th className="admin-eyebrow px-6 py-3 font-normal">Última pesquisa</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-admin-text-tertiary">
                    A carregar…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-admin-text-tertiary">
                    Sem oportunidades na janela — todos os handles pesquisados converteram em snapshot e lead.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={r.handle}
                    className="border-t border-admin-border transition-colors hover:bg-[var(--color-admin-surface-muted)]"
                  >
                    <td className="px-6 py-3.5 text-[13px] text-admin-text-primary">
                      @{r.handle}
                    </td>
                    <td className="px-6 py-3.5 text-right admin-code tabular-nums text-admin-text-primary">
                      {r.searches}
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex flex-wrap gap-1.5">
                        {!r.has_snapshot ? (
                          <AdminBadge variant="danger">sem snapshot</AdminBadge>
                        ) : null}
                        {!r.has_lead ? (
                          <AdminBadge variant="signal">sem lead</AdminBadge>
                        ) : null}
                        {r.has_snapshot && r.has_lead ? (
                          <AdminBadge variant="revenue">convertido</AdminBadge>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-[12px] text-admin-text-secondary">
                      {formatRelative(r.last_search_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </AdminCard>
    </section>
  );
}