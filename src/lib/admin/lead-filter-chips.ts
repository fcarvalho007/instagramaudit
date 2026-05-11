/**
 * Fonte única dos chips de filtro de Contactos.
 *
 * Partilhado entre `KanbanBoard` (vista Pipeline) e `LeadsTable` (vista Tabela)
 * para garantir coerência semântica entre as duas vistas.
 */

import type { EnrichedLead } from "./kanban-columns";

export type FilterChipKey =
  | "todos"
  | "em_analise"
  | "com_relatorio"
  | "com_feedback"
  | "potencial"
  | "arquivados";

export interface FilterChip {
  key: FilterChipKey;
  label: string;
  /** Lista de `commercial_status` aceites; `null` = todos. */
  statuses: string[] | null;
}

export const FILTER_CHIPS: FilterChip[] = [
  { key: "todos", label: "Todos", statuses: null },
  { key: "em_analise", label: "Em análise", statuses: ["novo_pedido", "em_analise"] },
  {
    key: "com_relatorio",
    label: "Com relatório",
    statuses: ["relatorio_gerado", "link_enviado", "relatorio_visto"],
  },
  {
    key: "com_feedback",
    label: "Com feedback",
    statuses: ["feedback_pedido", "feedback_recebido"],
  },
  {
    key: "potencial",
    label: "Potencial cliente",
    statuses: ["interessado", "potencial_cliente", "convertido"],
  },
  { key: "arquivados", label: "Arquivados", statuses: ["arquivado"] },
];

export function matchesChip(lead: EnrichedLead, key: FilterChipKey): boolean {
  const chip = FILTER_CHIPS.find((c) => c.key === key);
  if (!chip || !chip.statuses) return true;
  return chip.statuses.includes(lead.commercial_status);
}

export function matchesQuery(lead: EnrichedLead, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    (!!lead.name && lead.name.toLowerCase().includes(q)) ||
    lead.email.toLowerCase().includes(q) ||
    (!!lead.handle && lead.handle.toLowerCase().includes(q))
  );
}