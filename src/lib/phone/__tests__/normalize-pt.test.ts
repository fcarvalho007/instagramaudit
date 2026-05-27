import { describe, expect, it } from "vitest";
import { normalizePhonePT } from "../normalize-pt";

describe("normalizePhonePT", () => {
  it("prefixes +351 for 9-digit PT mobile numbers", () => {
    expect(normalizePhonePT("912345678")).toBe("+351912345678");
  });

  it("strips spaces and prefixes +351", () => {
    expect(normalizePhonePT("912 345 678")).toBe("+351912345678");
    expect(normalizePhonePT(" 91-23 45.678 ")).toBe("+351912345678");
  });

  it("keeps already-E.164 PT numbers untouched", () => {
    expect(normalizePhonePT("+351912345678")).toBe("+351912345678");
    expect(normalizePhonePT("+351 912 345 678")).toBe("+351912345678");
  });

  it("converts 00 international prefix to +", () => {
    expect(normalizePhonePT("00351912345678")).toBe("+351912345678");
  });

  it("prefixes + when the digits start with 351 without +", () => {
    expect(normalizePhonePT("351912345678")).toBe("+351912345678");
  });

  it("passes through international E.164 numbers", () => {
    expect(normalizePhonePT("+44 7700 900000")).toBe("+447700900000");
    expect(normalizePhonePT("+1 415 555 2671")).toBe("+14155552671");
  });

  it("returns null for empty or whitespace input", () => {
    expect(normalizePhonePT("")).toBeNull();
    expect(normalizePhonePT("   ")).toBeNull();
    expect(normalizePhonePT(null)).toBeNull();
    expect(normalizePhonePT(undefined)).toBeNull();
  });

  it("returns null for ambiguous short national numbers", () => {
    // 8-digit national → not PT mobile, no country prefix → unknown.
    expect(normalizePhonePT("12345678")).toBeNull();
    // Landline PT (starts with 2, 9 digits) → we don't auto-prefix landlines.
    expect(normalizePhonePT("212345678")).toBeNull();
  });

  it("never throws on weird input", () => {
    expect(() => normalizePhonePT("abc")).not.toThrow();
    expect(normalizePhonePT("abc")).toBeNull();
    expect(normalizePhonePT("++++")).toBeNull();
  });
});