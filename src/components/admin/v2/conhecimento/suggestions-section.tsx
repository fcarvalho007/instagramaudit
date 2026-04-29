/**
 * SuggestionsSection — sugestões automáticas pendentes de revisão.
 *
 * Só renderiza quando há ≥1 sugestão `pending`. Cada cartão expõe tipo,
 * razão, payload e botões aprovar/rejeitar. Marcar como aprovado/rejeitado
 * apenas regista a triagem; aplicar o `payload` é manual nesta iteração.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AdminSectionHeader } from "@/components/admin/v2/admin-section-header";
import { AdminCard } from "@/components/admin/v2/admin-card";
import { AdminBadge } from "@/components/admin/v2/admin-badge";
import { Button } from "@/components/ui/button";
import { adminFetch } from "@/lib/admin/fetch";
import type { KnowledgeSuggestion } from "@/lib/knowledge/types";

const TYPE_LABEL: Record<KnowledgeSuggestion["type"], string> = {
  benchmark_update: "Atualização de benchmark",
  new_pattern: "Novo padrão detetado",
  outdated: "Entrada desatualizada",
};

export function SuggestionsSection() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "knowledge", "suggestions"],
    queryFn: async () => {
      const res = await adminFetch("/api/admin/knowledge/suggestions");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as KnowledgeSuggestion[];
    },
    refetchOnWindowFocus: false,
  });

  const review = useMutation({
    mutationFn: async (input: { id: string; status: "approved" | "rejected" }) => {
      const res = await adminFetch(
        `/api/admin/knowledge/suggestions/${input.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: input.status }),
        },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.status === "approved" ? "Sugestão aprovada." : "Sugestão rejeitada.");
      qc.invalidateQueries({ queryKey: ["admin", "knowledge"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const pending = (data ?? []).filter((s) => s.status === "pending");
  if (!isLoading && !error && pending.length === 0) return null;

  return (
    <section style={{ marginBottom: 36 }}>
      <AdminSectionHeader
        title="SUGESTÕES AUTOMÁTICAS"
        subtitle="O sistema detetou padrões que podem justificar novas entradas ou atualizações."
        accent="signal"
      />
      {error ? (
        <p className="text-[12px] text-admin-danger-700">Erro: {(error as Error).message}</p>
      ) : null}
      {isLoading ? (
        <p className="text-[12px] text-admin-text-tertiary">A carregar…</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {pending.map((s) => (
            <AdminCard key={s.id} variant="accent-left" accent="signal">
              <div className="flex items-center justify-between gap-2 mb-2">
                <AdminBadge variant="signal">{TYPE_LABEL[s.type]}</AdminBadge>
                <span className="text-[10px] text-admin-text-tertiary">
                  {new Date(s.created_at).toLocaleDateString("pt-PT")}
                </span>
              </div>
              {s.reason ? (
                <p className="text-[12px] text-admin-text-primary mb-2">{s.reason}</p>
              ) : null}
              <pre className="mb-3 rounded border border-admin-border bg-admin-bg-hover p-2 text-[10px] font-mono text-admin-text-secondary overflow-x-auto whitespace-pre-wrap">
{JSON.stringify(s.payload, null, 2)}
              </pre>
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => review.mutate({ id: s.id, status: "rejected" })}
                  disabled={review.isPending}
                >
                  Rejeitar
                </Button>
                <Button
                  size="sm"
                  onClick={() => review.mutate({ id: s.id, status: "approved" })}
                  disabled={review.isPending}
                >
                  Aprovar
                </Button>
              </div>
            </AdminCard>
          ))}
        </div>
      )}
    </section>
  );
}
