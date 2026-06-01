import { describe, expect, it, beforeAll } from "vitest";

import {
  decodeLeadCookie,
  encodeLeadCookie,
  readLeadIdFromRequest,
  LEAD_COOKIE_NAME,
} from "../lead-cookie.server";

const LEAD_ID = "11111111-2222-3333-4444-555555555555";

beforeAll(() => {
  process.env.SESSION_SECRET = "test-session-secret-with-enough-length-1234";
});

describe("lead-cookie", () => {
  it("round-trips a valid leadId", () => {
    const cookie = encodeLeadCookie(LEAD_ID);
    const decoded = decodeLeadCookie(cookie);
    expect(decoded?.leadId).toBe(LEAD_ID);
    expect(decoded?.issuedAtSec).toBeGreaterThan(0);
  });

  it("rejects a tampered signature", () => {
    const cookie = encodeLeadCookie(LEAD_ID);
    const tampered = cookie.slice(0, -2) + "xx";
    expect(decodeLeadCookie(tampered)).toBeNull();
  });

  it("rejects a tampered leadId", () => {
    const cookie = encodeLeadCookie(LEAD_ID);
    const [, issued, sig] = cookie.split(".");
    const other = "99999999-9999-9999-9999-999999999999";
    expect(decodeLeadCookie(`${other}.${issued}.${sig}`)).toBeNull();
  });

  it("rejects malformed input", () => {
    expect(decodeLeadCookie(undefined)).toBeNull();
    expect(decodeLeadCookie("")).toBeNull();
    expect(decodeLeadCookie("not-a-cookie")).toBeNull();
    expect(decodeLeadCookie("a.b.c.d")).toBeNull();
  });

  it("rejects non-uuid leadId on encode", () => {
    expect(() => encodeLeadCookie("not-a-uuid")).toThrow();
  });

  it("readLeadIdFromRequest extracts a valid leadId from Cookie header", () => {
    const cookie = encodeLeadCookie(LEAD_ID);
    const req = new Request("https://x.test/", {
      headers: { cookie: `other=1; ${LEAD_COOKIE_NAME}=${cookie}; foo=bar` },
    });
    expect(readLeadIdFromRequest(req)).toBe(LEAD_ID);
  });

  it("readLeadIdFromRequest returns null without Cookie header", () => {
    const req = new Request("https://x.test/");
    expect(readLeadIdFromRequest(req)).toBeNull();
  });

  it("readLeadIdFromRequest returns null for tampered cookie", () => {
    const cookie = encodeLeadCookie(LEAD_ID).slice(0, -2) + "xx";
    const req = new Request("https://x.test/", {
      headers: { cookie: `${LEAD_COOKIE_NAME}=${cookie}` },
    });
    expect(readLeadIdFromRequest(req)).toBeNull();
  });
});