/**
 * BenchmarksSection — tabela de benchmarks por tier × formato.
 *
 * 12 linhas (4 tiers × 3 formatos). Linhas vazias mostram CTA "Adicionar".
 * Click numa linha → abre `BenchmarkDrawer` com formulário + histórico.
 */

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminSectionHeader } from "@/components/admin/v2/admin-section-header";
import { AdminCard } from "@/components/admin/v2/admin-card";
import { AdminBadge } from "@/components/admin/v2/admin-badge";
import { adminFetch } from "@/lib/admin/fetch";
import {
  FORMAT_LABEL,
  ORIGIN_LABEL,
  TIER_LABEL,
  type BenchmarkFormat,
  type BenchmarkTier,
  type KnowledgeBenchmark,
} from "@/lib/knowledge/types";
import { BenchmarkDrawer } from "./benchmark-drawer";

const TIERS: BenchmarkTier[] = ["nano", "micro", "mid", "macro"];
const FORMATS: BenchmarkFormat[] = ["reels", "carousels", "images"];

type FormatFilter = BenchmarkFormat | "all";

interface CellState {
  tier: BenchmarkTier;
  format: BenchmarkFormat;
  benchmark: KnowledgeBenchmark | null;
}

export function BenchmarksSection() {
  const [filter, setFilter] = useState<FormatFilter>("all");
  const [drawer, setDrawer] = useState<CellState | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "knowledge", "benchmarks"],
    queryFn: async () => {
      const res = await adminFetch("/api/admin/knowledge/benchmarks");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as KnowledgeBenchmark[];
    },
    refetchOnWindowFocus: false,
  });

  const lookup = useMemo(() => {
    const map = new Map<string, KnowledgeBenchmark>();
    for (const b of data ?? []) {
      if (b.valid_to) continue;
      map.set(`${b.tier}:${b.format}`, b);
    }
    return map;
  }, [data]);

  const visibleFormats = filter === "all" ? FORMATS : [filter];

  return (
    <section style={{ marginBottom: 36 }}>
      <AdminSectionHeader
        title="BENCHMARKS DE REFERÊNCIA"
        subtitle="Engagement médio por tier de seguidores e formato. 4 tiers × 3 formatos = 12 linhas-alvo."
        accent="leads"
        info="Estes valores fundamentam comparações nos relatórios. Cada linha guarda histórico completo de alterações."
      />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-[11px] uppercase tracking-wider text-admin-text-tertiary">
          Filtrar formato:
        </span>
        {(["all", ...FORMATS] as FormatFilter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1 text-[11px] font-medium transition-colors ${
              filter === f
                ? "border-admin-leads-500 bg-admin-leads-50 text-admin-leads-800"
                : "border-admin-border text-admin-text-secondary hover:bg-admin-bg-hover"
            }`}
          >
            {f === "all" ? "Todos" : FORMAT_LABEL[f as BenchmarkFormat]}
          </button>
        ))}
      </div>

      {error ? (
        <p className="text-[12px] text-admin-danger-700">
          Erro: {(error as Error).message}
        </p>
      ) : null}

      <AdminCard variant="flush">
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead className="border-b border-admin-border">
              <tr className="text-left text-admin-text-tertiary">
                <th className="px-4 py-2.5 font-medium">Tier</th>
                <th className="px-4 py-2.5 font-medium">Formato</th>
                <th className="px-4 py-2.5 font-medium">Engagement</th>
                <th className="px-4 py-2.5 font-medium">Amostra</th>
                <th className="px-4 py-2.5 font-medium">Fonte</th>
                <th className="px-4 py-2.5 font-medium">Origem</th>
                <th className="px-4 py-2.5 font-medium text-right">
                  Última actualização
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-admin-text-tertiary">
                    A carregar…
                  </td>
                </tr>
              ) : (
                TIERS.flatMap((tier) =>
                  visibleFormats.map((format) => {
                    const b = lookup.get(`${tier}:${format}`) ?? null;
                    return (
                      <tr
                        key={`${tier}:${format}`}
                        onClick={() => setDrawer({ tier, format, benchmark: b })}
                        className="cursor-pointer border-b border-admin-border/50 last:border-b-0 hover:bg-admin-bg-hover"
                      >
                        <td className="px-4 py-2.5 text-admin-text-primary">
                          {TIER_LABEL[tier]}
                        </td>
                        <td className="px-4 py-2.5 text-admin-text-secondary">
                          {FORMAT_LABEL[format]}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-admin-text-primary">
                          {b ? `${Number(b.engagement_pct).toFixed(2)}%` : "—"}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-admin-text-tertiary">
                          {b ? `n=${b.sample_size.toLocaleString("pt-PT")}` : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-admin-text-secondary">
                          {b?.source_name ?? "—"}
                        </td>
                        <td className="px-4 py-2.5">
                          {b ? (
                            <AdminBadge variant={b.origin === "manual" ? "neutral" : "info"}>
                              {ORIGIN_LABEL[b.origin]}
                            </AdminBadge>
                          ) : (
                            <span className="text-admin-leads-700">+ Adicionar</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right text-admin-text-tertiary">
                          {b ? new Date(b.updated_at).toLocaleDateString("pt-PT") : "—"}
                        </td>
                      </tr>
                    );
                  }),
                )
              )}
            </tbody>
          </table>
        </div>
      </AdminCard>

      {drawer ? (
        <BenchmarkDrawer
          open
          onClose={() => setDrawer(null)}
          tier={drawer.tier}
          format={drawer.format}
          benchmark={drawer.benchmark}
        />
      ) : null}
    </section>
  );
}
