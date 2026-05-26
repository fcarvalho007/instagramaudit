import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockRecord = vi.fn();
vi.mock("@/lib/tracking.server", () => ({
  recordProductEvent: (...args: unknown[]) => mockRecord(...args),
}));

import { sendTransactionalEmail } from "../transactional-email.server";

const ORIGINAL_FETCH = globalThis.fetch;
const ORIGINAL_ENV = { ...process.env };

function setEnv(overrides: Record<string, string | undefined>) {
  for (const [k, v] of Object.entries(overrides)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

/**
 * Route the global fetch mock by URL: brevo gateway vs resend.
 */
function mockProviders(opts: {
  brevo: () => Promise<Response>;
  resend?: () => Promise<Response>;
}) {
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    if (url.includes("connector-gateway.lovable.dev/brevo")) {
      return opts.brevo();
    }
    if (url.includes("api.resend.com")) {
      if (!opts.resend) throw new Error("Unexpected Resend call");
      return opts.resend();
    }
    throw new Error(`Unexpected fetch URL: ${url}`);
  }) as any;
}

const baseInput = {
  to: "Joao@Example.com",
  subject: "Hello",
  html: "<p>hi</p>",
  text: "hi",
  flowType: "personal-area-saved" as const,
  leadId: "lead-1",
  reportRequestId: "rr-1",
  snapshotId: "snap-1",
  handle: "joao",
};

beforeEach(() => {
  mockRecord.mockReset();
  setEnv({
    LOVABLE_API_KEY: "lov_test",
    BREVO_API_KEY: "lovc_test",
    BREVO_FROM_EMAIL: "frederico.carvalho@digitalfc.pt",
    BREVO_FROM_NAME: "Frederico Carvalho",
    RESEND_API_KEY: "re_test",
    RESEND_FROM: "AuditProfiles <noreply@auditprofiles.com>",
  });
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  globalThis.fetch = ORIGINAL_FETCH;
  vi.restoreAllMocks();
});

