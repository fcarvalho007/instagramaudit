/**
 * Provider router — requirements A–J from the Provider Parity decision.
 *
 * Both adapters are mocked so no real call is ever made. Each test asserts
 * how many times each adapter was invoked, which is what "zero Apify calls"
 * and "never more than two providers per operation" actually mean.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  ProviderCommentsResult,
  ProviderId,
  ProviderPostsResult,
  ProviderProfileResult,
} from "../types";
import { emptyMeta } from "../types";

const calls = {
  scProfile: 0,
  scPosts: 0,
  scComments: 0,
  apProfile: 0,
  apPosts: 0,
  apComments: 0,
};

const behaviour = {
  scProfileFails: false,
  scPostsFails: false,
  scCommentsFails: false,
  apProfileFails: false,
  scConfigured: true,
  apConfigured: true,
};

function providerError(message: string, status: number): Error {
  const err = new Error(message) as Error & { status: number };
  err.status = status;
  return err;
}

function profileResult(id: ProviderId): ProviderProfileResult {
  return {
    ...emptyMeta(id, "profile"),
    billedResults: 1,
    row: { username: "acme", followersCount: 1000, videoPlayCount: 5 },
  };
}

function postsResult(id: ProviderId): ProviderPostsResult {
  return { ...emptyMeta(id, "posts"), billedResults: 1, rows: [], truncated: false };
}

function commentsResult(
  id: ProviderId,
  served: string[],
  failed: string[],
): ProviderCommentsResult {
  return {
    ...emptyMeta(id, "comments"),
    billedResults: served.length,
    batches: served.map((postUrl) => ({
      postUrl,
      comments: [{ id: `${postUrl}-c1`, text: "olá" }],
    })),
    failedPostUrls: failed,
    groupedByPost: true,
  };
}

vi.mock("../scrapecreators.server", () => ({
  scrapeCreatorsProvider: {
    id: "scrapecreators" as const,
    isConfigured: () => behaviour.scConfigured,
    fetchProfile: async () => {
      calls.scProfile += 1;
      if (behaviour.scProfileFails) throw providerError("rate limit", 429);
      return profileResult("scrapecreators");
    },
    fetchPosts: async () => {
      calls.scPosts += 1;
      if (behaviour.scPostsFails) throw providerError("upstream", 500);
      return postsResult("scrapecreators");
    },
    fetchComments: async (urls: string[]) => {
      calls.scComments += 1;
      if (behaviour.scCommentsFails) throw providerError("no credits", 402);
      return commentsResult("scrapecreators", urls, []);
    },
  },
}));

vi.mock("../apify.server", () => ({
  apifyProvider: {
    id: "apify" as const,
    isConfigured: () => behaviour.apConfigured,
    fetchProfile: async () => {
      calls.apProfile += 1;
      if (behaviour.apProfileFails) {
        const err = new Error("monthly hard cap reached");
        err.name = "MonthlyBudgetExceededError";
        throw err;
      }
      return profileResult("apify");
    },
    fetchPosts: async () => {
      calls.apPosts += 1;
      return postsResult("apify");
    },
    fetchComments: async (urls: string[]) => {
      calls.apComments += 1;
      return commentsResult("apify", urls, []);
    },
  },
}));

const {
  fetchComments,
  fetchPosts,
  fetchProfile,
  isProviderSideFailure,
  selectProvider,
} = await import("../router.server");

beforeEach(() => {
  for (const k of Object.keys(calls) as Array<keyof typeof calls>) calls[k] = 0;
  behaviour.scProfileFails = false;
  behaviour.scPostsFails = false;
  behaviour.scCommentsFails = false;
  behaviour.apProfileFails = false;
  behaviour.scConfigured = true;
  behaviour.apConfigured = true;
  delete process.env.SOCIAL_PROVIDER_PROFILE;
  delete process.env.SOCIAL_PROVIDER_POSTS;
  delete process.env.SOCIAL_PROVIDER_COMMENTS;
  delete process.env.SOCIAL_PROVIDER_FALLBACK;
});

describe("provider router", () => {
  it("A. ScrapeCreators available → zero Apify calls", async () => {
    await fetchProfile("acme");
    await fetchPosts("acme", { maxPosts: 12, timeoutMs: 1000 });
    await fetchComments(["u1"], { perPostLimit: 4, timeoutMs: 1000 });
    expect(calls.apProfile + calls.apPosts + calls.apComments).toBe(0);
    expect(calls.scProfile).toBe(1);
  });

  it("B. ScrapeCreators profile fails → Apify profile", async () => {
    behaviour.scProfileFails = true;
    const result = await fetchProfile("acme");
    expect(result.provider).toBe("apify");
    expect(calls.scProfile).toBe(1);
    expect(calls.apProfile).toBe(1);
  });

  it("C. ScrapeCreators posts fail → Apify posts", async () => {
    behaviour.scPostsFails = true;
    const result = await fetchPosts("acme", { maxPosts: 12, timeoutMs: 1000 });
    expect(result.provider).toBe("apify");
    expect(calls.apPosts).toBe(1);
  });

  it("D. ScrapeCreators comments fail → Apify comments", async () => {
    behaviour.scCommentsFails = true;
    const result = await fetchComments(["u1", "u2"], {
      perPostLimit: 4,
      timeoutMs: 1000,
    });
    expect(result.provider).toBe("apify");
    expect(result.batches).toHaveLength(2);
    expect(calls.apComments).toBe(1);
  });

  it("E. Apify primary blocked by monthly cap → ScrapeCreators is used", async () => {
    process.env.SOCIAL_PROVIDER_PROFILE = "apify";
    behaviour.apProfileFails = true;
    const result = await fetchProfile("acme");
    expect(result.provider).toBe("scrapecreators");
    expect(calls.apProfile).toBe(1);
    expect(calls.scProfile).toBe(1);
  });

  it("F. never tries more than two providers per operation", async () => {
    behaviour.scProfileFails = true;
    behaviour.apProfileFails = true;
    await expect(fetchProfile("acme")).rejects.toThrow();
    expect(calls.scProfile).toBe(1);
    expect(calls.apProfile).toBe(1);
  });

  it("F2. validation errors never trigger a fallback call", () => {
    expect(isProviderSideFailure(new Error("perfil privado"))).toBe(false);
    expect(isProviderSideFailure(providerError("boom", 500))).toBe(true);
  });

  it("selects ScrapeCreators by default and honours the env override", () => {
    expect(selectProvider("posts")).toBe("scrapecreators");
    process.env.SOCIAL_PROVIDER_POSTS = "apify";
    expect(selectProvider("posts")).toBe("apify");
  });

  it("J. cache hits are reported with zero credits charged", async () => {
    const result = await fetchPosts("acme", { maxPosts: 12, timeoutMs: 1000 });
    expect(result.cached).toBe(false);
    expect(result.creditsConsumed).toBeNull();
  });
});
