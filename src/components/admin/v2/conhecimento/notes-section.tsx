/**
 * NotesSection — grid de notas editoriais com criar/editar/arquivar.
 *
 * Cada cartão é clicável para abrir o dialog em modo edição. Arquivar pede
 * confirmação via AlertDialog (sem `confirm()` nativo do browser).
 */

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AdminSectionHeader } from "@/components/admin/v2/admin-section-header";
import { AdminCard } from "@/components/admin/v2/admin-card";
import { AdminBadge } from "@/components/admin/v2/admin-badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { adminFetch } from "@/lib/admin/fetch";
import {
  NOTE_CATEGORY_LABEL,
  type KnowledgeNote,
  type NoteCategory,
} from "@/lib/knowledge/types";
import { NoteCreateDialog } from "./note-create-dialog";

type CategoryFilter = NoteCategory | "all";

export function NotesSection() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<KnowledgeNote | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<KnowledgeNote | null>(null);
  const [filter, setFilter] = useState<CategoryFilter>("all");

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
      setArchiveTarget(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const active = (data ?? []).filter((n) => !n.archived);
  const filtered = filter === "all" ? active : active.filter((n) => n.category === filter);

  const FILTERS: CategoryFilter[] = ["all", "trend", "format", "algorithm", "vertical", "tool"];

  return (
    <section style={{ marginBottom: 36 }}>
      <AdminSectionHeader
        title="NOTAS EDITORIAIS"
        subtitle="Tendências, particularidades de formatos, mudanças de algoritmo, especificidades por vertical."
        accent="signal"
      />

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] uppercase tracking-wider text-admin-text-tertiary">
            Categoria:
          </span>
          {FILTERS.map((f) => (
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
              {f === "all" ? "Todas" : NOTE_CATEGORY_LABEL[f]}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setCreateOpen(true); }}>
          + Nova nota
        </Button>
      </div>

      {error ? (
        <p className="text-[12px] text-admin-danger-700">Erro: {(error as Error).message}</p>
      ) : null}

      {isLoading ? (
        <p className="text-[12px] text-admin-text-tertiary">A carregar…</p>
      ) : filtered.length === 0 ? (
        <AdminCard>
          <p className="text-center text-[12px] text-admin-text-tertiary py-4">
            {active.length === 0
              ? "Nenhuma nota editorial registada. Adicione a primeira para enriquecer o contexto da IA."
              : "Sem notas nesta categoria."}
          </p>
        </AdminCard>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((n) => (
            <AdminCard key={n.id} variant="default">
              <div className="flex items-center justify-between gap-2 mb-2">
                <AdminBadge variant="info">
                  {NOTE_CATEGORY_LABEL[n.category]}
                  {n.vertical ? ` · ${n.vertical}` : ""}
                </AdminBadge>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setEditing(n); setCreateOpen(true); }}
                    className="text-[10px] uppercase tracking-wider text-admin-text-tertiary hover:text-admin-leads-700"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => setArchiveTarget(n)}
                    className="text-[10px] uppercase tracking-wider text-admin-text-tertiary hover:text-admin-danger-700"
                  >
                    Arquivar
                  </button>
                </div>
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

      <NoteCreateDialog
        open={createOpen}
        onClose={() => { setCreateOpen(false); setEditing(null); }}
        note={editing}
      />

      <AlertDialog
        open={archiveTarget !== null}
        onOpenChange={(v) => (!v ? setArchiveTarget(null) : null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arquivar esta nota?</AlertDialogTitle>
            <AlertDialogDescription>
              A nota deixa de alimentar o contexto da IA. Pode ser restaurada
              manualmente na base de dados se necessário.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (archiveTarget) archive.mutate(archiveTarget.id);
              }}
            >
              Arquivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
