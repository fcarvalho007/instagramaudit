import { describe, expect, it } from "vitest";
import {
  snapshotToReportData,
  type SnapshotPayload,
  type SnapshotPost,
} from "../snapshot-to-report-data";

function post(
  id: string,
  engagementPct: number,
  thumbnailStorageUrl?: string,
  thumbnailUrl?: string,
): SnapshotPost {
  return {
    id,
    shortcode: id,
    caption: `Publicação ${id}`,
    format: "Image",
    likes: Math.round(engagementPct * 100),
    comments: 5,
    engagement_pct: engagementPct,
    taken_at_iso: new Date(Date.now() - engagementPct * 86_400_000).toISOString(),
    thumbnail_storage_url: thumbnailStorageUrl,
    thumbnail_url: thumbnailUrl,
  };
}

function payload(posts: SnapshotPost[]): SnapshotPayload {
  return {
    profile: {
      username: "perfil.teste",
      followers_count: 1_000,
    },
    posts,
  };
}

describe("snapshotToReportData — imagens reais das publicações", () => {
  it("entrega a imagem persistida aos cartões de melhor e pior publicação", () => {
    const bestStored = "https://storage.example/best.jpg";
    const worstStored = "https://storage.example/worst.jpg";
    const posts = [
      post("best", 4, bestStored, "https://cdn.example/best.jpg"),
      post("middle-a", 3, "https://storage.example/a.jpg"),
      post("middle-b", 2, "https://storage.example/b.jpg"),
      post("worst", 1, worstStored, "https://cdn.example/worst.jpg"),
    ];

    const { enriched } = snapshotToReportData({ payload: payload(posts) });

    expect(enriched.topPosts[0]?.thumbnailUrl).toBe(bestStored);
    expect(enriched.bottomPosts.find((item) => item.id === "worst")?.thumbnailUrl).toBe(
      worstStored,
    );
  });

  it("usa o URL original quando ainda não existe uma cópia persistida", () => {
    const sourceUrl = "https://cdn.example/source.jpg";
    const posts = [
      post("best", 4, undefined, sourceUrl),
      post("middle-a", 3),
      post("middle-b", 2),
      post("worst", 1),
    ];

    const { enriched } = snapshotToReportData({ payload: payload(posts) });

    expect(enriched.topPosts[0]?.thumbnailUrl).toBe(sourceUrl);
  });
});