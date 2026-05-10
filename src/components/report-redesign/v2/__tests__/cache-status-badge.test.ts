import { describe, it, expect } from "vitest";
import { computeCacheStatus } from "../cache-status-badge";

const HOUR = 60 * 60 * 1000;
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
  it("derives staleness from age when no expires_at", () => {
    expect(computeCacheStatus({ nowMs: NOW, generatedMs: NOW - 25 * HOUR, expiresMs: null, warnWithinMs: 6 * HOUR })).toBe("stale");
  });
});
