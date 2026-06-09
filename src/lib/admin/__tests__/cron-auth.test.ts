import { describe, expect, it, beforeAll, afterEach } from "vitest";

import { authorizeCronHook } from "../cron-auth.server";

const TOKEN = "test-internal-token-1234567890";

beforeAll(() => {
  process.env.INTERNAL_API_TOKEN = TOKEN;
});

afterEach(() => {
  process.env.INTERNAL_API_TOKEN = TOKEN;
});

function req(headers: Record<string, string>): Request {
  return new Request("https://x.test/api/public/hooks/sync", { headers });
}

describe("authorizeCronHook", () => {
  it("authorizes a matching x-internal-token", () => {
    expect(authorizeCronHook(req({ "x-internal-token": TOKEN }))).toBeNull();
  });

  it("rejects requests with no credential", () => {
    expect(authorizeCronHook(req({}))?.status).toBe(401);
  });

  it("rejects the legacy apikey header (anon key branch removed)", () => {
    process.env.SUPABASE_PUBLISHABLE_KEY = "publishable-anon-key";
    expect(
      authorizeCronHook(req({ apikey: "publishable-anon-key" }))?.status,
    ).toBe(401);
  });

  it("rejects when INTERNAL_API_TOKEN unset", () => {
    delete process.env.INTERNAL_API_TOKEN;
    expect(
      authorizeCronHook(req({ "x-internal-token": TOKEN }))?.status,
    ).toBe(401);
  });
});