describe("sendTransactionalEmail", () => {
  it("sends via Brevo on success and records brevo_email_sent only", async () => {
    let resendCalled = false;
    mockProviders({
      brevo: async () =>
        new Response(JSON.stringify({ messageId: "<brevo-1@a.b>" }), {
          status: 201,
        }),
      resend: async () => {
        resendCalled = true;
        return new Response("nope", { status: 500 });
      },
    });

    const out = await sendTransactionalEmail(baseInput);
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.provider).toBe("brevo");
      expect(out.messageId).toBe("<brevo-1@a.b>");
    }
    expect(resendCalled).toBe(false);
    expect(mockRecord).toHaveBeenCalledTimes(1);
    expect(mockRecord.mock.calls[0][0].eventType).toBe("brevo_email_sent");
    expect(mockRecord.mock.calls[0][0].metadata.email_masked).toBe("J***@Example.com");
  });

  it("falls back to Resend when Brevo returns 500", async () => {
    mockProviders({
      brevo: async () => new Response("boom", { status: 500 }),
      resend: async () =>
        new Response(JSON.stringify({ id: "re-1" }), { status: 200 }),
    });

    const out = await sendTransactionalEmail(baseInput);
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.provider).toBe("resend");
      expect(out.messageId).toBe("re-1");
      expect(out.brevoFailed?.reason).toContain("BREVO_500");
    }
    const events = mockRecord.mock.calls.map((c) => c[0].eventType);
    expect(events).toEqual(["brevo_email_failed", "resend_fallback_email_sent"]);
  });

  it("records flow-specific failure when both providers fail", async () => {
    mockProviders({
      brevo: async () => new Response("nope", { status: 500 }),
      resend: async () => new Response("nope", { status: 500 }),
    });

    const out = await sendTransactionalEmail({
      ...baseInput,
      flowType: "report-ready",
    });
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.brevoReason).toContain("BREVO_500");
      expect(out.resendReason).toContain("RESEND_500");
    }
    const events = mockRecord.mock.calls.map((c) => c[0].eventType);
    expect(events).toEqual(["brevo_email_failed", "report_ready_email_failed"]);
  });

  it("emits flow failure without trying Resend when RESEND_API_KEY is absent", async () => {
    setEnv({ RESEND_API_KEY: undefined });
    let resendCalled = false;
    mockProviders({
      brevo: async () => new Response("boom", { status: 500 }),
      resend: async () => {
        resendCalled = true;
        return new Response("ok", { status: 200 });
      },
    });

    const out = await sendTransactionalEmail(baseInput);
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.resendReason).toBe("RESEND_API_KEY_MISSING");
    expect(resendCalled).toBe(false);
    const events = mockRecord.mock.calls.map((c) => c[0].eventType);
    expect(events).toEqual(["brevo_email_failed", "personal_area_email_failed"]);
    const failureMeta = mockRecord.mock.calls[1][0].metadata;
    expect(failureMeta.fallback_attempted).toBe(false);
    expect(failureMeta.missing_secret).toBe("RESEND_API_KEY");
    expect(failureMeta.resend_reason).toBe("RESEND_API_KEY_MISSING");
  });

  it("emits flow failure without trying Resend when RESEND_FROM is absent", async () => {
    setEnv({ RESEND_FROM: undefined });
    let resendCalled = false;
    mockProviders({
      brevo: async () => new Response("boom", { status: 500 }),
      resend: async () => {
        resendCalled = true;
        return new Response("ok", { status: 200 });
      },
    });

    const out = await sendTransactionalEmail(baseInput);
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.resendReason).toBe("RESEND_FROM_MISSING");
    expect(resendCalled).toBe(false);
    const events = mockRecord.mock.calls.map((c) => c[0].eventType);
    expect(events).toEqual(["brevo_email_failed", "personal_area_email_failed"]);
    const failureMeta = mockRecord.mock.calls[1][0].metadata;
    expect(failureMeta.fallback_attempted).toBe(false);
    expect(failureMeta.missing_secret).toBe("RESEND_FROM");
    expect(failureMeta.resend_reason).toBe("RESEND_FROM_MISSING");

    // No sandbox sender ever surfaces in events.
    const allMeta = JSON.stringify(mockRecord.mock.calls);
    expect(allMeta).not.toContain("onboarding@resend.dev");
    expect(allMeta).not.toContain("resend.dev");
    expect(allMeta).not.toContain("re_test");
  });

  it("falls back to Resend when BREVO_API_KEY is missing", async () => {
    setEnv({ BREVO_API_KEY: undefined });
    let brevoCalled = false;
    mockProviders({
      brevo: async () => {
        brevoCalled = true;
        return new Response("ok", { status: 201 });
      },
      resend: async () =>
        new Response(JSON.stringify({ id: "re-2" }), { status: 200 }),
    });

    const out = await sendTransactionalEmail(baseInput);
    expect(brevoCalled).toBe(false); // brevoFetch shortcircuits before HTTP
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.provider).toBe("resend");
    expect(mockRecord.mock.calls[0][0].metadata.reason).toBe(
      "BREVO_API_KEY_MISSING",
    );
  });

  it("falls back to Resend on Brevo timeout", async () => {
    mockProviders({
      brevo: async () => {
        const err = new Error("aborted");
        err.name = "AbortError";
        throw err;
      },
      resend: async () =>
        new Response(JSON.stringify({ id: "re-3" }), { status: 200 }),
    });

    const out = await sendTransactionalEmail(baseInput);
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.provider).toBe("resend");
      expect(out.brevoFailed?.reason).toBe("BREVO_TIMEOUT");
    }
  });

  it("never leaks raw email in event metadata", async () => {
    mockProviders({
      brevo: async () => new Response("boom", { status: 500 }),
      resend: async () => new Response("boom", { status: 500 }),
    });
    await sendTransactionalEmail(baseInput);
    const allMeta = JSON.stringify(mockRecord.mock.calls);
    expect(allMeta).not.toContain("Joao@Example.com");
    expect(allMeta).toContain("J***@Example.com");
  });
});