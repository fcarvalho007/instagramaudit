/**
 * Fonte única dos chips de filtro de Contactos.
 *
 * Partilhado entre `KanbanBoard` (vista Pipeline) e `LeadsTable` (vista Tabela)
 * para garantir coerência semântica entre as duas vistas.
 */

import type { EnrichedLead } from "./kanban-columns";
import { deriveKanbanColumn } from "./kanban-columns";
import { isHotLead, isQaLead } from "./lead-classification";

export type FilterChipKey =
  | "todos"
  | "sem_pagar"
  | "pagaram"
  | "expirados"
  | "novos_hoje"
  | "checkout_abandonado"
  | "pagaram_semana"
  | "lm_ativo_sem_ler"
  | "candidato_pack"
  | "quentes"
  | "credito_esgotado"
  | "sem_feedback";

export type FilterChipGroup = "estado" | "atencao" | "tabela";

export interface FilterChip {
  key: FilterChipKey;
  label: string;
  group: FilterChipGroup;
  /** Colunas do board aceites; `null` = todas. */
  columns: string[] | null;
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
  { key: "todos", label: "Todos", group: "estado", columns: null },
  {
    key: "sem_pagar",
    label: "Sem pagar",
    group: "estado",
    columns: ["lead_magnet", "checkout_iniciado"],
  },
  {
    key: "pagaram",
    label: "Pagaram",
    group: "estado",
    columns: ["pago_report", "pago_pack5"],
  },
  {
    key: "expirados",
    label: "Expirados",
    group: "estado",
    columns: ["expirado"],
  },
  {
    key: "novos_hoje",
    label: "Novos hoje",
    group: "atencao",
    columns: null,
    predicate: (l) => new Date(l.created_at).getTime() >= startOfTodayIso(),
  },
  {
    key: "checkout_abandonado",
    label: "Checkout abandonado · 24h",
    group: "atencao",
    columns: null,
    predicate: (l) => {
      const t = l.payment_summary?.pending_checkout_started_at;
      return !!t && new Date(t).getTime() < daysAgoMs(1);
    },
  },
  {
    key: "pagaram_semana",
    label: "Pagaram esta semana",
    group: "atencao",
    columns: null,
    predicate: (l) => {
      const t = l.payment_summary?.last_payment_at;
      const paid = (l.payment_summary?.paid_products?.length ?? 0) > 0;
      return paid && !!t && new Date(t).getTime() >= daysAgoMs(7);
    },
  },
  {
    key: "lm_ativo_sem_ler",
    label: "LM activo · sem ler · 3d",
    group: "atencao",
    columns: null,
    predicate: (l) =>
      l.is_lead_magnet_subscriber &&
      l.report_views === 0 &&
      new Date(l.last_interaction).getTime() < daysAgoMs(3),
  },
  {
    key: "candidato_pack",
    label: "Candidato a Pack",
    group: "atencao",
    columns: null,
    predicate: (l) => {
      const pay = l.payment_summary;
      if (!pay) return false;
      const hasReport = pay.paid_products.includes("report_single");
      const hasPack = pay.paid_products.includes("pack_5");
      if (!hasReport || hasPack) return false;
      return !!pay.last_payment_at &&
        new Date(pay.last_payment_at).getTime() < daysAgoMs(14);
    },
  },
  // ─── Chips exclusivos da vista Tabela (não renderizados no Kanban) ───
  {
    key: "quentes",
    label: "Quentes",
    group: "tabela",
    columns: null,
    predicate: (l) => isHotLead(l),
  },
  {
    key: "credito_esgotado",
    label: "Crédito esgotado",
    group: "tabela",
    columns: null,
    predicate: (l) =>
      (l.credits_granted ?? 0) > 0 && (l.credits_remaining ?? 0) <= 0,
  },
  {
    key: "sem_feedback",
    label: "Sem feedback",
    group: "tabela",
    columns: null,
    predicate: (l) => (l.report_views ?? 0) > 0 && !l.feedback,
  },
];

export function matchesChip(lead: EnrichedLead, key: FilterChipKey): boolean {
  const chip = FILTER_CHIPS.find((c) => c.key === key);
  if (!chip) return true;
  if (chip.columns) {
    const col = deriveKanbanColumn(lead);
    if (!col || !chip.columns.includes(col)) return false;
  }
  if (chip.predicate && !chip.predicate(lead)) return false;
  return true;
}

export { isQaLead };

export function matchesQuery(lead: EnrichedLead, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    (!!lead.name && lead.name.toLowerCase().includes(q)) ||
    lead.email.toLowerCase().includes(q) ||
    (!!lead.handle && lead.handle.toLowerCase().includes(q))
  );
}