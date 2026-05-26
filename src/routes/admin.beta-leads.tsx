/**
 * /admin/beta-leads — redirect permanente para /admin/leads.
 *
 * Mantido por compatibilidade com bookmarks, emails antigos e links
 * partilhados internamente. Preserva `?lead=` e `?view=`.
 */

import { createFileRoute, redirect } from "@tanstack/react-router";

type PipelineView = "pipeline" | "tabela";

export const Route = createFileRoute("/admin/beta-leads")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { lead?: string; view?: PipelineView } => ({
    lead: typeof search.lead === "string" ? search.lead : undefined,
    view:
      search.view === "tabela" || search.view === "pipeline"
        ? search.view
        : undefined,
  }),
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/admin/leads",
      search: {
        ...(search.lead ? { lead: search.lead } : {}),
        ...(search.view ? { view: search.view } : {}),
      },
      replace: true,
    });
  },
});
