import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

import { createEupagoCheckout } from "../eupago.server";

const API_KEY = "test-api-key-abc123";

function setEnv(extra: Record<string, string | undefined> = {}) {
  process.env.EUPAGO_BASE_URL = "https://clientes.eupago.pt";
  process.env.EUPAGO_API_KEY = API_KEY;
  delete process.env.EUPAGO_PAYBYLINK_PATH;
  delete process.env.EUPAGO_CHANNEL_ID;
  for (const [k, v] of Object.entries(extra)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

const baseInput = {
  productCode: "authority_diagnosis_97" as const,
  amountCents: 9700,
  currency: "EUR" as const,
  description: "Diagnóstico",
  internalPaymentId: "00000000-0000-0000-0000-000000000001",
  returnUrl: "https://example.com/return",
  webhookUrl: "https://example.com/api/public/eupago-webhook",
  customerEmail: "user@example.com",
};

function mockFetch(response: Partial<Response> & { _body?: string }) {
  const body = response._body ?? "";
  const fake = {
    ok: response.ok ?? true,
    status: response.status ?? 200,
    text: async () => body,
    json: async () => (body ? JSON.parse(body) : null),
  } as unknown as Response;
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(fake);
}

describe("payments/eupago/createEupagoCheckout", () => {
  beforeEach(() => setEnv());
  afterEach(() => vi.restoreAllMocks());

  it("posts to the default v1.02 Pay By Link path with the ApiKey header", async () => {
    const spy = mockFetch({
      ok: true,
      status: 200,
      _body: JSON.stringify({
        redirectUrl: "https://pay.eupago.pt/abc",
        reference: "REF-1",
        transactionID: "TX-1",
      }),
    });

    await createEupagoCheckout(baseInput);

    expect(spy).toHaveBeenCalledTimes(1);
    const [url, init] = spy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      "https://clientes.eupago.pt/api/v1.02/paybylink/create",
    );
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe(`ApiKey ${API_KEY}`);
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("honours EUPAGO_PAYBYLINK_PATH and normalizes slashes", async () => {
    setEnv({
      EUPAGO_BASE_URL: "https://clientes.eupago.pt/",
      EUPAGO_PAYBYLINK_PATH: "api/v9/paybylink/create/",
    });
    const spy = mockFetch({
      ok: true,
      _body: JSON.stringify({ redirectUrl: "https://pay.eupago.pt/x" }),
    });

    await createEupagoCheckout(baseInput);

    const [url] = spy.mock.calls[0] as [string];
    expect(url).toBe("https://clientes.eupago.pt/api/v9/paybylink/create");
  });

  it("throws a sanitized error on 404 with non-JSON body and never leaks the API key", async () => {
    mockFetch({
      ok: false,
      status: 404,
      _body: "<html>Not Found</html>",
    });

    await expect(createEupagoCheckout(baseInput)).rejects.toMatchObject({
      message: expect.stringContaining("404"),
    });

    try {
      await createEupagoCheckout(baseInput);
    } catch (e) {
      const msg = (e as Error).message;
      expect(msg).toContain("/api/v1.02/paybylink/create");
      expect(msg).not.toContain(API_KEY);
    }
  });

  it("includes status and path even when the 404 body is empty", async () => {
    mockFetch({ ok: false, status: 404, _body: "" });

    await expect(createEupagoCheckout(baseInput)).rejects.toThrow(
      /404 \/api\/v1\.02\/paybylink\/create/,
    );
  });

  it("throws when EuPago returns 200 but no checkout URL", async () => {
    mockFetch({ ok: true, status: 200, _body: JSON.stringify({ ok: true }) });
    await expect(createEupagoCheckout(baseInput)).rejects.toThrow(
      /missing checkout URL/i,
    );
  });
});