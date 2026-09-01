import { describe, expect, it } from "vitest";
import { pickImageUrl } from "@/lib/analysis/providers/scrapecreators.server";

describe("pickImageUrl (ScrapeCreators)", () => {
  it("prefers a direct display_url", () => {
    expect(pickImageUrl({ display_url: "https://cdn/a.jpg" })).toBe(
      "https://cdn/a.jpg",
    );
  });

  it("reads the highest-resolution candidate from image_versions2", () => {
    const raw = {
      image_versions2: {
        candidates: [
          { url: "https://cdn/small.jpg", width: 150, height: 150 },
          { url: "https://cdn/large.jpg", width: 1080, height: 1080 },
        ],
      },
    };
    expect(pickImageUrl(raw)).toBe("https://cdn/large.jpg");
  });

  it("falls back to the first carousel item cover", () => {
    const raw = {
      carousel_media: [
        {
          image_versions2: {
            candidates: [{ url: "https://cdn/c1.jpg", width: 1080 }],
          },
        },
      ],
    };
    expect(pickImageUrl(raw)).toBe("https://cdn/c1.jpg");
  });

  it("uses the Reel cover frame", () => {
    const raw = {
      media_type: 2,
      video_versions: [{ url: "https://cdn/video.mp4", width: 720 }],
      clips_metadata: {
        cover_media: {
          image_versions2: {
            candidates: [{ url: "https://cdn/cover.jpg", width: 720 }],
          },
        },
      },
    };
    expect(pickImageUrl(raw)).toBe("https://cdn/cover.jpg");
  });

  it("never returns a video url", () => {
    const raw = { video_versions: [{ url: "https://cdn/video.mp4" }] };
    expect(pickImageUrl(raw)).toBeNull();
  });

  it("returns null when there is no image at all", () => {
    expect(pickImageUrl({ id: "1", like_count: 3 })).toBeNull();
  });

  it("ignores malformed candidate entries", () => {
    const raw = {
      image_versions2: { candidates: [null, {}, { url: "  " }] },
      thumbnail_resources: [{ src: "https://cdn/t.jpg", width: 320 }],
    };
    expect(pickImageUrl(raw)).toBe("https://cdn/t.jpg");
  });
});
