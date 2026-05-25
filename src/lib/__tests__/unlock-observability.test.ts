import { beforeEach, describe, expect, it, vi } from "vitest";

// ---- recordProductEvent mock --------------------------------------------
const recordProductEvent = vi.fn(async (..._a: any[]) => undefined);
vi.mock("@/lib/tracking.server", () => ({
  recordProductEvent: (...a: any[]) => recordProductEvent(...(a as [any])),
}));

// ---- ensureReportSnapshotForRequest mock --------------------------------
vi.mock("@/lib/report-snapshots/persist-report-snapshot.server", () => ({
  ensureReportSnapshotForRequest: vi.fn(async () => ({ snapshotId: null })),
}));

// ---- dynamic imports inside unlock.server (lifecycle, brevo, lead-magnet)
vi.mock("@/lib/admin/lead-lifecycle", () => ({
  maybeAdvanceLeadStatus: () => null,
}));
vi.mock("@/lib/admin/lead-events.server", () => ({
  updateLeadCommercialStatus: vi.fn(async () => undefined),
}));
vi.mock("@/lib/brevo/sync.server", () => ({
  syncLeadToBrevo: vi.fn(async () => undefined),
}));
const sendLeadMagnetSequence = vi.fn(async (..._a: any[]) => ({
  welcome: "sent",
  summary: "sent",
}));
vi.mock("@/lib/email/lead-magnet-sequence.server", () => ({
  sendLeadMagnetSequence: (...a: any[]) =>
    sendLeadMagnetSequence(...(a as [any])),
}));

// ---- Supabase mock: table-aware -----------------------------------------
interface SupabaseState {
  snapshotExists: boolean;
  existingLead: Record<string, unknown> | null;
  existingReportRequest: Record<string, unknown> | null;
  insertedLeadId: string;
  insertedReportRequestId: string;
}

const state: SupabaseState = {
  snapshotExists: true,
  existingLead: null,
  existingReportRequest: null,
  insertedLeadId: "lead-new",
  insertedReportRequestId: "rr-new",
};

function chain(value: unknown) {
  const p: any = {
    select: () => p,
    eq: () => p,
    gte: () => p,
    limit: () => p,
    single: async () => ({ data: value, error: null }),
    maybeSingle: async () => ({ data: value, error: null }),
    update: () => ({ eq: async () => ({ data: null, error: null }) }),
  };
  return p;
}

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === "analysis_snapshots") {
        return chain(state.snapshotExists ? { id: "snap-1" } : null);
      }
      if (table === "leads") {
        const base = chain(state.existingLead);
        base.insert = (_row: unknown) => ({
          select: () => ({
            single: async () => ({
              data: { id: state.insertedLeadId },
              error: null,
            }),
          }),
        });
        base.update = () => ({ eq: async () => ({ data: null, error: null }) });
        return base;
      }
      if (table === "report_requests") {
        const base = chain(state.existingReportRequest);
        base.insert = (_row: unknown) => ({
          select: () => ({
            single: async () => ({
              data: { id: state.insertedReportRequestId },
              error: null,
            }),
          }),
        });
        return base;
      }
      if (table === "product_events") {
        // dedup query returns no prior row
        return chain(null);
      }
      return chain(null);
    },
  },
}));

import { processReportUnlock } from "@/lib/unlock.server";

const baseInput = {
  email: "ana@example.com",
  instagram_username: "frederico.m.carvalho",
  analysis_snapshot_id: "11111111-2222-3333-4444-555555555555",
  gdpr_consent: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  state.snapshotExists = true;
  state.existingLead = null;
  state.existingReportRequest = null;
  state.insertedLeadId = "lead-new";
  state.insertedReportRequestId = "rr-new";
});

describe("processReportUnlock observability", () => {
  it("emits lead_magnet_sequence_not_invoked when an existing report_request is found", async () => {
    state.existingLead = {
      id: "lead-existing",
      user_type: null,
      purpose: null,
      profile_ownership: null,
      pricing_preference: null,
      name: null,
      beta_consent: false,
      marketing_consent: false,
    };
    state.existingReportRequest = {
      id: "rr-existing",
      metadata: {},
    };

    const result = await processReportUnlock(baseInput);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.created_report_request).toBe(false);
    expect(result.report_request_id).toBe("rr-existing");

    const notInvoked = recordProductEvent.mock.calls
      .map((c: any[]) => c[0])
      .filter((e: any) => e.eventType === "lead_magnet_sequence_not_invoked");
    expect(notInvoked).toHaveLength(1);
    expect(notInvoked[0].leadId).toBe("lead-existing");
    expect(notInvoked[0].snapshotId).toBe(baseInput.analysis_snapshot_id);
    expect(notInvoked[0].handle).toBe(baseInput.instagram_username);
    expect(notInvoked[0].metadata).toMatchObject({
      reason: "returning_lead_existing_report_request",
      lead_id: "lead-existing",
      report_request_id: "rr-existing",
      analysis_snapshot_id: baseInput.analysis_snapshot_id,
      email_normalized: "ana@example.com",
      transactional_delivery: false,
    });

    // Lead-magnet sequence must NOT be invoked for returning report_requests.
    expect(sendLeadMagnetSequence).not.toHaveBeenCalled();
  });

  it("does NOT emit lead_magnet_sequence_not_invoked when a new report_request is created", async () => {
    state.existingLead = null;
    state.existingReportRequest = null;

    const result = await processReportUnlock(baseInput);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.created_report_request).toBe(true);

    const notInvokedTypes = recordProductEvent.mock.calls
      .map((c: any[]) => c[0].eventType)
      .filter((t: string) => t === "lead_magnet_sequence_not_invoked");
    expect(notInvokedTypes).toHaveLength(0);

    // Normal lead-magnet sequence path is invoked for new report_requests.
    // Wait a microtask for the fire-and-forget void async IIFE in unlock.server.
    await new Promise((r) => setTimeout(r, 0));
    expect(sendLeadMagnetSequence).toHaveBeenCalledTimes(1);
  });
});