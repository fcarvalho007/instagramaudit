import { describe, it, expect } from "vitest";
import {
  buildLeadHistoryEntries,
  FEEDBACK_SCORE_EMOJI,
} from "../lead-detail-sheet";
import type { EnrichedLead } from "@/lib/admin/kanban-columns";

const baseLead: EnrichedLead = {
  id: "l1",
  email: "a@b.pt",
  name: "Ana",
  handle: "webhspt",
  phone: null,
  user_type: "brand",
  purpose: "improve_content",
  company: null,
  profile_ownership: "own_profile",
  source: "onboarding_modal",
  beta_consent: true,
  beta_consent_at: null,
  commercial_status: "link_enviado",
  internal_notes: null,
  contacted_at: null,
  archived_at: null,
  report_status: "completed",
  pdf_status: null,
  report_cost_usd: null,
  report_views: 0,
  last_interaction: "2026-06-01T07:16:00Z",
  created_at: "2026-06-01T07:15:00Z",
  report_request_id: "r1",
  feedback: null,
  lead_magnet: null,
  marketing_consent: false,
  is_lead_magnet_subscriber: false,
  payment_summary: {
    total_paid_cents: 0,
    paid_products: [],
    last_payment_at: null,
    has_pending: false,
    pending_checkout_started_at: null,
  } as EnrichedLead["payment_summary"],
  credits_granted: 1,
  credits_used: 1,
  credits_remaining: 0,
  reports_count: 1,
  qualification: null,
  email_domain_class: null,
  gdpr_consent_at: null,
  gdpr_consent_version: null,
  marketing_consent_at: null,
};

function ev(
  id: string,
  type: string,
  iso: string,
  metadata: Record<string, unknown> = {},
) {
  return {
    id,
    event_type: type,
    handle: "webhspt",
    metadata,
    created_at: iso,
  };
}

describe("buildLeadHistoryEntries", () => {
  it("mapeia eventos principais para entradas legíveis em pt-PT", () => {
    const timeline = [
      ev("e1", "beta_request_created", "2026-06-01T07:15:00Z", {
        handle: "webhspt",
      }),
      ev("e2", "report_generated", "2026-06-01T07:16:00Z"),
      ev("e3", "report_link_sent", "2026-06-01T07:16:30Z"),
    ];
    const entries = buildLeadHistoryEntries(baseLead, timeline, "Pedir feedback");
    const labels = entries.map((e) => e.label);
    expect(labels).toContain("Criou conta e pediu análise de @webhspt");
    expect(labels).toContain("Relatório gerado");
    expect(labels).toContain("Email com o link enviado");
  });

  it("adiciona projecção tracejada quando não é estado terminal", () => {
    const entries = buildLeadHistoryEntries(baseLead, [], "Pedir feedback");
    const last = entries[entries.length - 1];
    expect(last.style).toBe("pending");
    expect(last.label).toBe("Pedir feedback");
  });

  it("não mostra projecção quando estado é terminal", () => {
    for (const status of ["convertido", "arquivado", "expirado"] as const) {
      const entries = buildLeadHistoryEntries(
        { ...baseLead, commercial_status: status },
        [],
        "Pedir feedback",
      );
      expect(entries.every((e) => e.style !== "pending")).toBe(true);
    }
  });

  it("colapsa visualizações consecutivas numa única entrada", () => {
    const timeline = [
      ev("v1", "report_viewed", "2026-06-02T10:00:00Z"),
      ev("v2", "report_viewed", "2026-06-02T10:01:00Z"),
      ev("v3", "report_viewed", "2026-06-02T10:02:00Z"),
    ];
    const entries = buildLeadHistoryEntries(baseLead, timeline, "");
    const views = entries.filter((e) => e.label === "Lead abriu o relatório");
    expect(views).toHaveLength(1);
  });

  it("ordena cronologicamente mesmo quando a timeline chega DESC", () => {
    const timeline = [
      ev("e3", "report_link_sent", "2026-06-01T07:16:30Z"),
      ev("e2", "report_generated", "2026-06-01T07:16:00Z"),
      ev("e1", "beta_request_created", "2026-06-01T07:15:00Z"),
    ];
    const entries = buildLeadHistoryEntries(baseLead, timeline, "");
    expect(entries[0].label).toContain("Criou conta");
    expect(entries[1].label).toBe("Relatório gerado");
    expect(entries[2].label).toBe("Email com o link enviado");
  });
});

describe("FEEDBACK_SCORE_EMOJI", () => {
  it("mapeia score 5→😍, 4→😊, 3→🙂, 2→😐, 1→😞", () => {
    expect(FEEDBACK_SCORE_EMOJI[5]).toEqual({ emoji: "😍", label: "Muito útil" });
    expect(FEEDBACK_SCORE_EMOJI[4].emoji).toBe("😊");
    expect(FEEDBACK_SCORE_EMOJI[3].emoji).toBe("🙂");
    expect(FEEDBACK_SCORE_EMOJI[2].emoji).toBe("😐");
    expect(FEEDBACK_SCORE_EMOJI[1].emoji).toBe("😞");
  });

  it("usa labels em pt-PT sem termos técnicos", () => {
    for (const v of Object.values(FEEDBACK_SCORE_EMOJI)) {
      expect(v.label).not.toMatch(/score|rating|useful/i);
    }
  });
});