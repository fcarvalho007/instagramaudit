import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

import { syncCustomerToBrevo } from "../customer-sync.server";

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
            return { eq: async () => ({ count: opts.count ?? 0 }) };
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
  delete process.env.BREVO_PAID_CUSTOMERS_LIST_ID;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("syncCustomerToBrevo", () => {
  it("sends IS_CUSTOMER=true + COMMERCIAL_STATUS=convertido + PLAN", async () => {
    setupSupabase({
      lead: {
        id: "lead-1",
        email: "ana@example.com",
        source: "public_report_gate",
        commercial_status: "potencial_cliente",
        profile_ownership: "own_profile",
        purpose: "growth",
        user_type: "creator",
        pricing_preference: "pago_unico_30_50",
      },
      latestRR: {
        instagram_username: "ana",
        analysis_snapshot_id: "snap-1",
        created_at: "2026-05-01T08:00:00Z",
      },
      count: 2,
    });
    mockUpsert.mockResolvedValue({ ok: true, brevoId: 42, status: 204 });

    const out = await syncCustomerToBrevo("lead-1", "admin_conversion");

    expect(out.ok).toBe(true);
    const payload = mockUpsert.mock.calls[0][0];
    expect(payload.email).toBe("ana@example.com");
    expect(payload.listIds).toBeUndefined(); // falls back to lead-magnet list
    expect(payload.attributes).toMatchObject({
      INSTAGRAM_HANDLE: "ana",
      REPORTS_COUNT: 2,
      LAST_REPORT_AT: "2026-05-01T08:00:00Z",
      PROFILE_OWNERSHIP: "own_profile",
      GOAL: "growth",
      USER_TYPE: "creator",
      PRICING_PREFERENCE: "pago_unico_30_50",
      LEAD_SOURCE: "public_report_gate",
      COMMERCIAL_STATUS: "convertido",
      IS_CUSTOMER: true,
      PLAN: "pago_unico_30_50",
    });
    expect(typeof payload.attributes.LAST_PAYMENT_AT).toBe("string");

    const evt = mockRecord.mock.calls[0][0];
    expect(evt.eventType).toBe("brevo_customer_synced");
    expect(evt.metadata.sync_reason).toBe("admin_conversion");
    expect(evt.metadata.plan).toBe("pago_unico_30_50");
    expect(evt.metadata.list_id).toBeNull();
  });

  it("uses BREVO_PAID_CUSTOMERS_LIST_ID when defined", async () => {
    process.env.BREVO_PAID_CUSTOMERS_LIST_ID = "17";
    setupSupabase({
      lead: { id: "l", email: "x@y.com", source: "s" },
      latestRR: null,
      count: 0,
    });
    mockUpsert.mockResolvedValue({ ok: true, brevoId: 1, status: 201 });

    await syncCustomerToBrevo("l", "admin_conversion");
    expect(mockUpsert.mock.calls[0][0].listIds).toEqual([17]);
    expect(mockRecord.mock.calls[0][0].metadata.list_id).toBe(17);
  });

  it("records failure when lead missing email", async () => {
    setupSupabase({ lead: { id: "l", email: null } });
    const out = await syncCustomerToBrevo("l", "admin_conversion");
    expect(out.ok).toBe(false);
    expect(mockUpsert).not.toHaveBeenCalled();
    expect(mockRecord).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "brevo_customer_sync_failed" }),
    );
  });

  it("propagates upsert failure reason", async () => {
    setupSupabase({
      lead: { id: "l", email: "x@y.com" },
      latestRR: null,
      count: 0,
    });
    mockUpsert.mockResolvedValue({ ok: false, reason: "BREVO_401:bad" });
    const out = await syncCustomerToBrevo("l", "admin_conversion");
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toBe("BREVO_401:bad");
    expect(mockRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "brevo_customer_sync_failed",
        metadata: expect.objectContaining({ reason: "BREVO_401:bad" }),
      }),
    );
  });

  it("never throws on unexpected db error", async () => {
    fromMock.mockImplementation(() => {
      throw new Error("db down");
    });
    const out = await syncCustomerToBrevo("l", "admin_conversion");
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.reason).toContain("SYNC_UNEXPECTED");
  });
});