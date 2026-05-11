import { describe, it, expect } from "vitest";
import { computeCacheStatus } from "../cache-status-badge";
import { REPORT_RETENTION_MS } from "@/lib/report/retention";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const NOW = new Date("2025-01-01T12:00:00Z").getTime();

describe("computeCacheStatus", () => {
  it("fresh", () => {
    expect(computeCacheStatus({ nowMs: NOW, generatedMs: NOW - 2 * HOUR, expiresMs: NOW + 20 * HOUR, warnWithinMs: 6 * HOUR })).toBe("fresh");
  });
  it("expiring_soon", () => {
    expect(computeCacheStatus({ nowMs: NOW, generatedMs: NOW - 20 * HOUR, expiresMs: NOW + 2 * HOUR, warnWithinMs: 6 * HOUR })).toBe("expiring_soon");
  });
  it("stale", () => {
    expect(computeCacheStatus({ nowMs: NOW, generatedMs: NOW - 30 * HOUR, expiresMs: NOW - 1 * HOUR, warnWithinMs: 6 * HOUR })).toBe("stale");
  });
  it("unknown", () => {
    expect(computeCacheStatus({ nowMs: NOW, generatedMs: null, expiresMs: null, warnWithinMs: 6 * HOUR })).toBe("unknown");
  });
  it("sem expires_at: < retenção é fresh", () => {
    expect(
      computeCacheStatus({ nowMs: NOW, generatedMs: NOW - 25 * HOUR, expiresMs: null, warnWithinMs: 6 * HOUR }),
    ).toBe("fresh");
  });
  it("sem expires_at: > retenção é stale", () => {
    expect(
      computeCacheStatus({ nowMs: NOW, generatedMs: NOW - (REPORT_RETENTION_MS + DAY), expiresMs: null, warnWithinMs: 6 * HOUR }),
    ).toBe("stale");
  });
});
