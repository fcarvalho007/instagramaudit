/** TEMPORARY probe: confirm the v2 comments payload shape. Deleted after use. */
import { describe, expect, it } from "vitest";

const { scrapeCreatorsProvider } = await import("../scrapecreators.server");

describe("LIVE comments payload shape", () => {
  it(
    "returns comments for a post that has them",
    async () => {
      const posts = await scrapeCreatorsProvider.fetchPosts("pingodoce", {
        maxPosts: 6,
        timeoutMs: 60_000,
      });
      const withComments = posts.rows
        .map((r) => ({
          url: (r as any).url as string | undefined,
          comments: (r as any).commentsCount as number | undefined,
        }))
        .filter((p) => p.url && (p.comments ?? 0) > 0);
      console.log("\n### candidates", JSON.stringify(withComments, null, 2));
      expect(withComments.length).toBeGreaterThan(0);

      const target = withComments[0]!.url!;
      const raw = await fetch(
        `https://api.scrapecreators.com/v2/instagram/post/comments?url=${encodeURIComponent(target)}&amount=4`,
        { headers: { "x-api-key": process.env.SCRAPECREATORS_API_KEY ?? "" } },
      );
      const payload = (await raw.json()) as Record<string, unknown>;
      console.log("\n### v2 payload keys", Object.keys(payload));
      console.log(
        "\n### v2 payload preview",
        JSON.stringify(payload, null, 2).slice(0, 1500),
      );
    },
    240_000,
  );
});
