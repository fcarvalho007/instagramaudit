import { describe, expect, it } from "vitest";

import { isAutoLoginAllowed } from "@/lib/rpc/auto-login.functions";

const ADMIN = "admin@example.com";

describe("isAutoLoginAllowed (autoLogin gate)", () => {
  it("rejects when BETA_AUTOLOGIN is not set", () => {
    expect(
      isAutoLoginAllowed(ADMIN, { ADMIN_ALLOWED_EMAILS: ADMIN }),
    ).toBe(false);
  });

  it("rejects when BETA_AUTOLOGIN is set but not '1'", () => {
    expect(
      isAutoLoginAllowed(ADMIN, {
        BETA_AUTOLOGIN: "true",
        ADMIN_ALLOWED_EMAILS: ADMIN,
      }),
    ).toBe(false);
  });

  it("rejects when caller email is missing even with flag on", () => {
    expect(
      isAutoLoginAllowed(null, {
        BETA_AUTOLOGIN: "1",
        ADMIN_ALLOWED_EMAILS: ADMIN,
      }),
    ).toBe(false);
  });

  it("rejects when caller email is not in the allowlist", () => {
    expect(
      isAutoLoginAllowed("attacker@example.com", {
        BETA_AUTOLOGIN: "1",
        ADMIN_ALLOWED_EMAILS: ADMIN,
      }),
    ).toBe(false);
  });

  it("rejects when allowlist is empty", () => {
    expect(
      isAutoLoginAllowed(ADMIN, {
        BETA_AUTOLOGIN: "1",
        ADMIN_ALLOWED_EMAILS: "",
      }),
    ).toBe(false);
  });

  it("accepts when flag is on AND caller is in allowlist (case-insensitive)", () => {
    expect(
      isAutoLoginAllowed("ADMIN@example.com", {
        BETA_AUTOLOGIN: "1",
        ADMIN_ALLOWED_EMAILS: "other@x.com, admin@example.com",
      }),
    ).toBe(true);
  });
});