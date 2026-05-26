import { describe, it, expect, vi, beforeEach } from "vitest";

type QueryResult = { data: unknown; error: { message: string } | null };
let nextResult: QueryResult = { data: [], error: null };

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from() {
      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        or() {
          return this;
        },
        order() {
          return Promise.resolve(nextResult);
        },
      };
    },
  },
}));

import {
  loadSocialinsiderInstagramContext,
  __resetSocialinsiderCache,
} from "../socialinsider-context.server";

const socialinsiderSource = { name: "Socialinsider", url: "https://socialinsider.io" };

beforeEach(() => {
  __resetSocialinsiderCache();
  nextResult = { data: [], error: null };
});

describe("loadSocialinsiderInstagramContext", () => {
  it("returns the three Instagram formats from knowledge_benchmarks", async () => {
    nextResult = {
      data: [
        {
          format: "reel",
          posts_per_month: 6,
          engagement_pct: 1.34,
          valid_from: "2024-01-01",
          valid_to: "2024-12-31",
          knowledge_sources: socialinsiderSource,
        },
        {
          format: "carousel",
          posts_per_month: 4,
          engagement_pct: 1.1,
          valid_from: "2024-01-01",
          valid_to: "2024-12-31",
          knowledge_sources: socialinsiderSource,
        },
        {
          format: "image",
          posts_per_month: 3,
          engagement_pct: 0.6,
          valid_from: "2024-01-01",
          valid_to: "2024-12-31",
          knowledge_sources: socialinsiderSource,
        },
      ],
      error: null,
    };

    const ctx = await loadSocialinsiderInstagramContext();
    expect(ctx.reel?.postsPerMonth).toBe(6);
    expect(ctx.carousel?.postsPerMonth).toBe(4);
    expect(ctx.image?.postsPerMonth).toBe(3);
    expect(ctx.reel?.sourceName).toBe("Socialinsider");
    expect(ctx.reel?.dataRange.from).toBe("2024-01-01");
  });

  it("ignores rows whose source is not Socialinsider", async () => {
    nextResult = {
      data: [
        {
          format: "reel",
          posts_per_month: 9,
          engagement_pct: 2,
          valid_from: "2024-01-01",
          valid_to: null,
          knowledge_sources: { name: "Other Provider", url: null },
        },
      ],
      error: null,
    };
    const ctx = await loadSocialinsiderInstagramContext();
    expect(ctx.reel).toBeNull();
    expect(ctx.carousel).toBeNull();
    expect(ctx.image).toBeNull();
  });

  it("returns empty context on query error without throwing", async () => {
    nextResult = { data: null, error: { message: "boom" } };
    const ctx = await loadSocialinsiderInstagramContext();
    expect(ctx).toEqual({ reel: null, carousel: null, image: null });
  });
});