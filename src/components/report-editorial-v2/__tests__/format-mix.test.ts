import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { AdapterResult, SnapshotPayload } from "@/lib/report/snapshot-to-report-data";
import { buildFormatEntries } from "@/lib/report/format-entries";

import { buildEditorialFormatMixData } from "../format-mix/format-mix-data";
import { EditorialFormatMix } from "../format-mix/editorial-format-mix";

type PostFixture = {
  type: "carousel" | "reel" | "image" | "unknown";
  thumb?: string | null;
};

function makeResult(
  posts: PostFixture[],
  shares: Partial<Record<"Reels" | "Carousels" | "Imagens", number>> = {},
): AdapterResult {
  const total = posts.length;
  const count = (t: string) => posts.filter((p) => p.type === t).length;
  const pct = (t: string) =>
    total > 0 ? Math.round((count(t) / total) * 100) : 0;
  return {
    data: {
      meta: {},
      profile: { username: "perfil" },
      keyMetrics: { postsAnalyzed: total },
      formatBreakdown: [
        { format: "Reels", sharePct: shares.Reels ?? pct("reel") },
        { format: "Carousels", sharePct: shares.Carousels ?? pct("carousel") },
        { format: "Imagens", sharePct: shares.Imagens ?? pct("image") },
      ],
    },
    coverage: {},
    enriched: {
      cadence: {
        method: "window_30d",
        weekly: 2,
        sampleSize: total,
        windowDays: 30,
        sufficient: true,
        notePt: null,
      },
      analysedPostFormats: posts.map((p, i) => ({
        date: `2026-01-${String(i + 1).padStart(2, "0")}`,
        type: p.type,
        ...(p.thumb === undefined
          ? { thumbnailUrl: `https://storage.example/${i}.jpg` }
          : p.thumb
            ? { thumbnailUrl: p.thumb }
            : {}),
      })),
    },
    externalReferences: null,
  } as unknown as AdapterResult;
}

const P = (type: PostFixture["type"], n: number): PostFixture[] =>
  Array.from({ length: n }, () => ({ type }));

describe("buildFormatEntries (shared production helper)", () => {
  it("prefers authoritative payload counts", () => {
    const entries = buildFormatEntries({
      formatBreakdown: [{ format: "Reels", sharePct: 50 }],
      postsAnalyzed: 10,
      formatStats: { reel: { count: 7 } },
      analysedPostFormats: [{ type: "reel" }],
    });
    expect(entries[0]!.count).toBe(7);
  });

  it("falls back to per-post counts, then to share round-trip", () => {
    expect(
      buildFormatEntries({
        formatBreakdown: [{ format: "Reels", sharePct: 50 }],
        postsAnalyzed: 10,
        formatStats: null,
        analysedPostFormats: [{ type: "reel" }, { type: "reel" }],
      })[0]!.count,
    ).toBe(2);

    expect(
      buildFormatEntries({
        formatBreakdown: [{ format: "Reels", sharePct: 50 }],
        postsAnalyzed: 10,
        formatStats: null,
        analysedPostFormats: [],
      })[0]!.count,
    ).toBe(5);
  });
});

describe("buildEditorialFormatMixData", () => {
  it("derives counts, shares and dominant format from the real sample", () => {
    const d = buildEditorialFormatMixData(
      makeResult([...P("carousel", 9), ...P("reel", 2), ...P("image", 1)]),
    );
    expect(d.postsAnalyzed).toBe(12);
    expect(d.countedPosts).toBe(12);
    expect(d.dominant?.key).toBe("Carousels");
    expect(d.dominant?.count).toBe(9);
    expect(d.formatsUsed).toBe(3);
    const reels = d.presentSegments.find((s) => s.key === "Reels")!;
    expect(reels.count).toBe(2);
    expect(reels.sharePct).toBe(17);
  });

  it("changes counts, shares and dominant when the sample changes", () => {
    const d = buildEditorialFormatMixData(
      makeResult([...P("reel", 8), ...P("image", 2)]),
    );
    expect(d.countedPosts).toBe(10);
    expect(d.dominant?.key).toBe("Reels");
    expect(d.presentSegments.map((s) => s.key).sort()).toEqual([
      "Imagens",
      "Reels",
    ]);
    expect(d.formatsUsed).toBe(2);
  });

  it("does not assume a 12-post sample", () => {
    const d = buildEditorialFormatMixData(makeResult(P("reel", 37)));
    expect(d.postsAnalyzed).toBe(37);
    expect(d.posts).toHaveLength(37);
    expect(d.visiblePosts).toHaveLength(12);
    expect(d.hiddenPostCount).toBe(25);
  });

  it("handles a single-format sample", () => {
    const d = buildEditorialFormatMixData(makeResult(P("carousel", 6)));
    expect(d.formatsUsed).toBe(1);
    expect(d.dominant?.sharePct).toBe(100);
  });

  it("handles zero posts without inventing values", () => {
    const d = buildEditorialFormatMixData(makeResult([]));
    expect(d.hasFormatData).toBe(false);
    expect(d.countedPosts).toBe(0);
    expect(d.dominant).toBeNull();
    expect(d.segments.every((s) => s.fraction === 0)).toBe(true);
  });

  it("keeps real thumbnail URLs and marks missing ones as null", () => {
    const d = buildEditorialFormatMixData(
      makeResult([
        { type: "reel", thumb: "https://storage.example/real.jpg" },
        { type: "image", thumb: null },
      ]),
    );
    expect(d.posts[0]!.thumbnailUrl).toBe("https://storage.example/real.jpg");
    expect(d.posts[1]!.thumbnailUrl).toBeNull();
    expect(d.postsWithThumbnail).toBe(1);
  });
});

describe("EditorialFormatMix rendering", () => {
  it("renders real counts, shares and thumbnails without any fetch", () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() => {
        throw new Error("no network allowed");
      });

    const html = renderToStaticMarkup(
      createElement(EditorialFormatMix, {
        result: makeResult([...P("carousel", 9), ...P("reel", 2), ...P("image", 1)]),
      }),
    );

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();

    expect(html).toContain("O que costumas publicar");
    expect(html).toContain("9 de 12");
    expect(html).toContain("75%");
    expect(html).toContain("https://storage.example/0.jpg");
    // Nenhum valor da referência HTML (legendas/valores ilustrativos).
    expect(html).not.toContain("visualizações");
  });

  it("renders the missing-thumbnail fallback instead of fake artwork", () => {
    const html = renderToStaticMarkup(
      createElement(EditorialFormatMix, {
        result: makeResult([{ type: "image", thumb: null }]),
      }),
    );
    expect(html).toContain("sem imagem disponível");
    expect(html).not.toContain("<img");
  });

  it("states factually when only part of the sample is shown", () => {
    const html = renderToStaticMarkup(
      createElement(EditorialFormatMix, {
        result: makeResult(P("reel", 30)),
      }),
    );
    expect(html).toContain("A mostrar 12 de 30 publicações analisadas");
  });
});
