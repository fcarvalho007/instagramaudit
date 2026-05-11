import { describe, it, expect, vi, beforeEach } from "vitest";

interface QuerySpec {
  column: string;
  value: string;
  count: number;
}

const state: { specs: QuerySpec[] } = { specs: [] };

function makeBuilder() {
  let chosenColumn: string | null = null;
  let chosenValue: string | null = null;
  const builder: any = {
    select() { return builder; },
    eq(col: string, val: string) {
      if (col === "request_ip_hash" || col === "handle") {
        chosenColumn = col;
        chosenValue = val;
      }
      return builder;
    },
    gte() { return builder; },
    limit() { return builder; },
    then(resolve: (v: any) => unknown) {
      const match = state.specs.find(
        (s) => s.column === chosenColumn && s.value === chosenValue,
      );
      return Promise.resolve(resolve({ count: match?.count ?? 0, error: null }));
    },
  };
  return builder;
}

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: { from: () => makeBuilder() },
}));

import {
  assertWithinPublicRateLimit,
  RateLimitError,
} from "../public-rate-limit.server";

beforeEach(() => {
  state.specs = [];
  delete process.env.PUBLIC_MAX_FRESH_PER_IP_DAY;
  delete process.env.PUBLIC_MAX_FRESH_PER_HANDLE_DAY;
});

describe("public-rate-limit", () => {
  it("permite quando ambos os contadores estão abaixo do limite", async () => {
    state.specs = [
      { column: "handle", value: "alice", count: 1 },
      { column: "request_ip_hash", value: "ip1", count: 2 },
    ];
    await expect(
      assertWithinPublicRateLimit({ ipHash: "ip1", handle: "alice" }),
    ).resolves.toBeUndefined();
  });

  it("rejeita por handle ao atingir o limite", async () => {
    process.env.PUBLIC_MAX_FRESH_PER_HANDLE_DAY = "5";
    state.specs = [{ column: "handle", value: "alice", count: 5 }];
    const err = await assertWithinPublicRateLimit({
      ipHash: "ip1",
      handle: "alice",
    }).catch((e) => e);
    expect(err).toBeInstanceOf(RateLimitError);
    expect((err as RateLimitError).scope).toBe("handle");
  });

  it("rejeita por IP ao atingir o limite", async () => {
    process.env.PUBLIC_MAX_FRESH_PER_IP_DAY = "10";
    state.specs = [
      { column: "handle", value: "alice", count: 0 },
      { column: "request_ip_hash", value: "ipX", count: 10 },
    ];
    const err = await assertWithinPublicRateLimit({
      ipHash: "ipX",
      handle: "alice",
    }).catch((e) => e);
    expect(err).toBeInstanceOf(RateLimitError);
    expect((err as RateLimitError).scope).toBe("ip");
  });

  it("ignora gate de IP quando ipHash é null", async () => {
    state.specs = [{ column: "handle", value: "alice", count: 0 }];
    await expect(
      assertWithinPublicRateLimit({ ipHash: null, handle: "alice" }),
    ).resolves.toBeUndefined();
  });
});
