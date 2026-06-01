/**
 * Phase 3 — guards the contract between `fetchPublicAnalysis` and the
 * analyze route. The route branches on `error_code === "ONBOARDING_REQUIRED"`
 * to reopen the modal instead of rendering a raw 402, and on
 * `INSUFFICIENT_CREDITS` to render friendly copy. If either code stops
 * being passed through verbatim by the client, the gate breaks silently.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchPublicAnalysis } from "@/lib/analysis/client";

function mockFetch(response: unknown, init: { ok?: boolean; status?: number } = {}) {
  const ok = init.ok ?? true;
  const status = init.status ?? (ok ? 200 : 402);
  const fn = vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => response,
  });
  (globalThis as unknown as { fetch: typeof fetch }).fetch =
    fn as unknown as typeof fetch;
  return fn;
}

afterEach(() => {
  vi.restoreAllMocks();
  delete (globalThis as unknown as { fetch?: typeof fetch }).fetch;
});

describe("fetchPublicAnalysis — onboarding gate passthrough", () => {
  it("preserves ONBOARDING_REQUIRED so the route can reopen the modal", async () => {
    mockFetch(
      {
        success: false,
        error_code: "ONBOARDING_REQUIRED",
        message: "onboarding required",
      },
      { ok: false, status: 402 },
    );

    const res = await fetchPublicAnalysis("frederico.m.carvalho");
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error_code).toBe("ONBOARDING_REQUIRED");
    }
  });

  it("preserves INSUFFICIENT_CREDITS so the route can render friendly copy", async () => {
    mockFetch(
      {
        success: false,
        error_code: "INSUFFICIENT_CREDITS",
        message: "no credits",
      },
      { ok: false, status: 402 },
    );

    const res = await fetchPublicAnalysis("frederico.m.carvalho");
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error_code).toBe("INSUFFICIENT_CREDITS");
    }
  });

  it("maps thrown network failures to NETWORK_ERROR (never raw)", async () => {
    (globalThis as unknown as { fetch: typeof fetch }).fetch = vi
      .fn()
      .mockRejectedValue(new Error("offline")) as unknown as typeof fetch;
    const res = await fetchPublicAnalysis("frederico.m.carvalho");
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error_code).toBe("NETWORK_ERROR");
    }
  });

  it("forwards the success envelope unchanged", async () => {
    mockFetch({ success: true, snapshot_id: "abc" });
    const res = await fetchPublicAnalysis("frederico.m.carvalho");
    expect(res.success).toBe(true);
  });

  it("posts to /api/analyze-public-v1 with cleaned handle and capped competitors", async () => {
    const fn = mockFetch({ success: true });
    await fetchPublicAnalysis("  @Frederico.M.Carvalho  ", [
      "@rival1",
      "rival2",
      "rival3",
    ]);
    const call = fn.mock.calls[0]!;
    expect(call[0]).toBe("/api/analyze-public-v1");
    const body = JSON.parse(((call[1] as RequestInit).body as string) ?? "{}");
    expect(body.instagram_username).toBe("Frederico.M.Carvalho");
    expect(body.competitor_usernames).toEqual(["rival1", "rival2"]);
  });
});