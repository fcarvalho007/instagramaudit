/**
 * Etiquetas e cores partilhadas para o estado da sequência lead-magnet.
 * Usado no LeadCard, LeadsTable, PeopleTab e LeadDetailSheet.
 */

import type { LeadMagnetStatus } from "./kanban-columns";

export interface LeadMagnetDisplay {
  label: string;
  variant: "info" | "revenue" | "neutral" | "signal";
  hint: string;
}

export const LEAD_MAGNET_DISPLAY: Record<LeadMagnetStatus, LeadMagnetDisplay> = {
  active: {
    label: "Lead-magnet · activo",
    variant: "info",
    hint: "Welcome enviado, aguarda resumo do relatório.",
  },
  completed: {
    label: "Lead-magnet · completo",
    variant: "revenue",
    hint: "Sequência inicial concluída (welcome + resumo).",
  },
  skipped: {
    label: "Lead-magnet · saltado",
    variant: "neutral",
    hint: "Sequência saltada (sem consentimento de marketing ou kill-switch).",
  },
  none: {
    label: "Lead-magnet · sem envio",
    variant: "neutral",
    hint: "Ainda não houve evento da sequência lead-magnet.",
  },
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  beta_welcome_email_sent: "Welcome enviado",
  report_summary_email_sent: "Resumo enviado",
  lead_magnet_sequence_skipped: "Sequência saltada",
  report_summary_skipped_no_data: "Resumo saltado (sem dados)",
  beta_welcome_email_failed: "Welcome falhou",
  report_summary_email_failed: "Resumo falhou",
};

export function leadMagnetEventLabel(eventType: string | null): string {
  if (!eventType) return "—";
  return EVENT_TYPE_LABELS[eventType] ?? eventType;
}