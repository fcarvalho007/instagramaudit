import { describe, expect, it } from "vitest";

describe("live fallback probe B", () => {
  it("Apify primary + hard monthly cap -> ScrapeCreators serves", async () => {
    process.env.SOCIAL_PROVIDER_PROFILE = "apify";
    process.env.SOCIAL_PROVIDER_FALLBACK = "true";
    process.env.APIFY_MONTHLY_HARD_CAP_USD = "0";
    process.env.APIFY_MONTHLY_SOFT_CAP_USD = "0";
    const { fetchProfile } = await import("../router.server");
    const res = await fetchProfile("pingodoce");
    console.log("B", res.provider, res.row ? "row" : "null", res.endpoint, res.creditsCharged, res.creditsRemaining);
    expect(res.provider).toBe("scrapecreators");
    expect(res.row).toBeTruthy();
  }, 180_000);
});
