import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { upsertBrevoContact } from "../contacts.server";

const ORIGINAL_FETCH = globalThis.fetch;
const ORIGINAL_ENV = { ...process.env };

function setEnv(overrides: Record<string, string | undefined>) {
  for (const [k, v] of Object.entries(overrides)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

function mockFetch(impl: (url: string, init: RequestInit) => Promise<Response>) {
  globalThis.fetch = vi.fn(impl as any) as any;
}

beforeEach(() => {
  setEnv({
    LOVABLE_API_KEY: "lov_test",
    BREVO_API_KEY: "lovc_test",
    BREVO_LEAD_MAGNET_LIST_ID: "42",
  });
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  globalThis.fetch = ORIGINAL_FETCH;
  vi.restoreAllMocks();
});

describe("upsertBrevoContact", () => {
  it("returns ok with brevoId on 201 and sends correct payload", async () => {
    let capturedBody: any = null;
    let capturedUrl = "";
    let capturedHeaders: Record<string, string> = {};
    mockFetch(async (url, init) => {
      capturedUrl = url;
      capturedHeaders = init.headers as Record<string, string>;
      capturedBody = JSON.parse(init.body as string);
      return new Response(JSON.stringify({ id: 12345 }), { status: 201 });
    });

    const res = await upsertBrevoContact({
      email: "JOAO@example.com",
      attributes: {
        INSTAGRAM_HANDLE: "joao",
        REPORTS_COUNT: 2,
        IS_CUSTOMER: false,
        EMPTY_FIELD: null,
        BLANK_FIELD: "",
      },
    });

    expect(res).toEqual({ ok: true, brevoId: 12345, status: 201 });
    expect(capturedUrl).toBe(
      "https://connector-gateway.lovable.dev/brevo/v3/contacts",
    );
    expect(capturedHeaders["Authorization"]).toBe("Bearer lov_test");
    expect(capturedHeaders["X-Connection-Api-Key"]).toBe("lovc_test");
    expect(capturedBody.email).toBe("joao@example.com");
    expect(capturedBody.updateEnabled).toBe(true);
    expect(capturedBody.listIds).toEqual([42]);
    expect(capturedBody.attributes).toEqual({
      INSTAGRAM_HANDLE: "joao",
      REPORTS_COUNT: 2,
      IS_CUSTOMER: false,
    });
  });

  it("returns ok on 204 (existing contact updated, no body)", async () => {
    mockFetch(async () => new Response(null, { status: 204 }));
    const res = await upsertBrevoContact({ email: "x@y.com" });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.brevoId).toBeNull();
      expect(res.status).toBe(204);
    }
  });

  it("returns failure on 429 with reason excerpt", async () => {
    mockFetch(async () => new Response("rate limit", { status: 429 }));
    const res = await upsertBrevoContact({ email: "x@y.com" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toContain("BREVO_429");
  });

  it("returns failure on 500", async () => {
    mockFetch(async () => new Response("boom", { status: 500 }));
    const res = await upsertBrevoContact({ email: "x@y.com" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toContain("BREVO_500");
  });

  it("returns BREVO_TIMEOUT on AbortError", async () => {
    mockFetch(async () => {
      const err = new Error("aborted");
      err.name = "AbortError";
      throw err;
    });
    const res = await upsertBrevoContact({ email: "x@y.com" });
    expect(res).toEqual({ ok: false, reason: "BREVO_TIMEOUT" });
  });

  it("fails when LOVABLE_API_KEY missing", async () => {
    setEnv({ LOVABLE_API_KEY: undefined });
    const res = await upsertBrevoContact({ email: "x@y.com" });
    expect(res).toEqual({ ok: false, reason: "LOVABLE_API_KEY_MISSING" });
  });

  it("fails when BREVO_API_KEY missing", async () => {
    setEnv({ BREVO_API_KEY: undefined });
    const res = await upsertBrevoContact({ email: "x@y.com" });
    expect(res).toEqual({ ok: false, reason: "BREVO_API_KEY_MISSING" });
  });

  it("fails when BREVO_LEAD_MAGNET_LIST_ID missing", async () => {
    setEnv({ BREVO_LEAD_MAGNET_LIST_ID: undefined });
    const res = await upsertBrevoContact({ email: "x@y.com" });
    expect(res).toEqual({
      ok: false,
      reason: "BREVO_LEAD_MAGNET_LIST_ID_MISSING",
    });
  });

  it("fails when BREVO_LEAD_MAGNET_LIST_ID is not a positive integer", async () => {
    setEnv({ BREVO_LEAD_MAGNET_LIST_ID: "abc" });
    const res = await upsertBrevoContact({ email: "x@y.com" });
    expect(res).toEqual({
      ok: false,
      reason: "BREVO_LEAD_MAGNET_LIST_ID_INVALID",
    });
  });

  it("honors listIds override", async () => {
    let captured: any = null;
    mockFetch(async (_url, init) => {
      captured = JSON.parse(init.body as string);
      return new Response(JSON.stringify({ id: 1 }), { status: 201 });
    });
    await upsertBrevoContact({ email: "x@y.com", listIds: [7, 8] });
    expect(captured.listIds).toEqual([7, 8]);
  });
});