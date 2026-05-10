import { describe, it, expect, vi, beforeEach } from "vitest";

const snapRow = {
  id: "snap-1",
  instagram_username: "frederico.m.carvalho",
  normalized_payload: { __mock: true },
};

const maybeSingle = vi.fn();
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => maybeSingle(),
        }),
      }),
    }),
  },
}));

const snapshotToReportData = vi.fn();
vi.mock("@/lib/report/snapshot-to-report-data", () => ({
  snapshotToReportData: (...args: any[]) => snapshotToReportData(...args),
}));

vi.mock("@/lib/report/benchmark-input.server", () => ({
  buildReportBenchmarkInput: vi.fn(async () => ({})),
}));

import { buildReportSummaryEmailData } from "../build-report-summary-data.server";

function fullReportData() {
  return {
    data: {
      profile: { followers: 12480 },
      keyMetrics: {
        engagementRate: 3.42,
        dominantFormat: "Carrosséis",
        engagementDeltaPct: 1.2,
      },
      topPosts: [
        {
          format: "Reel",
          engagementPct: 7.85,
          thumbnailUrl: "https://thumb/1",
          permalink: "https://instagram.com/p/1",
        },
      ],
    },
  };
}

beforeEach(() => {
  maybeSingle.mockReset();
  snapshotToReportData.mockReset();
  maybeSingle.mockResolvedValue({ data: snapRow });
});

describe("buildReportSummaryEmailData", () => {
  it("returns null when snapshotId is empty", async () => {
    expect(await buildReportSummaryEmailData("")).toBeNull();
  });

  it("returns null when snapshot row is missing", async () => {
    maybeSingle.mockResolvedValueOnce({ data: null });
    expect(await buildReportSummaryEmailData("snap-1")).toBeNull();
  });

  it("extracts exact values from snapshotToReportData", async () => {
    snapshotToReportData.mockReturnValue(fullReportData());
    const out = await buildReportSummaryEmailData("snap-1");
    expect(out).toEqual({
      instagramHandle: "frederico.m.carvalho",
      kpis: {
        followers: 12480,
        engagementPct: 3.42,
        dominantFormat: "Carrosséis",
        benchmarkDeltaPp: 1.2,
      },
      topPost: {
        format: "Reel",
        engagementPct: 7.85,
        thumbnailUrl: "https://thumb/1",
        permalink: "https://instagram.com/p/1",
      },
    });
  });

  it("returns null when followers is zero", async () => {
    const r = fullReportData();
    r.data.profile.followers = 0;
    snapshotToReportData.mockReturnValue(r);
    expect(await buildReportSummaryEmailData("snap-1")).toBeNull();
  });

  it("returns null when topPosts is empty", async () => {
    const r = fullReportData();
    r.data.topPosts = [];
    snapshotToReportData.mockReturnValue(r);
    expect(await buildReportSummaryEmailData("snap-1")).toBeNull();
  });

  it("returns null when dominantFormat is missing", async () => {
    const r = fullReportData();
    r.data.keyMetrics.dominantFormat = "";
    snapshotToReportData.mockReturnValue(r);
    expect(await buildReportSummaryEmailData("snap-1")).toBeNull();
  });

  it("falls back to 0 when engagementDeltaPct is not finite", async () => {
    const r = fullReportData();
    (r.data.keyMetrics as any).engagementDeltaPct = NaN;
    snapshotToReportData.mockReturnValue(r);
    const out = await buildReportSummaryEmailData("snap-1");
    expect(out?.kpis.benchmarkDeltaPp).toBe(0);
  });
});