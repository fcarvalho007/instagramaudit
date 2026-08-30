/**
 * Cadence — defensive outlier and reliability guard tests.
 *
 * Extends `cadence.test.ts` to cover the cases the audit flagged:
 *  - pinned posts are kept; stale ones are dropped as date outliers
 *  - posts without `is_pinned` but with extreme date offsets are dropped
 *  - reliability is downgraded when warnings stack
 */
import { describe, it, expect } from "vitest";
import { computeCadence } from "../cadence";

const NOW = new Date("2026-05-25T16:00:00.000Z").getTime();
const DAY = 86_400_000;

function p(iso: string, opts: { pinned?: boolean } = {}) {
  return { taken_at_iso: iso, is_pinned: opts.pinned ?? false };
}

describe("computeCadence — outlier + reliability guard", () => {
  it("(1) 2 pinned from 2023 + 10 recent → dropped as date outliers, not as pinned", () => {
    const posts = [
      p("2023-05-11T18:18:10.000Z", { pinned: true }),
      p("2023-09-05T19:22:49.000Z", { pinned: true }),
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
    expect(r.excludedPinned).toBe(0);
    expect(r.excludedOutliers).toBe(2);
    expect(r.warnings).toContain("date_outlier_detected");
    expect(r.warnings).not.toContain("pinned_excluded");
    // one warning → reliability medium (rule)
    expect(r.reliability).toBe("medium");
  });

  it("(2) only 1 stale post 200d ago → insufficient + reliability low", () => {
    const r = computeCadence(
      [p(new Date(NOW - 200 * DAY).toISOString())],
      { now: NOW },
    );
    expect(r.method).toBe("insufficient");
    expect(r.reliability).toBe("low");
  });

  it("(3) old post without is_pinned + 8 recent → outlier dropped, excludedOutliers≥1", () => {
    const posts = [
      p(new Date(NOW - 400 * DAY).toISOString()),
      ...Array.from({ length: 8 }, (_, i) =>
        p(new Date(NOW - (i + 1) * DAY).toISOString()),
      ),
    ];
    const r = computeCadence(posts, { now: NOW });
    expect(r.method).toBe("window_30d");
    expect(r.sampleSize).toBe(8);
    expect(r.excludedOutliers).toBeGreaterThanOrEqual(1);
    expect(r.warnings).toContain("date_outlier_detected");
  });

  it("(4) 2 posts at 5 and 40 days → sample_span, reliability low, low_sample warning", () => {
    const posts = [
      p(new Date(NOW - 5 * DAY).toISOString()),
      p(new Date(NOW - 40 * DAY).toISOString()),
    ];
    const r = computeCadence(posts, { now: NOW });
    expect(r.method).toBe("sample_span");
    expect(r.warnings).toContain("low_sample");
    expect(r.reliability).toBe("low");
  });

  it("(5) all posts without dates → insufficient, no crash", () => {
    const r = computeCadence(
      [{ taken_at_iso: null }, { taken_at_iso: "not-a-date" }],
      { now: NOW },
    );
    expect(r.method).toBe("insufficient");
    expect(r.reliability).toBe("low");
    expect(r.excludedPinned).toBe(0);
    expect(r.excludedOutliers).toBe(0);
  });

  it("(6) pinned flag missing but date 500d older than cluster → outlier guard triggers", () => {
    const posts = [
      { taken_at_iso: "2023-01-01T10:00:00.000Z" /* is_pinned undefined */ },
      ...Array.from({ length: 6 }, (_, i) =>
        p(new Date(NOW - (i + 1) * DAY).toISOString()),
      ),
    ];
    const r = computeCadence(posts, { now: NOW });
    expect(r.method).toBe("window_30d");
    expect(r.excludedOutliers).toBeGreaterThanOrEqual(1);
    expect(r.warnings).toContain("date_outlier_detected");
  });

  it("(7) high reliability requires window_30d with ≥5 posts and no warnings", () => {
    const posts = Array.from({ length: 6 }, (_, i) =>
      p(new Date(NOW - (i + 1) * DAY).toISOString()),
    );
    const r = computeCadence(posts, { now: NOW });
    expect(r.method).toBe("window_30d");
    expect(r.warnings).toHaveLength(0);
    expect(r.reliability).toBe("high");
  });

  it("(8) stale_data emitted when most recent post older than 60 days but cadence still computable", () => {
    const posts = Array.from({ length: 4 }, (_, i) =>
      p(new Date(NOW - (70 + i * 5) * DAY).toISOString()),
    );
    const r = computeCadence(posts, { now: NOW });
    // 70..85d ago → falls in window_90d
    expect(r.method).toBe("window_90d");
    expect(r.warnings).toContain("stale_data");
  });
});