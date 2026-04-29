/**
 * /admin/conhecimento — Knowledge Base editorial.
 *
 * Cinco secções verticais (suggestions só aparece se houver ≥1 pendente):
 *   1. KPIs do estado da KB
 *   2. Sugestões automáticas (condicional)
 *   3. Benchmarks por tier × formato
 *   4. Fontes documentadas
 *   5. Notas editoriais
 *
 * Toda a leitura/escrita passa pelos endpoints `/api/admin/knowledge.*`,
 * que validam sessão admin antes de tocar nas tabelas (RLS denyall).
 */

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { AdminPageHeader } from "@/components/admin/v2/admin-page-header";
import { OverviewSection } from "@/components/admin/v2/conhecimento/overview-section";
import { SuggestionsSection } from "@/components/admin/v2/conhecimento/suggestions-section";
import { BenchmarksSection } from "@/components/admin/v2/conhecimento/benchmarks-section";
import { SourcesSection } from "@/components/admin/v2/conhecimento/sources-section";
import { NotesSection } from "@/components/admin/v2/conhecimento/notes-section";
import { adminFetch } from "@/lib/admin/fetch";

export const Route = createFileRoute("/admin/conhecimento")({
  component: ConhecimentoPage,
});

function ConhecimentoPage() {
  const [exporting, setExporting] = useState(false);

  /**
   * Download autenticado: `<a href>` simples não envia o `Authorization:
   * Bearer <jwt>` que o `requireAdminSession()` exige; tem de ser fetch
   * com `adminFetch` + Blob URL temporário.
   */
  const onExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const res = await adminFetch("/api/admin/knowledge/export");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `instabench-knowledge-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro a exportar");
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <AdminPageHeader
        title="Knowledge Base"
        subtitle="Contexto editorial verificado que alimenta os insights da IA. Benchmarks de referência, fontes documentadas e notas estratégicas — tudo auditável."
        actions={
          <button
            type="button"
            onClick={onExport}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 rounded-lg border border-admin-border px-3 py-1.5 text-[12px] font-medium text-admin-text-primary transition-colors hover:bg-admin-bg-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {exporting ? "A exportar…" : "Exportar dataset"}
          </button>
        }
      />

      <OverviewSection />
      <SuggestionsSection />
      <BenchmarksSection />
      <SourcesSection />
      <NotesSection />
    </>
  );
}
