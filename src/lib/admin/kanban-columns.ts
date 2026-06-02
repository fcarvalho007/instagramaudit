/**
 * Kanban column definitions for the leads pipeline.
 *
 * As 5 colunas visíveis representam o funil de receita:
 * Lead Magnet → Checkout iniciado → Pagou Report (7€) → Pack 5 (28€) → Expirado.
 *
 * O `commercial_status` em DB pode conter valores legados (`novo_pedido`,
 * `em_analise`, ...). Quem pinta o board deve usar `deriveKanbanColumn(lead)`,
 * NÃO `lead.commercial_status` directamente.
 */

export interface KanbanColumnDef {
  key: string;
  label: string;
  color: string;
  /** Tipografia secundária do badge no header (eyebrow). */
  hint?: string;
}

export const KANBAN_COLUMNS: KanbanColumnDef[] = [
  { key: "lead_magnet", label: "Subscreveu Lead Magnet", color: "#3772E5", hint: "Topo do funil" },
  { key: "checkout_iniciado", label: "Checkout iniciado · €", color: "#7664E4", hint: "Pendente" },
  { key: "pago_report", label: "Pagou 1 report · 7€", color: "#1D9E75", hint: "Cliente" },
  { key: "pago_pack5", label: "Pagou Pack 5 · 28€", color: "#059669", hint: "Cliente recorrente" },
  { key: "expirado", label: "Expirado / Cancelado", color: "#888780", hint: "Fora do funil" },
];

/**
 * Opções completas para o `Select` da ficha de detalhe. Inclui as 5 novas
 * + os estados legados (agrupados como "Legado") para permitir editar leads
 * antigos sem perder informação.
 */
export const COMMERCIAL_STATUS_OPTIONS: Array<{
  group: "Funil" | "Legado";
  key: string;
  label: string;
  color: string;
}> = [
  { group: "Funil", key: "lead_magnet", label: "Subscreveu Lead Magnet", color: "#3772E5" },
  { group: "Funil", key: "checkout_iniciado", label: "Checkout iniciado · €", color: "#7664E4" },
  { group: "Funil", key: "pago_report", label: "Pagou 1 report · 7€", color: "#1D9E75" },
  { group: "Funil", key: "pago_pack5", label: "Pagou Pack 5 · 28€", color: "#059669" },
  { group: "Funil", key: "expirado", label: "Expirado / Cancelado", color: "#888780" },
  { group: "Legado", key: "novo_pedido", label: "Novo pedido", color: "#534AB7" },
  { group: "Legado", key: "em_analise", label: "Em análise", color: "#BA7517" },
  { group: "Legado", key: "relatorio_gerado", label: "Relatório gerado", color: "#185FA5" },
  { group: "Legado", key: "link_enviado", label: "Link enviado", color: "#3772E5" },
  { group: "Legado", key: "relatorio_visto", label: "Relatório visto", color: "#1D9E75" },
  { group: "Legado", key: "feedback_pedido", label: "Feedback pedido", color: "#D85A30" },
  { group: "Legado", key: "feedback_recebido", label: "Feedback recebido", color: "#0E9488" },
  { group: "Legado", key: "interessado", label: "Interessado", color: "#3B82F6" },
  { group: "Legado", key: "potencial_cliente", label: "Potencial cliente", color: "#EF9F27" },
  { group: "Legado", key: "convertido", label: "Convertido", color: "#059669" },
  { group: "Legado", key: "arquivado", label: "Arquivado", color: "#888780" },
];

export type PaymentProduct = "report_single" | "pack_5";

export interface LeadPaymentSummary {
  /** Existe pelo menos um pagamento `pending`. */
  has_pending: boolean;
  /** Produtos com pagamento `paid` confirmado. */
  paid_products: PaymentProduct[];
  /** ISO da última transição (paid/pending/expired). */
  last_payment_at: string | null;
  /** ISO do último checkout iniciado ainda pendente. */
  pending_checkout_started_at: string | null;
  /** Soma de `amount_cents` (paid). */
  total_paid_cents: number;
}

/**
 * Deriva qual das 5 colunas do board mostra este lead.
 * Devolve `null` se o lead ainda não entrou no funil de receita (ex.: gerou
 * relatório mas sem subscrição ao lead magnet nem checkout).
 */
export function deriveKanbanColumn(
  lead: Pick<
    EnrichedLead,
    "commercial_status" | "payment_summary" | "is_lead_magnet_subscriber"
  >,
): string | null {
  const status = lead.commercial_status;
  const pay = lead.payment_summary;

  // Expirado: arquivado/expirado manual, ou último estado de pagamento foi
  // falha/expiração explícita.
  if (status === "arquivado" || status === "expirado") return "expirado";

  // Pack 5: pagamento confirmado ou status manual.
  if (status === "pago_pack5" || pay?.paid_products.includes("pack_5")) {
    return "pago_pack5";
  }

  // Report individual: pagamento confirmado, status manual,
  // ou legado (potencial_cliente / convertido).
  if (
    status === "pago_report" ||
    status === "convertido" ||
    status === "potencial_cliente" ||
    pay?.paid_products.includes("report_single")
  ) {
    return "pago_report";
  }

  // Checkout iniciado: pagamento pending ou status manual.
  if (status === "checkout_iniciado" || pay?.has_pending) {
    return "checkout_iniciado";
  }

  // Lead magnet: status manual ou subscritor (lead_magnet active/completed
  // ou marketing_consent).
  if (status === "lead_magnet" || lead.is_lead_magnet_subscriber) {
    return "lead_magnet";
  }

  // Ainda não entrou no funil de receita visível.
  return null;
}

export interface EnrichedLead {
  id: string;
  email: string;
  name: string;
  handle: string | null;
  phone: string | null;
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
  /** Subscritor do lead magnet (`lead_magnet.active|completed` OU `marketing_consent=true`). */
  is_lead_magnet_subscriber: boolean;
  /** Resumo de pagamentos (vindo de `lead_payments`). */
  payment_summary: LeadPaymentSummary;
  /** Total de créditos concedidos (SUM(delta>0) em `credit_ledger`). */
  credits_granted: number;
  /** Total de créditos consumidos (SUM(-delta WHERE delta<0)). */
  credits_used: number;
  /** Saldo actual (SUM(delta)). */
  credits_remaining: number;
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