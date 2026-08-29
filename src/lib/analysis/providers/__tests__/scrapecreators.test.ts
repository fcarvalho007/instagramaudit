import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { mapPost, mapProfile, scrapeCreatorsProvider } from "../scrapecreators.server";
import {
  fallbackProviderFor,
  isProviderSideFailure,
  selectProvider,
} from "../index.server";

const DAY = 86_400_000;

function post(id: number, ageDays: number) {
  return {
    id: `post-${id}`,
    code: `code${id}`,
    taken_at: Math.floor((Date.now() - ageDays * DAY) / 1000),
    like_count: 10,
    comment_count: 2,
    caption: { text: "olá #teste" },
    media_type: 1,
  };
}

function mockPages(pages: Array<{ items: unknown[]; next?: string | null }>) {
  let call = 0;
  return vi.fn(async () => {
    const page = pages[Math.min(call, pages.length - 1)]!;
    call += 1;
    return {
      ok: true,
      status: 200,
      json: async () => ({
        items: page.items,
        next_max_id: page.next ?? null,
        more_available: Boolean(page.next),
      }),
    } as unknown as Response;
  });
}

describe("ScrapeCreators adapter", () => {
  beforeEach(() => {
    process.env.SCRAPECREATORS_API_KEY = "test-key";
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    delete process.env.SCRAPECREATORS_API_KEY;
    delete process.env.SOCIAL_PROVIDER_POSTS;
  });

  it("maps a profile into the Apify row shape", () => {
    const row = mapProfile({
      data: {
        user: {
          username: "pingodoce",
          full_name: "Pingo Doce",
          follower_count: 500_000,
          media_count: 1200,
          is_verified: true,
        },
      },
    });
    expect(row).toMatchObject({
      username: "pingodoce",
      followersCount: 500_000,
      postsCount: 1200,
      verified: true,
    });
  });

  it("maps a reel with play count", () => {
    const mapped = mapPost({ ...post(1, 1), media_type: 2, play_count: 900 });
    expect(mapped.isVideo).toBe(true);
    expect(mapped.videoPlayCount).toBe(900);
    expect(mapped.likesCount).toBe(10);
  });

  it("paginates until the time cutoff and stops", async () => {
    vi.stubGlobal(
      "fetch",
      mockPages([
        { items: [post(1, 2), post(2, 5)], next: "c1" },
        { items: [post(3, 20), post(4, 200)], next: "c2" },
      ]),
    );
    const res = await scrapeCreatorsProvider.fetchPosts("x", {
      sinceMs: Date.now() - 90 * DAY,
      maxPosts: 300,
      timeoutMs: 10_000,
    });
    expect(res.rows).toHaveLength(3);
    expect(res.truncated).toBe(false);
    expect(res.billedResults).toBe(2);
  });

  it("never exceeds maxPosts", async () => {
    vi.stubGlobal(
      "fetch",
      mockPages([{ items: [post(1, 1), post(2, 1), post(3, 1)], next: "c1" }]),
    );
    const res = await scrapeCreatorsProvider.fetchPosts("x", {
      maxPosts: 2,
      timeoutMs: 10_000,
    });
    expect(res.rows).toHaveLength(2);
  });
});

describe("provider selection", () => {
  afterEach(() => {
    delete process.env.SOCIAL_PROVIDER_POSTS;
    delete process.env.SCRAPECREATORS_API_KEY;
  });

  it("falls back to apify when scrapecreators is selected but unconfigured", () => {
    process.env.SOCIAL_PROVIDER_POSTS = "scrapecreators";
    expect(selectProvider("posts")).toBe("apify");
  });

  it("uses scrapecreators when configured", () => {
    process.env.SOCIAL_PROVIDER_POSTS = "scrapecreators";
    process.env.SCRAPECREATORS_API_KEY = "k";
    expect(selectProvider("posts")).toBe("scrapecreators");
  });

  it("classifies billing/quota errors as provider-side", () => {
    expect(isProviderSideFailure(new Error("platform-feature-disabled"))).toBe(true);
    expect(isProviderSideFailure(Object.assign(new Error("x"), { status: 403 }))).toBe(true);
    expect(isProviderSideFailure(new Error("profile not found"))).toBe(false);
  });

  it("offers no fallback when the alternative is unavailable", () => {
    expect(fallbackProviderFor("apify")).toBeNull();
  });
});
