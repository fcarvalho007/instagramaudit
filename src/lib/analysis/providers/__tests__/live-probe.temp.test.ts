/** TEMPORARY probe: provider-level comment parsing against a real post. */
import { describe, expect, it } from "vitest";

const { scrapeCreatorsProvider } = await import("../scrapecreators.server");

describe("LIVE comment parsing", () => {
  it(
    "maps v2 comments through the provider",
    async () => {
      const res = await scrapeCreatorsProvider.fetchComments(
        ["https://www.instagram.com/p/Da5J5sEjKoR/"],
        { perPostLimit: 4, timeoutMs: 60_000 },
      );
      console.log(
        "\n### provider comments",
        JSON.stringify(
          {
            endpoint: res.endpoint,
            creditsConsumed: res.creditsConsumed,
            creditsRemaining: res.creditsRemaining,
            cached: res.cached,
            failed: res.failedPostUrls.length,
            batches: res.batches.map((b) => b.comments.length),
            sample: res.batches[0]?.comments.slice(0, 2),
          },
          null,
          2,
        ),
      );
      expect(res.batches[0]?.comments.length).toBeGreaterThan(0);
      expect(res.batches[0]?.comments[0]?.timestamp).toBeTruthy();
    },
    240_000,
  );
});
