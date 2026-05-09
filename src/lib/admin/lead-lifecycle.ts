/**
 * Lifecycle helpers for beta CRM leads. Pure functions, no side effects.
 * Safe to import from client and server.
 */

import type { EnrichedLead } from "./kanban-columns";

export const LIFECYCLE_STATUSES = [
  "novo_pedido",
  "em_analise",
  "relatorio_gerado",
  "link_enviado",
  "relatorio_visto",
  "feedback_pedido",
  "feedback_recebido",
  "interessado",
  "potencial_cliente",
  "convertido",
  "arquivado",
] as const;

export type LifecycleStatus = (typeof LIFECYCLE_STATUSES)[number];

export type LifecycleGroup =
  | "aquisicao"
  | "entrega"
  | "qualificacao"
  | "comercial"
  | "arquivado";

export interface LifecycleMeta {
  label: string;
  color: string;
  group: LifecycleGroup;
}

const LIFECYCLE_META: Record<LifecycleStatus, LifecycleMeta> = {
  novo_pedido: { label: "Novo pedido", color: "#534AB7", group: "aquisicao" },
  em_analise: { label: "Em análise", color: "#BA7517", group: "aquisicao" },
  relatorio_gerado: { label: "Relatório gerado", color: "#185FA5", group: "entrega" },
  link_enviado: { label: "Link enviado", color: "#3772E5", group: "entrega" },
  relatorio_visto: { label: "Relatório visto", color: "#1D9E75", group: "entrega" },
  feedback_pedido: { label: "Feedback pedido", color: "#D85A30", group: "qualificacao" },
  feedback_recebido: { label: "Feedback recebido", color: "#0E9488", group: "qualificacao" },
  interessado: { label: "Interessado", color: "#3B82F6", group: "comercial" },
  potencial_cliente: { label: "Potencial cliente", color: "#EF9F27", group: "comercial" },
  convertido: { label: "Convertido", color: "#059669", group: "comercial" },
  arquivado: { label: "Arquivado", color: "#888780", group: "arquivado" },
};

export function getLifecycleMeta(status: string | null | undefined): LifecycleMeta {
  if (status && status in LIFECYCLE_META) {
    return LIFECYCLE_META[status as LifecycleStatus];
  }
  return { label: status ?? "—", color: "#888780", group: "arquivado" };
}

export type SuggestedSeverity = "info" | "action" | "wait" | "done";

export interface SuggestedAction {
  label: string;
  severity: SuggestedSeverity;
}

/**
 * Recommends the next operational step given the current lead state.
 * Used both on the kanban card and the detail sheet.
 */
export function suggestNextLeadAction(
  lead: Pick<EnrichedLead, "commercial_status" | "report_status" | "report_views">
): SuggestedAction {
  switch (lead.commercial_status) {
    case "novo_pedido":
      return { label: "Aprovar pedido e gerar relatório", severity: "action" };
    case "em_analise":
      return { label: "Aguardar geração do relatório", severity: "wait" };
    case "relatorio_gerado":
      return { label: "Enviar link ao lead", severity: "action" };
    case "link_enviado":
      return { label: "Aguardar visualização do relatório", severity: "wait" };
    case "relatorio_visto":
      return { label: "Pedir feedback ao lead", severity: "action" };
    case "feedback_pedido":
      return { label: "Aguardar resposta do lead", severity: "wait" };
    case "feedback_recebido":
      return { label: "Classificar interesse comercial", severity: "action" };
    case "interessado":
      return { label: "Agendar chamada ou demo", severity: "action" };
    case "potencial_cliente":
      return { label: "Enviar proposta comercial", severity: "action" };
    case "convertido":
      return { label: "Configurar conta e onboarding", severity: "done" };
    case "arquivado":
      return { label: "Sem ação — lead arquivado", severity: "info" };
    default:
      return { label: "Sem ação sugerida", severity: "info" };
  }
}

/**
 * Maps incoming product events to the lifecycle status they imply.
 * Reserved for future automatic transitions (Phase 2). No side effects today.
 */
export function mapEventToSuggestedStatus(
  eventType: string
): LifecycleStatus | null {
  switch (eventType) {
    case "report_generated":
      return "relatorio_gerado";
    case "report_link_sent":
      return "link_enviado";
    case "report_viewed":
      return "relatorio_visto";
    case "feedback_requested":
      return "feedback_pedido";
    case "feedback_submitted":
      return "feedback_recebido";
    default:
      return null;
  }
}