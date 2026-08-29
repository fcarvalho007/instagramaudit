import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Test G (global concurrency) + fail-open behaviour of the Postgres-backed
 * Apify run lease.
 */

const state = {
  active: 0,
  max: 4,
  fail: false,
  acquires: 0,
};

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    rpc: async (fn: string, args: any) => {
      if (state.fail) return { data: null, error: { message: "db down" } };
      if (fn === "acquire_apify_run_lease") {
        state.acquires++;
        if (state.active >= (args.p_max ?? state.max)) {
          return { data: false, error: null };
        }
        state.active++;
        return { data: true, error: null };
      }
      if (fn === "release_apify_run_lease") {
        state.active = Math.max(0, state.active - 1);
        return { data: true, error: null };
      }
      return { data: null, error: null };
    },
  },
}));

import {
  withApifyRunLease,
  tryAcquireApifyLease,
  ApifyConcurrencyBusyError,
} from "../apify-run-lease.server";

beforeEach(() => {
  state.active = 0;
  state.fail = false;
  state.acquires = 0;
  process.env.APIFY_MAX_CONCURRENT_RUNS = "4";
  process.env.APIFY_RUN_LEASE_WAIT_MS = "0";
});

describe("apify run lease (global)", () => {
  it("G: nunca mantém mais de 4 runs em voo em simultâneo", async () => {
    let peak = 0;
    let inFlight = 0;
    const task = async () => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 20));
      inFlight--;
      return true;
    };

    const results = await Promise.allSettled(
      Array.from({ length: 8 }, () => withApifyRunLease(task, "test")),
    );

    expect(peak).toBeLessThanOrEqual(4);
    // Com wait=0 os excedentes falham em vez de arrancar runs extra.
    const rejected = results.filter((r) => r.status === "rejected");
    rejected.forEach((r: any) =>
      expect(r.reason).toBeInstanceOf(ApifyConcurrencyBusyError),
    );
    expect(results.filter((r) => r.status === "fulfilled").length).toBe(4);
  });

  it("liberta o lease no erro", async () => {
    await expect(
      withApifyRunLease(async () => {
        throw new Error("boom");
      }, "test"),
    ).rejects.toThrow("boom");
    expect(state.active).toBe(0);
  });

  it("fail-open quando o Postgres está indisponível", async () => {
    state.fail = true;
    expect(await tryAcquireApifyLease("k")).toBe("degraded");
    await expect(withApifyRunLease(async () => "ok", "test")).resolves.toBe("ok");
  });
});
