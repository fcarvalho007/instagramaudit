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
  | "arquivados"
  | "novos_hoje"
  | "inativos_7d"
  | "lead_magnet_ativo"
  | "marketing_ok";

export type FilterChipGroup = "estado" | "atencao";

export interface FilterChip {
  key: FilterChipKey;
  label: string;
  group: FilterChipGroup;
  /** Lista de `commercial_status` aceites; `null` = todos. */
  statuses: string[] | null;
  /** Predicado adicional aplicado depois da filtragem por `statuses`. */
  predicate?: (lead: EnrichedLead) => boolean;
}

function startOfTodayIso(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function daysAgoMs(days: number): number {
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

export const FILTER_CHIPS: FilterChip[] = [
  { key: "todos", label: "Todos", group: "estado", statuses: null },
  {
    key: "em_analise",
    label: "Em análise",
    group: "estado",
    statuses: ["novo_pedido", "em_analise"],
  },
  {
    key: "com_relatorio",
    label: "Com relatório",
    group: "estado",
    statuses: ["relatorio_gerado", "link_enviado", "relatorio_visto"],
  },
  {
    key: "com_feedback",
    label: "Com feedback",
    group: "estado",
    statuses: ["feedback_pedido", "feedback_recebido"],
  },
  {
    key: "potencial",
    label: "Potencial cliente",
    group: "estado",
    statuses: ["interessado", "potencial_cliente", "convertido"],
  },
  { key: "arquivados", label: "Arquivados", group: "estado", statuses: ["arquivado"] },
  {
    key: "novos_hoje",
    label: "Novos hoje",
    group: "atencao",
    statuses: null,
    predicate: (l) => new Date(l.created_at).getTime() >= startOfTodayIso(),
  },
  {
    key: "inativos_7d",
    label: "Sem mexer · 7d",
    group: "atencao",
    statuses: null,
    predicate: (l) =>
      l.commercial_status !== "arquivado" &&
      new Date(l.last_interaction).getTime() < daysAgoMs(7),
  },
  {
    key: "lead_magnet_ativo",
    label: "Lead-magnet activo",
    group: "atencao",
    statuses: null,
    predicate: (l) => l.lead_magnet?.status === "active",
  },
  {
    key: "marketing_ok",
    label: "Aceitou marketing",
    group: "atencao",
    statuses: null,
    predicate: (l) => l.marketing_consent === true,
  },
];

export function matchesChip(lead: EnrichedLead, key: FilterChipKey): boolean {
  const chip = FILTER_CHIPS.find((c) => c.key === key);
  if (!chip) return true;
  if (chip.statuses && !chip.statuses.includes(lead.commercial_status)) return false;
  if (chip.predicate && !chip.predicate(lead)) return false;
  return true;
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