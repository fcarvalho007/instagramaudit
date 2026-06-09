import { describe, expect, it, beforeAll } from "vitest";

import {
  decodeLeadCookie,
  encodeLeadCookie,
  readLeadIdFromRequest,
  LEAD_COOKIE_NAME,
} from "../lead-cookie.server";

const LEAD_ID = "11111111-2222-3333-4444-555555555555";

beforeAll(() => {
  process.env.SESSION_SECRET = "test-session-secret-with-enough-length-1234-abcdef";
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

  it("rejects cookies older than the hard TTL (90d)", () => {
    const ancientIat = Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 91;
    // Re-sign with the existing helper internals would require exporting
    // `sign`; we build the same shape by hand using a fresh encoding and
    // surgically replacing `iat`. Tamper of payload invalidates sig, so
    // we must compute the signature with the same secret.
    const { createHmac } = require("node:crypto") as typeof import("node:crypto");
    const payload = `${LEAD_ID}.${ancientIat}`;
    const sig = createHmac("sha256", process.env.SESSION_SECRET!)
      .update(payload)
      .digest("base64url");
    expect(decodeLeadCookie(`${payload}.${sig}`)).toBeNull();
  });

  it("accepts cookies within the hard TTL window", () => {
    const recentIat = Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 30;
    const { createHmac } = require("node:crypto") as typeof import("node:crypto");
    const payload = `${LEAD_ID}.${recentIat}`;
    const sig = createHmac("sha256", process.env.SESSION_SECRET!)
      .update(payload)
      .digest("base64url");
    expect(decodeLeadCookie(`${payload}.${sig}`)?.leadId).toBe(LEAD_ID);
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

  it("encodeLeadCookie throws when SESSION_SECRET is missing", () => {
    const original = process.env.SESSION_SECRET;
    delete process.env.SESSION_SECRET;
    try {
      expect(() => encodeLeadCookie(LEAD_ID)).toThrowError(
        /SESSION_SECRET/,
      );
    } finally {
      process.env.SESSION_SECRET = original;
    }
  });

  it("encodeLeadCookie throws when SESSION_SECRET is shorter than 32 chars", () => {
    const original = process.env.SESSION_SECRET;
    process.env.SESSION_SECRET = "only-31-chars-not-enough-12345a"; // 31 chars
    try {
      expect(() => encodeLeadCookie(LEAD_ID)).toThrowError(
        /SESSION_SECRET/,
      );
    } finally {
      process.env.SESSION_SECRET = original;
    }
  });
});