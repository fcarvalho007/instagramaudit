/**
 * /admin/conhecimento — Knowledge Base editorial.
 *
 * Quatro secções verticais:
 *   1. KPIs do estado da KB
 *   2. Benchmarks por tier × formato (12 linhas editáveis)
 *   3. Fontes documentadas
 *   4. Notas editoriais
 *
 * Toda a leitura/escrita passa pelos endpoints `/api/admin/knowledge.*`,
 * que validam sessão admin antes de tocar nas tabelas (RLS denyall).
 */

import { createFileRoute } from "@tanstack/react-router";

import { AdminPageHeader } from "@/components/admin/v2/admin-page-header";
import { OverviewSection } from "@/components/admin/v2/conhecimento/overview-section";
import { BenchmarksSection } from "@/components/admin/v2/conhecimento/benchmarks-section";
import { SourcesSection } from "@/components/admin/v2/conhecimento/sources-section";
import { NotesSection } from "@/components/admin/v2/conhecimento/notes-section";

export const Route = createFileRoute("/admin/conhecimento")({
  component: ConhecimentoPage,
});

function ConhecimentoPage() {
  return (
    <>
      <AdminPageHeader
        title="Knowledge Base"
        subtitle="Contexto editorial verificado que alimenta os insights da IA. Benchmarks de referência, fontes documentadas e notas estratégicas — tudo auditável."
        actions={
          <a
            href="/api/admin/knowledge/export"
            className="inline-flex items-center gap-1.5 rounded-lg border border-admin-border px-3 py-1.5 text-[12px] font-medium text-admin-text-primary no-underline transition-colors hover:bg-admin-bg-hover"
          >
            Exportar dataset
          </a>
        }
      />

      <OverviewSection />
      <BenchmarksSection />
      <SourcesSection />
      <NotesSection />
    </>
  );
}
