/**
 * SourcesSection — tabela de fontes documentadas.
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminSectionHeader } from "@/components/admin/v2/admin-section-header";
import { AdminCard } from "@/components/admin/v2/admin-card";
import { AdminBadge } from "@/components/admin/v2/admin-badge";
import { Button } from "@/components/ui/button";
import { adminFetch } from "@/lib/admin/fetch";
import { SOURCE_TYPE_LABEL, type KnowledgeSource } from "@/lib/knowledge/types";
import { SourceCreateDialog } from "./source-create-dialog";

export function SourcesSection() {
  const [createOpen, setCreateOpen] = useState(false);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "knowledge", "sources"],
    queryFn: async () => {
      const res = await adminFetch("/api/admin/knowledge/sources");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as KnowledgeSource[];
    },
    refetchOnWindowFocus: false,
  });

  return (
    <section style={{ marginBottom: 36 }}>
      <AdminSectionHeader
        title="FONTES DOCUMENTADAS"
        subtitle="Estudos, datasets e referências externas que sustentam os benchmarks e notas."
        accent="info"
      />
      <div className="mb-3 flex justify-end">
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          + Nova fonte
        </Button>
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
                <th className="px-4 py-2.5 font-medium">Nome</th>
                <th className="px-4 py-2.5 font-medium">Tipo</th>
                <th className="px-4 py-2.5 font-medium">URL</th>
                <th className="px-4 py-2.5 font-medium">Publicado</th>
                <th className="px-4 py-2.5 font-medium">Amostra</th>
                <th className="px-4 py-2.5 font-medium text-right">Citações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-admin-text-tertiary">
                    A carregar…
                  </td>
                </tr>
              ) : (data ?? []).length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-admin-text-tertiary">
                    Nenhuma fonte registada. Adicione a primeira para fundamentar os benchmarks.
                  </td>
                </tr>
              ) : (
                (data ?? []).map((s) => (
                  <tr key={s.id} className="border-b border-admin-border/50 last:border-b-0">
                    <td className="px-4 py-2.5 text-admin-text-primary font-medium">
                      {s.name}
                    </td>
                    <td className="px-4 py-2.5">
                      {s.type ? (
                        <AdminBadge variant="neutral">{SOURCE_TYPE_LABEL[s.type]}</AdminBadge>
                      ) : (
                        <span className="text-admin-text-tertiary">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 max-w-[280px] truncate">
                      {s.url ? (
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-admin-leads-700 hover:underline"
                        >
                          {s.url}
                        </a>
                      ) : (
                        <span className="text-admin-text-tertiary">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-admin-text-secondary">
                      {s.published_at ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-admin-text-tertiary">
                      {s.sample_size ? `n=${s.sample_size.toLocaleString("pt-PT")}` : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-admin-text-primary">
                      {s.citations_count ?? 0}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </AdminCard>
      <SourceCreateDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </section>
  );
}
