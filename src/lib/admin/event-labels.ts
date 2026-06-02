/**
 * Centralised pt-PT labels for product/admin event types.
 * Used by the CRM timeline and any other admin surface that renders
 * raw `event_type` strings.
 */

export const EVENT_LABELS: Record<string, string> = {
  // Unlock / lead lifecycle
  unlock_email_submitted: "Email submetido para desbloqueio",
  unlock_completed: "Relatório desbloqueado",
  unlock_clicked: "CTA de desbloqueio clicado",
  returning_lead_detected: "Lead recorrente detetado",
  report_saved_to_account: "Relatório guardado na conta",

  // Brevo
  brevo_contact_synced: "Contacto sincronizado com Brevo",
  brevo_contact_sync_failed: "Falha na sincronização Brevo",
  brevo_email_sent: "Email Brevo enviado",
  brevo_email_failed: "Falha no envio de email Brevo",

  // Transactional emails
  personal_area_email_sent: "Email da área pessoal enviado",
  personal_area_email_failed: "Falha no envio do email da área pessoal",
  beta_welcome_email_sent: "Email de boas-vindas enviado",
  beta_welcome_email_failed: "Falha no envio do email de boas-vindas",
  report_summary_email_sent: "Resumo do relatório enviado",
  report_summary_email_failed: "Falha no envio do resumo do relatório",
  resend_fallback_email_sent: "Email Resend (fallback) enviado",
  resend_fallback_email_failed: "Falha no envio do email Resend (fallback)",
  request_received_email_sent: "Email de pedido recebido enviado",
  request_received_email_failed: "Falha no envio do email de pedido recebido",
  report_link_sent: "Link do relatório enviado",

  // Feedback
  feedback_requested: "Feedback pedido ao lead",
  feedback_started: "Feedback iniciado pelo lead",
  feedback_submitted: "Feedback submetido pelo lead",

  // Comercial
  commercial_followup_sent: "Follow-up comercial enviado",
  commercial_followup_failed: "Falha no envio do follow-up comercial",

  // Pricing
  pricing_clicked: "Preço clicado",
  pricing_option_clicked: "Opção de preço clicada",

  // Premium CTA (unified — relatório público)
  premium_cta_clicked: "CTA premium clicado",
  premium_window_interest: "Janela temporal premium aberta",

  // Report / pedido
  report_viewed: "Relatório visualizado",
  report_generated: "Relatório gerado",
  beta_request_created: "Pedido beta criado",
  lead_status_changed: "Estado comercial alterado",
  request_status_changed: "Estado do pedido alterado",

  // Outros já existentes
  module_visibility_published: "Visibilidade publicada",
  public_report_link_copied: "Link público copiado",
};

/**
 * Fallback humano para event types não mapeados:
 * substitui underscores por espaços e aplica sentence case.
 */
export function humanizeEventType(eventType: string): string {
  if (!eventType) return "";
  const normalized = eventType.replace(/_/g, " ").trim().toLowerCase();
  if (!normalized) return "";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

/** Devolve o label pt-PT do evento, com fallback legível. */
export function getEventLabel(eventType: string): string {
  return EVENT_LABELS[eventType] ?? humanizeEventType(eventType);
}
