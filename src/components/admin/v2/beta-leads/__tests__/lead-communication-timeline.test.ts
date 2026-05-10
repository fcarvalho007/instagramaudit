import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LeadCommunicationTimeline, type CommunicationTimelineEvent } from "../lead-communication-timeline";

function ev(partial: Partial<CommunicationTimelineEvent> & { id: string; event_type: string }): CommunicationTimelineEvent {
  return {
    handle: "frederico.m.carvalho",
    metadata: {},
    created_at: new Date().toISOString(),
    ...partial,
  };
}

function html(events: CommunicationTimelineEvent[], loading = false): string {
  return renderToStaticMarkup(
    createElement(LeadCommunicationTimeline, { timeline: events, loading }),
  );
}

describe("LeadCommunicationTimeline", () => {
  it("renders empty state with the spec copy", () => {
    expect(html([])).toContain("Ainda não há comunicações registadas.");
  });

  it("shows loading state", () => {
    expect(html([], true)).toContain("A carregar");
  });

  it("renders the four new email events with labels, badges and failure reasons", () => {
    const out = html([
      ev({ id: "1", event_type: "request_received_email_sent", metadata: { message_id: "msg_abc123def456" } }),
      ev({ id: "2", event_type: "request_received_email_failed", metadata: { http_status: 403 } }),
      ev({ id: "3", event_type: "personal_area_email_sent", metadata: { recipient: "user@example.com" } }),
      ev({ id: "4", event_type: "personal_area_email_failed", metadata: { reason: "RESEND_403" } }),
    ]);
    expect(out).toContain("Confirmação de pedido enviada");
    expect(out).toContain("Falha na confirmação de pedido");
    expect(out).toContain("Email da área pessoal enviado");
    expect(out).toContain("Falha no email da área pessoal");
    expect(out).toContain("Erro: HTTP 403");
    expect(out).toContain("Erro: RESEND_403");
    expect(out).toContain("Para: user@example.com");
    // 2 sent + 2 failed badges
    expect((out.match(/>Enviado</g) ?? []).length).toBe(2);
    expect((out.match(/>Falhou</g) ?? []).length).toBe(2);
  });

  it("filters out non-communication events (e.g. report_viewed)", () => {
    const out = html([
      ev({ id: "1", event_type: "report_viewed" }),
      ev({ id: "2", event_type: "report_link_sent" }),
    ]);
    expect(out).not.toContain("Relatório aberto");
    expect(out).toContain("Link do relatório enviado");
  });
});
