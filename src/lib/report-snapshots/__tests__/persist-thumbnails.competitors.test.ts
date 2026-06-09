import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/integrations/supabase/client.server", () => {
  const upload = vi.fn().mockResolvedValue({ error: null });
  const getPublicUrl = vi
    .fn()
    .mockReturnValue({ data: { publicUrl: "https://storage.test/x.jpg" } });
  return {
    supabaseAdmin: {
      storage: { from: () => ({ upload, getPublicUrl }) },
    },
  };
});

import { persistThumbnailsInPayload } from "@/lib/report-snapshots/persist-thumbnails.server";

const IG = "https://scontent-mad.cdninstagram.com/v/foo.jpg";
const NON_IG = "https://example.com/avatar.jpg";

/**
 * Regression: the payload shape mirrors what `analyze-public-v1.ts` writes
 * for competitors after running through `enrichPosts` + its sanitiser:
 * `thumbnail_storage_url` is initialised to `null` on every post, and
 * `coauthors`/`tagged_users`/`location_name` are stripped. Persistence must
 * mutate the `null` placeholders into real storage URLs without touching
 * the original IG CDN URLs.
 */
describe("persistThumbnailsInPayload — competitors round-trip", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("populates avatar_storage_url and thumbnail_storage_url on the analyze-public-v1 shape", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(
        async () =>
          new Response(new Uint8Array([1, 2, 3]), {
            status: 200,
            headers: { "content-type": "image/jpeg" },
          }),
      ),
    );
    const payload: Record<string, unknown> = {
      posts: [],
      profile: { avatar_url: null, avatar_storage_url: null },
      competitors: [
        {
          success: true,
          profile: {
            username: "rival",
            avatar_url: IG,
            avatar_storage_url: null,
          },
          posts: [
            { shortcode: "p1", thumbnail_url: IG, thumbnail_storage_url: null },
            { shortcode: "p2", thumbnail_url: IG, thumbnail_storage_url: null },
          ],
        },
      ],
    };
    await persistThumbnailsInPayload("key", payload);
    const comp = (payload.competitors as Record<string, unknown>[])[0];
    const cProfile = comp.profile as Record<string, unknown>;
    expect(cProfile.avatar_storage_url).toBe("https://storage.test/x.jpg");
    expect(cProfile.avatar_url).toBe(IG); // original preserved
    const cPosts = comp.posts as Record<string, unknown>[];
    expect(cPosts[0].thumbnail_storage_url).toBe("https://storage.test/x.jpg");
    expect(cPosts[1].thumbnail_storage_url).toBe("https://storage.test/x.jpg");
    expect(cPosts[0].thumbnail_url).toBe(IG);
  });

  it("skips failed competitors and non-IG URLs", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { "content-type": "image/jpeg" },
      }),
    );
    vi.stubGlobal("fetch", fetchSpy);
    const payload: Record<string, unknown> = {
      posts: [],
      profile: { avatar_url: null },
      competitors: [
        { success: false, error_code: "PROFILE_NOT_FOUND" },
        {
          success: true,
          profile: { username: "nonig", avatar_url: NON_IG },
          posts: [
            { shortcode: "p1", thumbnail_url: NON_IG, thumbnail_storage_url: null },
          ],
        },
      ],
    };
    const s = await persistThumbnailsInPayload("key", payload);
    // No IG URLs anywhere → no upload attempts for competitors.
    expect(s.competitors_attempted ?? 0).toBe(0);
    expect(s.competitors_stored ?? 0).toBe(0);
    expect(s.competitors_avatar_ok ?? 0).toBe(0);
    expect(s.competitors_avatar_fail ?? 0).toBe(0);
    expect(fetchSpy).not.toHaveBeenCalled();
    const ok = (payload.competitors as Record<string, unknown>[])[1];
    const okProfile = ok.profile as Record<string, unknown>;
    expect(okProfile.avatar_storage_url).toBeUndefined();
    const okPosts = ok.posts as Record<string, unknown>[];
    expect(okPosts[0].thumbnail_storage_url).toBeNull();
  });
});