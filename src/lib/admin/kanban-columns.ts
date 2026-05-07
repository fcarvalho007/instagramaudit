/**
 * Kanban column definitions for the beta leads pipeline.
 */

export interface KanbanColumnDef {
  key: string;
  label: string;
  color: string;
}

export const KANBAN_COLUMNS: KanbanColumnDef[] = [
  { key: "novo_pedido", label: "Novo pedido", color: "#534AB7" },
  { key: "em_analise", label: "Em análise", color: "#BA7517" },
  { key: "relatorio_gerado", label: "Relatório gerado", color: "#185FA5" },
  { key: "relatorio_visto", label: "Relatório visto", color: "#1D9E75" },
  { key: "feedback_pedido", label: "Feedback pedido", color: "#D85A30" },
  { key: "interessado", label: "Interessado", color: "#3B82F6" },
  { key: "potencial_cliente", label: "Potencial cliente", color: "#EF9F27" },
  { key: "convertido", label: "Convertido", color: "#059669" },
  { key: "arquivado", label: "Arquivado", color: "#888780" },
];

export interface EnrichedLead {
  id: string;
  email: string;
  name: string;
  handle: string | null;
  user_type: string | null;
  purpose: string | null;
  company: string | null;
  profile_ownership: string | null;
  source: string;
  beta_consent: boolean;
  beta_consent_at: string | null;
  commercial_status: string;
  internal_notes: string | null;
  contacted_at: string | null;
  archived_at: string | null;
  report_status: string | null;
  pdf_status: string | null;
  report_cost_usd: number | null;
  report_views: number;
  last_interaction: string;
  created_at: string;
}