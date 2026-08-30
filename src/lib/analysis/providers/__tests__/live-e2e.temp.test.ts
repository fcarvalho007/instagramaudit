/**
 * TEMPORARY operational validation against the REAL providers.
 * Deleted after the run — never commit to CI.
 */
import { describe, expect, it } from "vitest";

const HANDLE = "frederico.m.carvalho";
const LONG = 240_000;

const log = (label: string, value: unknown) =>
  console.log(`\n### ${label}\n${JSON.stringify(value, null, 2)}`);

const {
  fetchComments,
  fetchPosts,
  fetchProfile,
} = await import("../router.server");
const { scrapeCreatorsProvider } = await import("../scrapecreators.server");
const { normalizeProfile, enrichPosts } = await import("../../normalize");

describe("LIVE provider validation", () => {
  it(
    "1. ScrapeCreators profile + baseline + engagement",
    async () => {
      const profile = await fetchProfile(HANDLE);
      log("profile telemetry", {
        provider: profile.provider,
        endpoint: profile.endpoint,
        creditsConsumed: profile.creditsConsumed,
        creditsRemaining: profile.creditsRemaining,
        cached: profile.cached,
        monetaryCostUsd: profile.monetaryCostUsd,
        billedResults: profile.billedResults,
      });
      expect(profile.provider).toBe("scrapecreators");
      expect(profile.row).toBeTruthy();

      const normalized = normalizeProfile(profile.row as any);
      expect(normalized).not.toBeNull();
      log("normalized profile", {
        username: normalized!.username,
        followers: normalized!.followers_count,
        posts_count: normalized!.posts_count,
        latestPosts: Array.isArray((profile.row as any)?.latestPosts)
          ? (profile.row as any).latestPosts.length
          : 0,
      });
      expect(normalized!.username?.toLowerCase()).toBe(HANDLE);
      expect(normalized!.followers_count).toBeGreaterThan(0);
      (globalThis as any).__liveFollowers = normalized!.followers_count;
    },
    LONG,
  );

  it(
    "2. posts 90d window → 30d derived, video_plays present",
    async () => {
      const since90 = Date.now() - 90 * 86_400_000;
      const posts = await fetchPosts(HANDLE, {
        sinceMs: since90,
        maxPosts: 24,
        timeoutMs: 180_000,
      });
      log("posts telemetry", {
        provider: posts.provider,
        endpoint: posts.endpoint,
        creditsConsumed: posts.creditsConsumed,
        creditsRemaining: posts.creditsRemaining,
        cached: posts.cached,
        monetaryCostUsd: posts.monetaryCostUsd,
        rows: posts.rows.length,
        truncated: posts.truncated,
      });
      expect(posts.provider).toBe("scrapecreators");
      expect(posts.rows.length).toBeGreaterThan(0);

      const followers = (globalThis as any).__liveFollowers ?? 1000;
      const normalized = enrichPosts(posts.rows, followers).posts;
      const since30 = Date.now() - 30 * 86_400_000;
      const in30 = normalized.filter(
        (p) => p.taken_at_iso !== null && Date.parse(p.taken_at_iso) >= since30,
      );
      const in90 = normalized.filter(
        (p) => p.taken_at_iso !== null && Date.parse(p.taken_at_iso) >= since90,
      );
      const plays = normalized.filter(
        (p) => typeof p.video_plays === "number",
      );
      log("windows", {
        posts_90d: in90.length,
        posts_30d: in30.length,
        with_video_plays: plays.length,
        sample: normalized.slice(0, 3).map((p) => ({
          shortcode: p.shortcode,
          format: p.format,
          likes: p.likes,
          comments: p.comments,
          engagement_pct: p.engagement_pct,
          video_plays: p.video_plays ?? null,
          video_views: p.video_views ?? null,
          is_pinned: p.is_pinned ?? null,
          taken_at_iso: p.taken_at_iso,
        })),
      });
      expect(in90.length).toBeGreaterThanOrEqual(in30.length);
      (globalThis as any).__livePostUrls = normalized
        .map((p) => p.permalink)
        .filter((u): u is string => Boolean(u))
        .slice(0, 5);
    },
    LONG,
  );

  it(
    "3. cache repeat on a single profile call",
    async () => {
      const again = await scrapeCreatorsProvider.fetchProfile(HANDLE);
      log("profile repeat telemetry", {
        endpoint: again.endpoint,
        creditsConsumed: again.creditsConsumed,
        creditsRemaining: again.creditsRemaining,
        cached: again.cached,
      });
      if (again.cached) expect(again.creditsConsumed ?? 0).toBe(0);
      expect(again.row).toBeTruthy();
    },
    LONG,
  );

  it(
    "4. Comment Intelligence — max 5 posts x 4 comments",
    async () => {
      const urls: string[] = ((globalThis as any).__livePostUrls ?? []).slice(0, 5);
      expect(urls.length).toBeGreaterThan(0);
      const result = await fetchComments(urls, {
        perPostLimit: 4,
        timeoutMs: 180_000,
      });
      log("comments telemetry", {
        provider: result.provider,
        endpoint: result.endpoint,
        creditsConsumed: result.creditsConsumed,
        creditsRemaining: result.creditsRemaining,
        cached: result.cached,
        monetaryCostUsd: result.monetaryCostUsd,
        posts: result.batches.length,
        perPost: result.batches.map((b) => b.comments.length),
        failed: result.failedPostUrls.length,
      });
      expect(result.batches.length).toBeLessThanOrEqual(5);
      for (const b of result.batches) expect(b.comments.length).toBeLessThanOrEqual(4);
    },
    LONG,
  );

  it(
    "5A. ScrapeCreators unavailable → Apify fallback",
    async () => {
      const key = process.env.SCRAPECREATORS_API_KEY;
      process.env.SCRAPECREATORS_API_KEY = "invalid-key-for-fallback-test";
      try {
        const profile = await fetchProfile(HANDLE);
        log("fallback A", {
          provider: profile.provider,
          endpoint: profile.endpoint,
          runId: profile.runId,
          monetaryCostUsd: profile.monetaryCostUsd,
        });
        expect(profile.provider).toBe("apify");
        expect(profile.row).toBeTruthy();
      } finally {
        process.env.SCRAPECREATORS_API_KEY = key;
      }
    },
    LONG,
  );

  it(
    "5B. Apify primary but monthly hard cap reached → ScrapeCreators fallback",
    async () => {
      process.env.SOCIAL_PROVIDER_PROFILE = "apify";
      process.env.APIFY_MONTHLY_HARD_CAP_USD = "0";
      const { invalidateApifyMonthlyBudgetCache } = await import(
        "@/lib/security/apify-budget.server"
      );
      invalidateApifyMonthlyBudgetCache();
      try {
        const profile = await fetchProfile(HANDLE);
        log("fallback B", {
          provider: profile.provider,
          endpoint: profile.endpoint,
          creditsConsumed: profile.creditsConsumed,
          cached: profile.cached,
        });
        expect(profile.provider).toBe("scrapecreators");
      } finally {
        delete process.env.SOCIAL_PROVIDER_PROFILE;
        delete process.env.APIFY_MONTHLY_HARD_CAP_USD;
        invalidateApifyMonthlyBudgetCache();
      }
    },
    LONG,
  );
});
