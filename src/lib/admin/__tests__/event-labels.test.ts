import { describe, it, expect } from "vitest";
import { EVENT_LABELS, getEventLabel, humanizeEventType } from "../event-labels";

describe("humanizeEventType", () => {
  it("converte underscores e aplica sentence case", () => {
    expect(humanizeEventType("foo_bar_baz")).toBe("Foo bar baz");
  });
  it("devolve string vazia para input vazio", () => {
    expect(humanizeEventType("")).toBe("");
  });
});

describe("getEventLabel", () => {
  it("devolve label pt-PT para eventos conhecidos", () => {
    expect(getEventLabel("unlock_completed")).toBe("Relatório desbloqueado");
    expect(getEventLabel("brevo_contact_synced")).toBe("Contacto sincronizado com Brevo");
    expect(getEventLabel("report_summary_email_sent")).toBe("Resumo do relatório enviado");
    expect(getEventLabel("beta_welcome_email_sent")).toBe("Email de boas-vindas enviado");
  });
  it("faz fallback humanizado para eventos desconhecidos", () => {
    expect(getEventLabel("evento_desconhecido_qualquer")).toBe("Evento desconhecido qualquer");
  });
});

describe("EVENT_LABELS coverage", () => {
  const required = [
    "unlock_email_submitted","unlock_completed","returning_lead_detected","report_saved_to_account",
    "brevo_contact_synced","brevo_contact_sync_failed","personal_area_email_sent","personal_area_email_failed",
    "beta_welcome_email_sent","beta_welcome_email_failed","report_summary_email_sent","report_summary_email_failed",
    "brevo_email_sent","brevo_email_failed","resend_fallback_email_sent","resend_fallback_email_failed",
    "request_received_email_sent","request_received_email_failed","report_link_sent","feedback_requested",
    "feedback_started","feedback_submitted","commercial_followup_sent","commercial_followup_failed",
    "pricing_clicked","pricing_option_clicked","report_viewed","report_generated","beta_request_created",
    "lead_status_changed","request_status_changed",
  ];
  it.each(required)("tem label para %s", (key) => {
    expect(EVENT_LABELS[key]).toBeTruthy();
  });
});
