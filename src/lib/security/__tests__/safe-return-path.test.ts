import { describe, expect, it } from "vitest";

import { safeReturnPath } from "../safe-return-path";

describe("safeReturnPath", () => {
  it.each([
    ["/", "/"],
    ["/app/reports", "/app/reports"],
    ["/checkout/credits?status=success", "/checkout/credits?status=success"],
    ["/report/abc#section", "/report/abc#section"],
  ])("accepts relative path %s", (input, expected) => {
    expect(safeReturnPath(input)).toBe(expected);
  });

  it.each([
    "//evil.com/x",
    "https://evil.com",
    "http://evil.com",
    "javascript:alert(1)",
    "data:text/html,xx",
    "/\\evil.com",
    "\\\\evil.com",
    "evil.com",
    "",
    "   ",
    " /",
    null,
    undefined,
    42,
    {},
  ])("rejects unsafe input %j", (input) => {
    expect(safeReturnPath(input)).toBe("/");
  });

  it("returns custom fallback when invalid", () => {
    expect(safeReturnPath("//evil.com", "/home")).toBe("/home");
  });

  it("rejects strings longer than 512 chars", () => {
    expect(safeReturnPath("/" + "a".repeat(600))).toBe("/");
  });

  it("rejects embedded control characters", () => {
    expect(safeReturnPath("/foo\nbar")).toBe("/");
  });
});