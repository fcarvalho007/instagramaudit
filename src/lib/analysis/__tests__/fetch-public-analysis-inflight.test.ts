/**
 * Guard: defesa em profundidade contra React StrictMode / double mount.
 * Duas chamadas paralelas a `fetchPublicAnalysis` com o mesmo handle
 * partilham o mesmo `fetch` subjacente — invariante "1 crédito por
 * (lead, cache_key)" é também garantida no servidor.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchPublicAnalysis } from "@/lib/analysis/client";

afterEach(() => {
  vi.restoreAllMocks();
  delete (globalThis as unknown as { fetch?: typeof fetch }).fetch;
});

describe("fetchPublicAnalysis — in-flight guard", () => {
  it("dedupes chamadas concorrentes com o mesmo (username, competitors)", async () => {
    let resolveFetch: ((v: unknown) => void) | null = null;
    const fetchMock = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = (body) =>
            resolve({ ok: true, status: 200, json: async () => body });
        }),
    );
    (globalThis as unknown as { fetch: typeof fetch }).fetch =
      fetchMock as unknown as typeof fetch;

    const p1 = fetchPublicAnalysis("foo");
    const p2 = fetchPublicAnalysis("foo");

    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveFetch?.({ success: true, data: { handle: "foo" } });
    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toBe(r2);
  });

  it("permite nova chamada após a anterior resolver", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: { handle: "foo" } }),
    });
    (globalThis as unknown as { fetch: typeof fetch }).fetch =
      fetchMock as unknown as typeof fetch;

    await fetchPublicAnalysis("foo");
    await fetchPublicAnalysis("foo");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});