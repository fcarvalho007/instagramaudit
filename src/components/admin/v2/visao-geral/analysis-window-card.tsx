/**
 * AnalysisWindowCard — distribuição de análises por janela (Baseline / 30d / 90d).
 *
 * Lê /api/admin/analysis-window-counts (período fixo 30d para se manter
 * alinhado com a subtitle da página). Os valores reusam a mesma palette
 * dos badges da tabela de relatórios para leitura instantânea.
 */

import { useQuery } from "@tanstack/react-query";
import { AdminCard } from "../admin-card";
import { AdminSectionHeader } from "../admin-section-header";
import { SectionError, SectionSkeleton } from "../section-state";
import { adminFetch } from "@/lib/admin/fetch";
import {
  ACCENT_BG_50,
  ACCENT_TEXT,
  type AdminAccent,
} from "../admin-tokens";
import type { AnalysisWindowCounts } from "@/routes/api/admin/analysis-window-counts";

interface StatProps {
  label: string;
  value: number;
  accent: AdminAccent;
}

function Stat({ label, value, accent }: StatProps) {
  return (
    <div
      className="rounded-xl border px-4 py-3 flex flex-col gap-1"
      style={{
        backgroundColor: ACCENT_BG_50[accent],
        borderColor: `${ACCENT_TEXT[accent]}1a`,
      }}
    >
      <span
        className="text-[11px] font-medium uppercase tracking-wider"
        style={{ color: ACCENT_TEXT[accent] }}
      >
        {label}
      </span>
      <span
        className="text-2xl font-semibold tabular-nums"
        style={{ color: ACCENT_TEXT[accent] }}
      >
        {value.toLocaleString("pt-PT")}
      </span>
    </div>
  );
}

export function AnalysisWindowCard() {
  const { data, isLoading, error, refetch } = useQuery<AnalysisWindowCounts>({
    queryKey: ["admin", "analysis-window-counts", "30d"],
    queryFn: async () => {
      const res = await adminFetch("/api/admin/analysis-window-counts?period=30d");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    staleTime: 60_000,
  });

  return (
    <AdminCard variant="default" className="!p-5">
      <AdminSectionHeader
        title="Análises por janela"
        subtitle="Distribuição das análises (snapshots + cache) nos últimos 30 dias"
        accent="info"
      />
      {isLoading && <SectionSkeleton rows={1} rowHeight={88} />}
      {error && <SectionError error={error as Error} onRetry={() => refetch()} />}
      {data && data.total === 0 && (
        <p className="text-sm text-admin-text-tertiary py-2">
          Sem análises nesta janela.
        </p>
      )}
      {data && data.total > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Stat label="Baseline" value={data.baseline} accent="neutral" />
            <Stat label="30 dias" value={data["30d"]} accent="info" />
            <Stat label="90 dias" value={data["90d"]} accent="revenue" />
          </div>
          <p className="text-[11px] text-admin-text-tertiary mt-3">
            Total {data.total.toLocaleString("pt-PT")} análises
            {data.other > 0 ? ` · ${data.other} outras janelas` : ""}
            {data.truncated ? " · amostra limitada a 5000 eventos" : ""}
          </p>
        </>
      )}
    </AdminCard>
  );
}