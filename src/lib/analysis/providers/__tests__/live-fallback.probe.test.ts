/**
 * TEMPORARY live probe — deleted after the operational validation run.
 * Hits real providers; not part of the permanent suite.
 */
import { describe, expect, it } from "vitest";

describe("live fallback probe", () => {
  it("A: ScrapeCreators broken -> Apify serves the profile", async () => {
    process.env.SCRAPECREATORS_API_KEY = "invalid-key-for-fallback-probe";
    process.env.SOCIAL_PROVIDER_PROFILE = "scrapecreators";
    process.env.SOCIAL_PROVIDER_FALLBACK = "true";
    const { fetchProfile } = await import("../router.server");
    const res = await fetchProfile("pingodoce");
    console.log("A", res.provider, res.row ? "row" : "null", res.endpoint);
    expect(res.provider).toBe("apify");
    expect(res.row).toBeTruthy();
  }, 180_000);
});
