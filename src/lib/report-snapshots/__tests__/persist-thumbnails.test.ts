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
});