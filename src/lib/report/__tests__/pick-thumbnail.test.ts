import { describe, it, expect } from "vitest";
import { pickThumbnailUrl } from "@/lib/report/pick-thumbnail";

describe("pickThumbnailUrl", () => {
  it("prefers thumbnail_storage_url over thumbnail_url", () => {
    expect(
      pickThumbnailUrl({
        thumbnail_storage_url: "https://storage/x.jpg",
        thumbnail_url: "https://ig/y.jpg",
      }),
    ).toBe("https://storage/x.jpg");
  });

  it("falls back to thumbnail_url when storage is null", () => {
    expect(
      pickThumbnailUrl({
        thumbnail_storage_url: null,
        thumbnail_url: "https://ig/y.jpg",
      }),
    ).toBe("https://ig/y.jpg");
  });

  it("falls back to camelCase thumbnailUrl", () => {
    expect(pickThumbnailUrl({ thumbnailUrl: "https://x" })).toBe("https://x");
  });

  it("returns null when all sources missing", () => {
    expect(pickThumbnailUrl({})).toBeNull();
    expect(
      pickThumbnailUrl({ thumbnail_storage_url: null, thumbnail_url: null }),
    ).toBeNull();
  });
});