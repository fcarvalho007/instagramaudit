import { describe, it, expect } from "vitest";
import { computeCadence, normalizePostTimestamp } from "../cadence";

const NOW = new Date("2026-05-25T16:00:00.000Z").getTime();
const DAY = 86_400_000;

function p(iso: string, opts: { pinned?: boolean } = {}) {
  return { taken_at_iso: iso, is_pinned: opts.pinned ?? false };
}

describe("computeCadence", () => {
  it("active profile (10 posts in 13 days) → window_30d", () => {
    const posts = [
      "2026-05-25T08:00:00.000Z",
      "2026-05-21T15:00:00.000Z",
      "2026-05-21T11:00:00.000Z",
      "2026-05-20T10:00:00.000Z",
      "2026-05-18T09:00:00.000Z",
      "2026-05-16T15:00:00.000Z",
      "2026-05-15T13:00:00.000Z",
      "2026-05-14T09:00:00.000Z",
      "2026-05-13T19:00:00.000Z",
      "2026-05-13T17:00:00.000Z",
    ].map((iso) => p(iso));
    const r = computeCadence(posts, { now: NOW });
    expect(r.method).toBe("window_30d");
    expect(r.sampleSize).toBe(10);
    expect(r.windowDays).toBe(30);
    expect(r.weekly).toBeCloseTo(10 / (30 / 7), 1); // ≈ 2.3
    expect(r.sufficient).toBe(true);
  });

  it("robs.cortez fixture: 2 pinned from 2023 + 10 recent → old posts dropped by date", () => {
    const posts = [
      p("2023-09-05T19:22:49.000Z", { pinned: true }),
      p("2023-05-11T18:18:10.000Z", { pinned: true }),
      p("2026-05-25T08:06:41.000Z"),
      p("2026-05-21T15:30:34.000Z"),
      p("2026-05-21T11:00:00.000Z"),
      p("2026-05-20T10:01:55.000Z"),
      p("2026-05-18T09:00:09.000Z"),
      p("2026-05-16T15:10:24.000Z"),
      p("2026-05-15T13:42:55.000Z"),
      p("2026-05-14T09:59:20.000Z"),
      p("2026-05-13T19:31:29.000Z"),
      p("2026-05-13T17:53:55.000Z"),
    ];
    const r = computeCadence(posts, { now: NOW });
    expect(r.method).toBe("window_30d");
    expect(r.sampleSize).toBe(10);
    expect(r.weekly).toBeCloseTo(10 / (30 / 7), 1);
  });

  it("normalizes timestamps in seconds", () => {
    const ts = Math.floor((NOW - 5 * DAY) / 1000);
    expect(normalizePostTimestamp({ taken_at: ts })).toBe(ts * 1000);
    const posts = Array.from({ length: 4 }, (_, i) => ({
      taken_at: Math.floor((NOW - (i + 1) * DAY) / 1000),
    }));
    const r = computeCadence(posts, { now: NOW });
    expect(r.method).toBe("window_30d");
    expect(r.sampleSize).toBe(4);
  });

  it("normalizes timestamps in milliseconds", () => {
    const ts = NOW - 5 * DAY;
    expect(normalizePostTimestamp({ taken_at: ts })).toBe(ts);
    const posts = Array.from({ length: 4 }, (_, i) => ({
      taken_at: NOW - (i + 1) * DAY,
    }));
    const r = computeCadence(posts, { now: NOW });
    expect(r.method).toBe("window_30d");
    expect(r.sampleSize).toBe(4);
  });

  it("ignores posts with missing/invalid timestamp", () => {
    const posts = [
      p("2026-05-24T10:00:00.000Z"),
      p("2026-05-23T10:00:00.000Z"),
      p("2026-05-22T10:00:00.000Z"),
      { taken_at_iso: null, taken_at: null },
      { taken_at_iso: "not-a-date" },
    ];
    const r = computeCadence(posts, { now: NOW });
    expect(r.method).toBe("window_30d");
    expect(r.sampleSize).toBe(3);
  });

  it("stale sample (last post 200 days ago) → insufficient", () => {
    const posts = [p(new Date(NOW - 200 * DAY).toISOString())];
    const r = computeCadence(posts, { now: NOW });
    expect(r.method).toBe("insufficient");
    expect(r.weekly).toBe(0);
    expect(r.sufficient).toBe(false);
    expect(r.notePt).toMatch(/insuficiente/i);
    expect(r.noteEn).toMatch(/not enough/i);
  });

  it("empty posts → insufficient", () => {
    const r = computeCadence([], { now: NOW });
    expect(r.method).toBe("insufficient");
    expect(r.sampleSize).toBe(0);
    expect(r.windowDays).toBe(0);
    expect(r.notePt).toBeTruthy();
  });

  it("2 posts in 30 days, 5 in 90 days → window_90d", () => {
    const posts = [
      p(new Date(NOW - 5 * DAY).toISOString()),
      p(new Date(NOW - 20 * DAY).toISOString()),
      p(new Date(NOW - 45 * DAY).toISOString()),
      p(new Date(NOW - 60 * DAY).toISOString()),
      p(new Date(NOW - 80 * DAY).toISOString()),
    ];
    const r = computeCadence(posts, { now: NOW });
    expect(r.method).toBe("window_90d");
    expect(r.sampleSize).toBe(5);
    expect(r.weekly).toBeCloseTo(5 / (90 / 7), 1);
  });

  it("2 posts both within ~40 days → sample_span", () => {
    const posts = [
      p(new Date(NOW - 5 * DAY).toISOString()),
      p(new Date(NOW - 40 * DAY).toISOString()),
    ];
    const r = computeCadence(posts, { now: NOW });
    expect(r.method).toBe("sample_span");
    expect(r.sampleSize).toBe(2);
    expect(r.windowDays).toBeGreaterThanOrEqual(35);
  });

  it("discards future-dated posts", () => {
    const posts = [
      p(new Date(NOW + 5 * DAY).toISOString()),
      p(new Date(NOW - 2 * DAY).toISOString()),
      p(new Date(NOW - 5 * DAY).toISOString()),
      p(new Date(NOW - 8 * DAY).toISOString()),
    ];
    const r = computeCadence(posts, { now: NOW });
    expect(r.method).toBe("window_30d");
    expect(r.sampleSize).toBe(3);
  });

  it("only pinned posts → analysed by timestamp, never dropped for being pinned", () => {
    const posts = [
      p("2023-05-11T18:18:10.000Z", { pinned: true }),
      p("2023-09-05T19:22:49.000Z", { pinned: true }),
    ];
    const r = computeCadence(posts, { now: NOW });
    expect(r.excludedPinned).toBe(0);
    expect(r.sampleSize).toBe(2);
  });
});