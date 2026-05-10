import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LeadCommunicationTimeline, type CommunicationTimelineEvent } from "../lead-communication-timeline";

function ev(partial: Partial<CommunicationTimelineEvent> & { id: string; event_type: string }): CommunicationTimelineEvent {
  return {
    handle: "frederico.m.carvalho",
    metadata: {},
    created_at: new Date().toISOString(),
    ...partial,
  };
}

describe("LeadCommunicationTimeline", () => {
  it("renders empty state with the spec copy", () => {
    render(<LeadCommunicationTimeline timeline={[]} loading={false} />);
    expect(screen.getByText("Ainda não há comunicações registadas.")).toBeTruthy();
  });

  it("shows loading state", () => {
    render(<LeadCommunicationTimeline timeline={[]} loading={true} />);
    expect(screen.getByText(/A carregar/)).toBeTruthy();
  });

  it("renders the four new email events with correct labels and badges", () => {
    const events: CommunicationTimelineEvent[] = [
      ev({ id: "1", event_type: "request_received_email_sent", metadata: { message_id: "msg_abc123def456" } }),
      ev({ id: "2", event_type: "request_received_email_failed", metadata: { http_status: 403 } }),
      ev({ id: "3", event_type: "personal_area_email_sent", metadata: { recipient: "user@example.com" } }),
      ev({ id: "4", event_type: "personal_area_email_failed", metadata: { reason: "RESEND_403" } }),
    ];
    render(<LeadCommunicationTimeline timeline={events} loading={false} />);
    expect(screen.getByText("Confirmação de pedido enviada")).toBeTruthy();
    expect(screen.getByText("Falha na confirmação de pedido")).toBeTruthy();
    expect(screen.getByText("Email da área pessoal enviado")).toBeTruthy();
    expect(screen.getByText("Falha no email da área pessoal")).toBeTruthy();
    // Failure surfaces
    expect(screen.getByText("Erro: HTTP 403")).toBeTruthy();
    expect(screen.getByText("Erro: RESEND_403")).toBeTruthy();
    // Recipient
    expect(screen.getByText("Para: user@example.com")).toBeTruthy();
    // Badges
    expect(screen.getAllByText("Enviado").length).toBe(2);
    expect(screen.getAllByText("Falhou").length).toBe(2);
  });

  it("filters out non-communication events (e.g. report_viewed)", () => {
    const events: CommunicationTimelineEvent[] = [
      ev({ id: "1", event_type: "report_viewed" }),
      ev({ id: "2", event_type: "report_link_sent" }),
    ];
    render(<LeadCommunicationTimeline timeline={events} loading={false} />);
    expect(screen.queryByText(/Relatório aberto/)).toBeNull();
    expect(screen.getByText("Link do relatório enviado")).toBeTruthy();
  });
});
