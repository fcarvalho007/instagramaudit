/**
 * NotesSection — grid de notas editoriais.
 */

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AdminSectionHeader } from "@/components/admin/v2/admin-section-header";
import { AdminCard } from "@/components/admin/v2/admin-card";
import { AdminBadge } from "@/components/admin/v2/admin-badge";
import { Button } from "@/components/ui/button";
import { adminFetch } from "@/lib/admin/fetch";
import { NOTE_CATEGORY_LABEL, type KnowledgeNote } from "@/lib/knowledge/types";
import { NoteCreateDialog } from "./note-create-dialog";

export function NotesSection() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "knowledge", "notes"],
    queryFn: async () => {
      const res = await adminFetch("/api/admin/knowledge/notes");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as KnowledgeNote[];
    },
    refetchOnWindowFocus: false,
  });

  const archive = useMutation({
    mutationFn: async (id: string) => {
      const res = await adminFetch(`/api/admin/knowledge/notes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    },
    onSuccess: () => {
      toast.success("Nota arquivada.");
      qc.invalidateQueries({ queryKey: ["admin", "knowledge"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const active = (data ?? []).filter((n) => !n.archived);

  return (
    <section style={{ marginBottom: 36 }}>
      <AdminSectionHeader
        title="NOTAS EDITORIAIS"
        subtitle="Tendências, particularidades de formatos, mudanças de algoritmo, especificidades por vertical."
        accent="signal"
      />
      <div className="mb-3 flex justify-end">
        <Button size="sm" onClick={() => setCreateOpen(true)}>+ Nova nota</Button>
      </div>
      {error ? (
        <p className="text-[12px] text-admin-danger-700">Erro: {(error as Error).message}</p>
      ) : null}
      {isLoading ? (
        <p className="text-[12px] text-admin-text-tertiary">A carregar…</p>
      ) : active.length === 0 ? (
        <AdminCard>
          <p className="text-center text-[12px] text-admin-text-tertiary py-4">
            Nenhuma nota editorial registada. Adicione a primeira para enriquecer o contexto da IA.
          </p>
        </AdminCard>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {active.map((n) => (
            <AdminCard key={n.id} variant="default">
              <div className="flex items-center justify-between gap-2 mb-2">
                <AdminBadge accent="info">
                  {NOTE_CATEGORY_LABEL[n.category]}
                  {n.vertical ? ` · ${n.vertical}` : ""}
                </AdminBadge>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Arquivar esta nota?")) archive.mutate(n.id);
                  }}
                  className="text-[10px] uppercase tracking-wider text-admin-text-tertiary hover:text-admin-danger-700"
                  title="Arquivar"
                >
                  Arquivar
                </button>
              </div>
              <h4 className="text-[14px] font-semibold text-admin-text-primary mb-1">
                {n.title}
              </h4>
              <p className="text-[12px] text-admin-text-secondary line-clamp-4">
                {n.body}
              </p>
              <div className="mt-3 flex items-center justify-between text-[10px] text-admin-text-tertiary">
                <span>{n.source_name ?? "Sem fonte"}</span>
                <span>{new Date(n.updated_at).toLocaleDateString("pt-PT")}</span>
              </div>
            </AdminCard>
          ))}
        </div>
      )}
      <NoteCreateDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </section>
  );
}
