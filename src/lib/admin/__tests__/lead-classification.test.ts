import { describe, it, expect } from "vitest";
import {
  isQaLead,
  isHotLead,
  suggestedAction,
  priorityScore,
} from "../lead-classification";
import type { EnrichedLead } from "../kanban-columns";

const NOW = new Date("2026-06-01T12:00:00Z").getTime();
const hoursAgo = (h: number) => new Date(NOW - h * 36e5).toISOString();

function lead(overrides: Partial<EnrichedLead> = {}): EnrichedLead {
  return {
    id: "x",
    email: "user@example.com",
    name: "Alice",
    handle: null,
    phone: null,
    user_type: null,
    purpose: null,
    company: null,
    profile_ownership: null,
    source: "public_report_gate",
    beta_consent: false,
    beta_consent_at: null,
    commercial_status: "novo_pedido",
    internal_notes: null,
    contacted_at: null,
    archived_at: null,
    report_status: null,
    pdf_status: null,
    report_cost_usd: null,
    report_views: 0,
    last_interaction: hoursAgo(1),
    created_at: hoursAgo(1),
    report_request_id: null,
    feedback: null,
    lead_magnet: null,
    marketing_consent: false,
    is_lead_magnet_subscriber: false,
    payment_summary: {
      has_pending: false,
      paid_products: [],
      last_payment_at: null,
      pending_checkout_started_at: null,
      total_paid_cents: 0,
    },
    credits_granted: 0,
    credits_used: 0,
    credits_remaining: 0,
    ...overrides,
  };
}

describe("isQaLead", () => {
  it("reconhece source qa / qa_*", () => {
    expect(isQaLead(lead({ source: "qa" }))).toBe(true);
    expect(isQaLead(lead({ source: "qa_audit" }))).toBe(true);
    expect(isQaLead(lead({ source: "public_report_gate" }))).toBe(false);
  });

  it("reconhece padrões de email", () => {
    expect(isQaLead(lead({ email: "fred+qa@x.pt" }))).toBe(true);
    expect(isQaLead(lead({ email: "qa.audit@x.pt" }))).toBe(true);
    expect(isQaLead(lead({ email: "real@cliente.pt" }))).toBe(false);
  });

  it("reconhece nome com palavra QA", () => {
    expect(isQaLead(lead({ name: "QA Audit Run" }))).toBe(true);
    expect(isQaLead(lead({ name: "Quartiago" }))).toBe(false);
  });
});

describe("isHotLead", () => {
  it("exige report visto + sem feedback + ≥48h", () => {
    expect(
      isHotLead(
        lead({ report_views: 1, last_interaction: hoursAgo(72) }),
        NOW,
      ),
    ).toBe(true);
  });
  it("falso se nunca viu", () => {
    expect(
      isHotLead(
        lead({ report_views: 0, last_interaction: hoursAgo(72) }),
        NOW,
      ),
    ).toBe(false);
  });
  it("falso se já respondeu feedback", () => {
    expect(
      isHotLead(
        lead({
          report_views: 1,
          last_interaction: hoursAgo(72),
          feedback: {
            id: "f",
            usefulness_score: 4,
            clarity_text: null,
            missing_text: null,
            purchase_intent: "talvez",
            pricing_preference: null,
            contact_consent: false,
            created_at: hoursAgo(1),
          },
        }),
        NOW,
      ),
    ).toBe(false);
  });
  it("falso se < 48h", () => {
    expect(
      isHotLead(
        lead({ report_views: 1, last_interaction: hoursAgo(10) }),
        NOW,
      ),
    ).toBe(false);
  });
});

describe("suggestedAction", () => {
  it("crédito esgotado tem prioridade sobre hot", () => {
    const l = lead({
      report_views: 1,
      last_interaction: hoursAgo(72),
      credits_granted: 2,
      credits_remaining: 0,
    });
    expect(suggestedAction(l, NOW).key).toBe("oferecer_pack");
  });
  it("hot → pedir_feedback", () => {
    const l = lead({
      report_views: 1,
      last_interaction: hoursAgo(72),
      credits_granted: 2,
      credits_remaining: 1,
    });
    expect(suggestedAction(l, NOW).key).toBe("pedir_feedback");
  });
  it("default → ver", () => {
    expect(suggestedAction(lead(), NOW).key).toBe("ver");
  });
  it("não sugere pack quando granted=0", () => {
    expect(
      suggestedAction(
        lead({ credits_granted: 0, credits_remaining: 0 }),
        NOW,
      ).key,
    ).toBe("ver");
  });
});

describe("priorityScore", () => {
  it("crédito esgotado=3 > hot=2 > recente=1 > resto=0", () => {
    const exhausted = lead({
      credits_granted: 2,
      credits_remaining: 0,
    });
    const hot = lead({
      report_views: 1,
      last_interaction: hoursAgo(72),
    });
    const fresh = lead({ created_at: hoursAgo(2) });
    const old = lead({ created_at: hoursAgo(200) });

    expect(priorityScore(exhausted, NOW)).toBe(3);
    expect(priorityScore(hot, NOW)).toBe(2);
    expect(priorityScore(fresh, NOW)).toBe(1);
    expect(priorityScore(old, NOW)).toBe(0);
  });
});