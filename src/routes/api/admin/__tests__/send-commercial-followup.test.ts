/**
 * Endpoint coverage for POST /api/admin/send-commercial-followup.
 *
 * All external dependencies (Supabase, Resend, admin session, lead events)
 * are mocked. No real HTTP, DB or provider calls.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---- Hoisted mock state ----
const mocks = vi.hoisted(() => {
  const requireAdminSession = vi.fn();
  const recordLeadEvent = vi.fn();
  const resolveSender = vi.fn(() => ({ ok: true, from: "AuditProfiles <test@example.pt>" }));

  // Per-test fixtures
  const state: {
    lead: any;
    leadError: any;
    feedback: any;
    request: any;
    leadUpdates: any[];
  } = {
    lead: null,
    leadError: null,
    feedback: null,
    request: null,
    leadUpdates: [],
  };

  function makeBuilder(rows: any, error: any = null) {
    const b: any = {
      select: () => b,
      eq: () => b,
      order: () => b,
      limit: () => b,
      maybeSingle: () => Promise.resolve({ data: rows, error }),
    };
    return b;
  }

  function makeUpdateBuilder(table: string) {
    const b: any = {
      update: (patch: any) => {
        if (table === "leads") state.leadUpdates.push(patch);
        return {
          eq: () => Promise.resolve({ data: null, error: null }),
        };
      },
    };
    return b;
  }

  const supabaseAdmin = {
    from: (table: string) => {
      if (table === "leads") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({ data: state.lead, error: state.leadError }),
            }),
          }),
          update: (patch: any) => {
            state.leadUpdates.push(patch);
            return { eq: () => Promise.resolve({ data: null, error: null }) };
          },
        };
      }
      if (table === "beta_feedback") {
        return makeBuilder(state.feedback);
      }
      if (table === "report_requests") {
        return makeBuilder(state.request);
      }
      throw new Error(`unexpected table: ${table}`);
    },
  };

  return { requireAdminSession, recordLeadEvent, resolveSender, supabaseAdmin, state };
});

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: mocks.supabaseAdmin,
}));
vi.mock("@/lib/admin/session", () => ({
  requireAdminSession: mocks.requireAdminSession,
}));
vi.mock("@/lib/admin/lead-events.server", () => ({
  recordLeadEvent: mocks.recordLeadEvent,
}));
vi.mock("@/lib/email/sender", () => ({
  resolveSender: mocks.resolveSender,
}));

import { Route } from "@/routes/api/admin/send-commercial-followup";

const POST = (Route as any).options.server.handlers.POST as (ctx: {
  request: Request;
}) => Promise<Response>;

const VALID_LEAD_ID = "11111111-1111-1111-1111-111111111111";

function buildRequest(body: unknown): Request {
  return new Request("http://localhost/api/admin/send-commercial-followup", {
    method: "POST",
    headers: { "Content-Type": "application/json", host: "localhost" },
    body: JSON.stringify(body),
  });
}

const ORIGINAL_ENV = { ...process.env };
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.state.lead = {
    id: VALID_LEAD_ID,
    email: "lead@example.pt",
    email_normalized: "lead@example.pt",
    name: "Maria Silva",
    pricing_preference: null,
    commercial_status: "novo",
  };
  mocks.state.leadError = null;
  mocks.state.feedback = {
    id: "feedback-1",
    usefulness_score: 5,
    clarity_text: "claro",
    missing_text: null,
    purchase_intent: "sim",
    pricing_preference: "30_50",
    contact_consent: true,
    created_at: new Date().toISOString(),
  };
  mocks.state.request = {
    instagram_username: "frederico.m.carvalho",
    analysis_snapshot_id: "snap-1",
  };
  mocks.state.leadUpdates = [];

  mocks.requireAdminSession.mockResolvedValue({ email: "admin@example.pt" });
  mocks.resolveSender.mockReturnValue({ ok: true, from: "AuditProfiles <test@example.pt>" });

  process.env.RESEND_API_KEY = "re_test_key";
  process.env.PUBLIC_APP_BASE_URL = "https://auditprofiles.test";

  fetchMock = vi.fn();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

function mockResendOk(id = "msg-123") {
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify({ id }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

describe("POST /api/admin/send-commercial-followup", () => {
  it("returns 401 when admin session is missing", async () => {
    mocks.requireAdminSession.mockRejectedValue(new Error("nope"));
    const res = await POST({ request: buildRequest({ lead_id: VALID_LEAD_ID }) });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error_code).toBe("UNAUTHORIZED");
  });

  it("returns 400 when payload is missing lead_id", async () => {
    const res = await POST({ request: buildRequest({}) });
    expect(res.status).toBe(400);
    expect((await res.json()).error_code).toBe("INVALID_PAYLOAD");
  });

  it("returns 400 when checkout_url is malformed", async () => {
    const res = await POST({
      request: buildRequest({ lead_id: VALID_LEAD_ID, checkout_url: "not-a-url" }),
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error_code).toBe("INVALID_PAYLOAD");
  });

  it("accepts empty checkout_url, normalises to null, omits CTA from email and metadata", async () => {
    mockResendOk();
    const res = await POST({
      request: buildRequest({ lead_id: VALID_LEAD_ID, checkout_url: "" }),
    });

    // 1) payload accepted
    expect(res.status).toBe(200);

    // 2) empty URL normalised to null in event metadata (not "" and not undefined-shaped)
    const eventCall = mocks.recordLeadEvent.mock.calls.find(
      ([arg]) => arg?.eventType === "commercial_followup_sent",
    );
    expect(eventCall).toBeDefined();
    const metadata = eventCall![0].metadata;
    expect(metadata.checkout_url).toBeNull();
    expect(metadata.checkout_url).not.toBe("");

    // 3) email body sent to Resend does not contain the checkout CTA
    expect(fetchMock).toHaveBeenCalled();
    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse((init as RequestInit).body as string) as {
      html: string;
      text: string;
    };
    // CTA button label is exactly ">Desbloquear</a>" inside the rendered button
    expect(body.html).not.toContain(">Desbloquear</a>");
    // text version uses the "Desbloquear:" prefix only when checkout_url is set
    expect(body.text).not.toMatch(/Desbloquear:/);

    // 4) metadata does not store an empty string anywhere
    expect(JSON.stringify(metadata)).not.toContain('"checkout_url":""');
  });

  it("returns 500 when RESEND_API_KEY is not configured", async () => {
    delete process.env.RESEND_API_KEY;
    const res = await POST({ request: buildRequest({ lead_id: VALID_LEAD_ID }) });
    expect(res.status).toBe(500);
    expect((await res.json()).error_code).toBe("EMAIL_PROVIDER_NOT_CONFIGURED");
  });

  it("returns 404 when lead does not exist", async () => {
    mocks.state.lead = null;
    const res = await POST({ request: buildRequest({ lead_id: VALID_LEAD_ID }) });
    expect(res.status).toBe(404);
    expect((await res.json()).error_code).toBe("LEAD_NOT_FOUND");
  });

  it("returns 422 when lead has no email", async () => {
    mocks.state.lead = { ...mocks.state.lead, email: null };
    const res = await POST({ request: buildRequest({ lead_id: VALID_LEAD_ID }) });
    expect(res.status).toBe(422);
    expect((await res.json()).error_code).toBe("LEAD_EMAIL_MISSING");
  });

  it("returns 422 when lead email is malformed", async () => {
    mocks.state.lead = { ...mocks.state.lead, email: "not-an-email" };
    const res = await POST({ request: buildRequest({ lead_id: VALID_LEAD_ID }) });
    expect(res.status).toBe(422);
    expect((await res.json()).error_code).toBe("LEAD_EMAIL_INVALID");
  });

  it("succeeds and advances commercial_status when intent is high", async () => {
    mockResendOk("msg-success");
    const checkoutUrl = "https://pay.example.pt/checkout/abc";
    const res = await POST({
      request: buildRequest({ lead_id: VALID_LEAD_ID, checkout_url: checkoutUrl }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      success: true,
      message_id: "msg-success",
      new_status: "potencial_cliente",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect((init as RequestInit).method).toBe("POST");
    const sentBody = JSON.parse((init as RequestInit).body as string);
    expect(sentBody.to).toEqual(["lead@example.pt"]);
    expect(typeof sentBody.subject).toBe("string");

    expect(mocks.recordLeadEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        leadId: VALID_LEAD_ID,
        eventType: "commercial_followup_sent",
        metadata: expect.objectContaining({
          message_id: "msg-success",
          checkout_url: checkoutUrl,
          new_status: "potencial_cliente",
        }),
      }),
    );

    expect(mocks.state.leadUpdates).toHaveLength(1);
    expect(mocks.state.leadUpdates[0]).toMatchObject({
      commercial_status: "potencial_cliente",
    });
    expect(mocks.state.leadUpdates[0].contacted_at).toBeTruthy();
  });

  it("does not overwrite terminal commercial_status (convertido)", async () => {
    mocks.state.lead = { ...mocks.state.lead, commercial_status: "convertido" };
    mockResendOk();
    const res = await POST({ request: buildRequest({ lead_id: VALID_LEAD_ID }) });
    expect(res.status).toBe(200);
    expect(mocks.state.leadUpdates).toHaveLength(1);
    expect(mocks.state.leadUpdates[0]).not.toHaveProperty("commercial_status");
    expect(mocks.state.leadUpdates[0].contacted_at).toBeTruthy();
  });

  it("maps Resend sandbox-block response to RESEND_SANDBOX_RECIPIENT_BLOCKED", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          message: "You can only send testing emails to your verified email.",
        }),
        { status: 422 },
      ),
    );
    const res = await POST({ request: buildRequest({ lead_id: VALID_LEAD_ID }) });
    expect(res.status).toBe(502);
    expect((await res.json()).error_code).toBe("RESEND_SANDBOX_RECIPIENT_BLOCKED");
    expect(mocks.recordLeadEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "commercial_followup_failed",
        metadata: expect.objectContaining({
          error_code: "RESEND_SANDBOX_RECIPIENT_BLOCKED",
        }),
      }),
    );
  });

  it("maps fetch AbortError to RESEND_TIMEOUT", async () => {
    fetchMock.mockImplementation(() => {
      const e = new Error("aborted");
      e.name = "AbortError";
      return Promise.reject(e);
    });
    const res = await POST({ request: buildRequest({ lead_id: VALID_LEAD_ID }) });
    expect(res.status).toBe(504);
    expect((await res.json()).error_code).toBe("RESEND_TIMEOUT");
    expect(mocks.recordLeadEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "commercial_followup_failed",
        metadata: expect.objectContaining({ error_code: "RESEND_TIMEOUT" }),
      }),
    );
  });
});
