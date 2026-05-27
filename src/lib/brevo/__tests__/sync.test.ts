import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mocks
const mockUpsert = vi.fn();
const mockRecord = vi.fn();

const fromMock = vi.fn();
const leadsSelectSpy = vi.fn();
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
        select: (cols: string) => {
          leadsSelectSpy(cols);
          return {
          eq: () => ({
            maybeSingle: async () => ({
              data: opts.lead ?? null,
              error: opts.leadError ?? null,
            }),
          }),
          };
        },
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
  leadsSelectSpy.mockReset();
  delete process.env.BREVO_NAME_PHONE_ATTRS_ENABLED;
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
        purpose: "improve_content",
        user_type: "creator",
        pricing_preference: "below_20",
        marketing_consent: true,
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
      PRICING_PREFERENCE: 1,
      LEAD_SOURCE: 1,
      COMMERCIAL_STATUS: 1,
      IS_CUSTOMER: false,
      MARKETING_CONSENT: true,
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

  it("selects 'purpose' column from leads (regression: was 'goal')", async () => {
    setupSupabase({
      lead: { id: "lead-x", email: "a@b.com", purpose: "grow_audience" },
      latestRR: null,
      count: 0,
    });
    mockUpsert.mockResolvedValue({ ok: true, brevoId: 1, status: 201 });
    await syncLeadToBrevo("lead-x", "report_unlock");
    const cols = leadsSelectSpy.mock.calls[0][0] as string;
    expect(cols).toContain("purpose");
    expect(cols).not.toMatch(/\bgoal\b/);
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
      lead: { id: "lead-2", email: "x@y.com", marketing_consent: true },
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

  it("syncs operational contact even when marketing_consent=false, with MARKETING_CONSENT attribute", async () => {
    setupSupabase({
      lead: { id: "lead-nc", email: "n@c.com", marketing_consent: false },
      latestRR: null,
      count: 0,
    });
    mockUpsert.mockResolvedValue({ ok: true, brevoId: 42, status: 201 });
    const out = await syncLeadToBrevo("lead-nc", "report_unlock");
    expect(out.ok).toBe(true);
    expect(mockUpsert).toHaveBeenCalledTimes(1);
    const payload = mockUpsert.mock.calls[0][0];
    expect(payload.attributes.MARKETING_CONSENT).toBe(false);
    expect(mockRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "brevo_contact_synced",
        metadata: expect.objectContaining({ marketing_consent: false }),
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

  describe("BREVO_NAME_PHONE_ATTRS_ENABLED", () => {
    it("sends FIRSTNAME/LASTNAME/SMS when flag is ON and phone is E.164", async () => {
      process.env.BREVO_NAME_PHONE_ATTRS_ENABLED = "true";
      setupSupabase({
        lead: {
          id: "lead-pn",
          email: "ana@example.com",
          name: "Ana Rita Marques",
          phone: "+351912345678",
          phone_normalized: "+351912345678",
          marketing_consent: true,
        },
        latestRR: null,
        count: 0,
      });
      mockUpsert.mockResolvedValue({ ok: true, brevoId: 11, status: 201 });

      const out = await syncLeadToBrevo("lead-pn", "report_unlock");
      expect(out.ok).toBe(true);
      const payload = mockUpsert.mock.calls[0][0];
      expect(payload.attributes.FIRSTNAME).toBe("Ana");
      expect(payload.attributes.LASTNAME).toBe("Rita Marques");
      expect(payload.attributes.SMS).toBe("+351912345678");

      const successEvt = mockRecord.mock.calls.find(
        (c) => c[0].eventType === "brevo_contact_synced",
      )?.[0];
      expect(successEvt?.metadata.name_attrs_sent).toBe(true);
      expect(successEvt?.metadata.sms_sent).toBe(true);
      expect(successEvt?.metadata.sms_skipped_reason).toBeUndefined();
    });

    it("syncs contact without SMS and logs sms_skipped_reason when phone is not E.164", async () => {
      process.env.BREVO_NAME_PHONE_ATTRS_ENABLED = "true";
      setupSupabase({
        lead: {
          id: "lead-bad-phone",
          email: "bad@example.com",
          name: "Ana",
          phone: "912345678",
          phone_normalized: "912345678",
          marketing_consent: false,
        },
        latestRR: null,
        count: 0,
      });
      mockUpsert.mockResolvedValue({ ok: true, brevoId: 12, status: 201 });

      const out = await syncLeadToBrevo("lead-bad-phone", "report_unlock");
      expect(out.ok).toBe(true);
      const payload = mockUpsert.mock.calls[0][0];
      expect(payload.attributes.SMS).toBeUndefined();
      expect(payload.attributes.FIRSTNAME).toBe("Ana");

      const skippedEvt = mockRecord.mock.calls.find(
        (c) => c[0].eventType === "brevo_contact_sync_skipped",
      )?.[0];
      expect(skippedEvt?.metadata.skipped_field).toBe("phone");
      expect(skippedEvt?.metadata.reason).toBe("PHONE_NOT_E164");
      // Must NOT store the raw phone in product_events.
      expect(JSON.stringify(skippedEvt?.metadata)).not.toContain("912345678");

      const successEvt = mockRecord.mock.calls.find(
        (c) => c[0].eventType === "brevo_contact_synced",
      )?.[0];
      expect(successEvt?.metadata.sms_sent).toBe(false);
      expect(successEvt?.metadata.sms_skipped_reason).toBe("PHONE_NOT_E164");
    });

    it("does NOT send FIRSTNAME/LASTNAME/SMS when flag is OFF", async () => {
      // flag defaults to OFF (deleted in beforeEach).
      setupSupabase({
        lead: {
          id: "lead-off",
          email: "off@example.com",
          name: "Ana Marques",
          phone: "+351912345678",
          phone_normalized: "+351912345678",
          marketing_consent: true,
        },
        latestRR: null,
        count: 0,
      });
      mockUpsert.mockResolvedValue({ ok: true, brevoId: 13, status: 201 });

      await syncLeadToBrevo("lead-off", "report_unlock");
      const payload = mockUpsert.mock.calls[0][0];
      expect(payload.attributes.FIRSTNAME).toBeUndefined();
      expect(payload.attributes.LASTNAME).toBeUndefined();
      expect(payload.attributes.SMS).toBeUndefined();

      const successEvt = mockRecord.mock.calls.find(
        (c) => c[0].eventType === "brevo_contact_synced",
      )?.[0];
      expect(successEvt?.metadata.name_attrs_sent).toBe(false);
      expect(successEvt?.metadata.sms_sent).toBe(false);
    });
  });
});