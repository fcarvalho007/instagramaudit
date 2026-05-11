/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LeadsTable } from "../leads-table";
import type { EnrichedLead } from "@/lib/admin/kanban-columns";

function makeLead(overrides: Partial<EnrichedLead> = {}): EnrichedLead {
  return {
    id: "lead-1",
    email: "ana@example.com",
    name: "Ana Silva",
    handle: "ana.silva",
    user_type: null,
    purpose: null,
    company: null,
    profile_ownership: null,
    source: "public_report_gate",
    beta_consent: true,
    beta_consent_at: null,
    commercial_status: "novo_pedido",
    internal_notes: null,
    contacted_at: null,
    archived_at: null,
    report_status: null,
    pdf_status: null,
    report_cost_usd: null,
    report_views: 0,
    last_interaction: "2026-05-01T10:00:00Z",
    created_at: "2026-04-25T10:00:00Z",
    report_request_id: null,
    feedback: null,
    ...overrides,
  };
}

describe("LeadsTable", () => {
  it("renderiza linhas com nome, email e handle", () => {
    render(
      <LeadsTable
        leads={[makeLead(), makeLead({ id: "lead-2", name: "Beto", email: "b@x.pt", handle: null })]}
        onOpenDetail={() => {}}
      />,
    );
    expect(screen.getByText("Ana Silva")).toBeDefined();
    expect(screen.getByText("ana@example.com")).toBeDefined();
    expect(screen.getByText("@ana.silva")).toBeDefined();
    expect(screen.getByText("Beto")).toBeDefined();
  });

  it("mostra estado vazio quando não há leads", () => {
    render(<LeadsTable leads={[]} onOpenDetail={() => {}} />);
    expect(screen.getByText(/Sem contactos/i)).toBeDefined();
  });

  it("chama onOpenDetail ao clicar na linha e no botão Abrir", () => {
    const spy = vi.fn();
    render(<LeadsTable leads={[makeLead()]} onOpenDetail={spy} />);
    fireEvent.click(screen.getByText("Ana Silva"));
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0].id).toBe("lead-1");

    fireEvent.click(screen.getByRole("button", { name: /Abrir/i }));
    expect(spy).toHaveBeenCalledTimes(2);
  });
});
