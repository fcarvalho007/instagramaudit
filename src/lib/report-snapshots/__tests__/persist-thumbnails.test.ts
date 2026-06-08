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

function mkPayload(thumb: string | null) {
  return {
    posts: [{ shortcode: "abc", thumbnail_url: thumb }],
    profile: { avatar_url: null },
  } as Record<string, unknown>;
}

describe("persistThumbnailsInPayload", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("counts 403 and preserves original thumbnail_url", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 403 })),
    );
    const payload = mkPayload(IG);
    const s = await persistThumbnailsInPayload("key", payload);
    expect(s.attempted).toBe(1);
    expect(s.failed_403).toBe(1);
    expect(s.stored).toBe(0);
    const post = (payload.posts as Record<string, unknown>[])[0];
    expect(post.thumbnail_url).toBe(IG);
    expect(post.thumbnail_storage_url).toBeNull();
  });

  it("rejects non-image content-type", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("<html/>", {
          status: 200,
          headers: { "content-type": "text/html" },
        }),
      ),
    );
    const payload = mkPayload(IG);
    const s = await persistThumbnailsInPayload("key", payload);
    expect(s.failed_invalid_content_type).toBe(1);
    expect((payload.posts as Record<string, unknown>[])[0].thumbnail_storage_url).toBeNull();
  });

  it("uploads and writes storage URL on success without touching original", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(new Uint8Array([1, 2, 3]), {
          status: 200,
          headers: { "content-type": "image/jpeg" },
        }),
      ),
    );
    const payload = mkPayload(IG);
    const s = await persistThumbnailsInPayload("key", payload);
    expect(s.stored).toBe(1);
    const post = (payload.posts as Record<string, unknown>[])[0];
    expect(post.thumbnail_url).toBe(IG);
    expect(post.thumbnail_storage_url).toBe("https://storage.test/x.jpg");
  });

  it("does not throw when fetch throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("boom")));
    const payload = mkPayload(IG);
    await expect(persistThumbnailsInPayload("key", payload)).resolves.toBeDefined();
  });

  it("persists competitor avatar and post thumbnails on success", async () => {
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
      profile: { avatar_url: null },
      competitors: [
        {
          success: true,
          profile: { username: "rival", avatar_url: IG },
          posts: [
            { shortcode: "p1", thumbnail_url: IG },
            { shortcode: "p2", thumbnail_url: IG },
          ],
        },
      ],
    };
    const s = await persistThumbnailsInPayload("key", payload);
    expect(s.competitors_avatar_ok).toBe(1);
    expect(s.competitors_attempted).toBe(2);
    expect(s.competitors_stored).toBe(2);
    const comp = (payload.competitors as Record<string, unknown>[])[0];
    const cProfile = comp.profile as Record<string, unknown>;
    expect(cProfile.avatar_storage_url).toBe("https://storage.test/x.jpg");
    expect(cProfile.avatar_url).toBe(IG);
    const cPosts = comp.posts as Record<string, unknown>[];
    expect(cPosts[0].thumbnail_storage_url).toBe("https://storage.test/x.jpg");
    expect(cPosts[1].thumbnail_storage_url).toBe("https://storage.test/x.jpg");
  });

  it("competitor avatar failure is recorded without throwing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 403 })),
    );
    const payload: Record<string, unknown> = {
      posts: [],
      profile: { avatar_url: null },
      competitors: [
        {
          success: true,
          profile: { username: "rival", avatar_url: IG },
          posts: [],
        },
      ],
    };
    const s = await persistThumbnailsInPayload("key", payload);
    expect(s.competitors_avatar_fail).toBe(1);
    const cProfile = (payload.competitors as Record<string, unknown>[])[0]
      .profile as Record<string, unknown>;
    expect(cProfile.avatar_storage_url).toBeNull();
  });
});