import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mocks
const mockUpsert = vi.fn();
const mockRecord = vi.fn();

const fromMock = vi.fn();
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: { from: (...args: unknown[]) => fromMock(...args) },
}));

vi.mock("@/lib/tracking.server", () => ({
  recordProductEvent: (...args: unknown[]) => mockRecord(...args),
}));

vi.mock("../contacts.server", () => ({
  upsertBrevoContact: (...args: unknown[]) => mockUpsert(...args),
}));

import { syncLeadToBrevo } from "../sync.server";

function setupSupabase(opts: {
  lead?: any;
  leadError?: any;
  latestRR?: any;
  count?: number;
}) {
  fromMock.mockImplementation((table: string) => {
    if (table === "leads") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: opts.lead ?? null,
              error: opts.leadError ?? null,
            }),
          }),
        }),
      };
    }
    if (table === "report_requests") {
      return {
        select: (_cols: string, options?: { count?: string; head?: boolean }) => {
          if (options?.head) {
            return {
              eq: async () => ({ count: opts.count ?? 0 }),
            };
          }
          return {
            eq: () => ({
              order: () => ({
                limit: () => ({
                  maybeSingle: async () => ({ data: opts.latestRR ?? null }),
                }),
              }),
            }),
          };
        },
      };
    }
    throw new Error(`Unexpected table: ${table}`);
  });
}

beforeEach(() => {
  mockUpsert.mockReset();
  mockRecord.mockReset();
  fromMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("syncLeadToBrevo", () => {
  it("builds full attribute payload and records success event", async () => {
    setupSupabase({
      lead: {
        id: "lead-1",
        email: "Joao@Example.com",
        source: "public_report_unlock",
        commercial_status: "lead",
        profile_ownership: "own_profile",
        goal: "improve_content",
        user_type: "creator",
        pricing_preference: "below_20",
      },
      latestRR: {
        id: "rr-1",
        instagram_username: "joao",
        analysis_snapshot_id: "snap-1",
        created_at: "2026-05-10T10:00:00Z",
      },
      count: 3,
    });
    mockUpsert.mockResolvedValue({ ok: true, brevoId: 999, status: 201 });

    const out = await syncLeadToBrevo("lead-1", "report_unlock");

    expect(out.ok).toBe(true);
    expect(mockUpsert).toHaveBeenCalledTimes(1);
    const payload = mockUpsert.mock.calls[0][0];
    expect(payload.email).toBe("Joao@Example.com");
    expect(payload.attributes).toMatchObject({
      INSTAGRAM_HANDLE: "joao",
      REPORTS_COUNT: 3,
      LAST_REPORT_URL: expect.stringContaining("/analyze/joao"),
      LAST_REPORT_AT: "2026-05-10T10:00:00Z",
      PROFILE_OWNERSHIP: "own_profile",
      GOAL: "improve_content",
      USER_TYPE: "creator",
      PRICING_PREFERENCE: "below_20",
      LEAD_SOURCE: "public_report_unlock",
      COMMERCIAL_STATUS: "lead",
      IS_CUSTOMER: false,
    });

    expect(mockRecord).toHaveBeenCalledTimes(1);
    const evt = mockRecord.mock.calls[0][0];
    expect(evt.eventType).toBe("brevo_contact_synced");
    expect(evt.leadId).toBe("lead-1");
    expect(evt.snapshotId).toBe("snap-1");
    expect(evt.metadata.brevo_id).toBe(999);
    expect(evt.metadata.email_masked).toBe("J***@Example.com");
    expect(evt.metadata.sync_reason).toBe("report_unlock");
  });

  it("records failure with LEAD_NOT_FOUND when lead missing", async () => {
    setupSupabase({ lead: null });
    const out = await syncLeadToBrevo("missing", "report_unlock");
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toBe("LEAD_NOT_FOUND");
    expect(mockUpsert).not.toHaveBeenCalled();
    expect(mockRecord).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "brevo_contact_sync_failed" }),
    );
  });

  it("propagates upsert failure reason and records failure event", async () => {
    setupSupabase({
      lead: { id: "lead-2", email: "x@y.com" },
      latestRR: null,
      count: 0,
    });
    mockUpsert.mockResolvedValue({ ok: false, reason: "BREVO_500:boom" });

    const out = await syncLeadToBrevo("lead-2", "report_unlock");
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toBe("BREVO_500:boom");
    expect(mockRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "brevo_contact_sync_failed",
        metadata: expect.objectContaining({ reason: "BREVO_500:boom" }),
      }),
    );
  });

  it("never throws even when supabase blows up", async () => {
    fromMock.mockImplementation(() => {
      throw new Error("db gone");
    });
    const out = await syncLeadToBrevo("lead-3", "report_unlock");
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toContain("SYNC_UNEXPECTED");
  });
});