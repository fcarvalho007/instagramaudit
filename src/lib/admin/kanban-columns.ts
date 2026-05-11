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
  { key: "link_enviado", label: "Link enviado", color: "#3772E5" },
  { key: "relatorio_visto", label: "Relatório visto", color: "#1D9E75" },
  { key: "feedback_pedido", label: "Feedback pedido", color: "#D85A30" },
  { key: "feedback_recebido", label: "Feedback recebido", color: "#0E9488" },
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
  report_request_id: string | null;
  feedback: BetaFeedbackSummary | null;
  lead_magnet: LeadMagnetState | null;
  marketing_consent: boolean;
}

export interface BetaFeedbackSummary {
  id: string;
  usefulness_score: number;
  clarity_text: string | null;
  missing_text: string | null;
  purchase_intent: "sim" | "talvez" | "nao";
  pricing_preference: string | null;
  contact_consent: boolean;
  created_at: string;
}

export type LeadMagnetStatus = "active" | "completed" | "skipped" | "none";

export interface LeadMagnetState {
  status: LeadMagnetStatus;
  last_event_at: string | null;
  last_event_type: string | null;
  sent_count: number;
}