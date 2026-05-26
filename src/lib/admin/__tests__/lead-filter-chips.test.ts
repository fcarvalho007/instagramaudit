import { describe, it, expect } from "vitest";
import {
  matchesChip,
  matchesQuery,
  FILTER_CHIPS,
} from "../lead-filter-chips";
import type { EnrichedLead } from "../kanban-columns";

function lead(overrides: Partial<EnrichedLead> = {}): EnrichedLead {
  return {
    id: "x",
    email: "ana@example.com",
    name: "Ana Silva",
    handle: "anasilva",
    user_type: null,
    commercial_status: "novo_pedido",
    internal_notes: null,
    contacted_at: null,
    last_interaction: new Date().toISOString(),
    created_at: new Date().toISOString(),
    report_request_id: null,
    feedback: null,
    ...overrides,
  } as EnrichedLead;
}

describe("FILTER_CHIPS", () => {
  it("inclui chave 'todos' como primeiro chip", () => {
    expect(FILTER_CHIPS[0].key).toBe("todos");
  });
});

describe("matchesChip", () => {
  it("'todos' aceita qualquer estado", () => {
    expect(matchesChip(lead({ commercial_status: "arquivado" }), "todos")).toBe(true);
  });
  it("'expirados' aceita arquivado/expirado e nada mais", () => {
    expect(matchesChip(lead({ commercial_status: "arquivado" }), "expirados")).toBe(true);
    expect(matchesChip(lead({ commercial_status: "expirado" }), "expirados")).toBe(true);
    expect(matchesChip(lead({ commercial_status: "pago_report" }), "expirados")).toBe(false);
  });
  it("'pagaram' aceita leads com pagamento confirmado", () => {
    expect(
      matchesChip(
        lead({
          commercial_status: "pago_report",
          payment_summary: {
            has_pending: false,
            paid_products: ["report_single"],
            last_payment_at: new Date().toISOString(),
            pending_checkout_started_at: null,
            total_paid_cents: 700,
          },
        }),
        "pagaram",
      ),
    ).toBe(true);
    expect(matchesChip(lead({ commercial_status: "novo_pedido" }), "pagaram")).toBe(false);
  });
});

describe("matchesQuery", () => {
  it("query vazia aceita tudo", () => {
    expect(matchesQuery(lead(), "")).toBe(true);
    expect(matchesQuery(lead(), "   ")).toBe(true);
  });
  it("encontra por nome (case-insensitive)", () => {
    expect(matchesQuery(lead({ name: "Ana Silva" }), "ana")).toBe(true);
    expect(matchesQuery(lead({ name: "Ana Silva" }), "SILVA")).toBe(true);
  });
  it("encontra por email", () => {
    expect(matchesQuery(lead({ email: "ana@example.com" }), "example")).toBe(true);
  });
  it("encontra por handle", () => {
    expect(matchesQuery(lead({ handle: "anasilva" }), "anasil")).toBe(true);
  });
  it("não encontra termos inexistentes", () => {
    expect(matchesQuery(lead(), "zzz")).toBe(false);
  });
  it("lida com name/handle null", () => {
    expect(matchesQuery(lead({ name: "", handle: null }), "ana")).toBe(true); // email match
    expect(matchesQuery(lead({ name: "", handle: null, email: "x@y.pt" }), "ana")).toBe(false);
  });
});