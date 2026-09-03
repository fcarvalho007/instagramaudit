import { describe, expect, it } from "vitest";

import type { AdapterResult } from "@/lib/report/snapshot-to-report-data";
import {
  buildAmplitude,
  buildEditorialKeyPostsData,
} from "../key-posts/key-posts-data";
import {
  buildKeyPostsObservations,
  buildKeyPostsReading,
} from "../key-posts/editorial-key-posts";

function post(overrides: Record<string, unknown> = {}) {
  return {
    id: "p1",
    permalink: "https://instagram.com/p/p1",
    shortcode: "p1",
    caption: "Legenda real da publicação",
    format: "Reel",
    likes: 120,
    comments: 8,
    engagementPct: 4.2,
    date: "01/03/2026",
    takenAtIso: "2026-03-01T10:00:00.000Z",
    mentions: [],
    thumbnailUrl: "https://cdn/x.jpg",
    ...overrides,
  };
}

function scatter(overrides: Record<string, unknown> = {}) {
  return {
    id: "p1",
    format: "Reel",
    engagementPct: 4.2,
    date: "01/03/2026",
    takenAtIso: "2026-03-01T10:00:00.000Z",
    ...overrides,
  };
}

function makeResult(enriched: Record<string, unknown>): AdapterResult {
  return {
    data: { profile: { username: "teste" } },
    enriched: {
      cadence: { method: "window_30d", windowDays: 30 },
      windowRange: null,
      ...enriched,
    },
  } as unknown as AdapterResult;
}

describe("buildEditorialKeyPostsData", () => {
  const base = makeResult({
    allPostsScatter: [
      scatter({ id: "a", engagementPct: 6, takenAtIso: "2026-03-05T10:00:00Z", date: "05/03/2026" }),
      scatter({ id: "b", engagementPct: 4, takenAtIso: "2026-03-03T10:00:00Z", date: "03/03/2026" }),
      scatter({ id: "c", engagementPct: 2, takenAtIso: "2026-03-01T10:00:00Z", date: "01/03/2026" }),
    ],
    topPosts: [post({ id: "a", engagementPct: 6, date: "05/03/2026", takenAtIso: "2026-03-05T10:00:00Z" })],
    bottomPosts: [
      post({ id: "b", engagementPct: 4 }),
      post({ id: "c", engagementPct: 2, format: "Image", likes: 30, comments: 1, takenAtIso: "2026-03-01T10:00:00Z" }),
    ],
  });

  it("usa a média aritmética do scatter carregado", () => {
    expect(buildEditorialKeyPostsData(base).average).toBeCloseTo(4, 6);
  });

  it("selecciona melhor e pior exactamente como a produção", () => {
    const d = buildEditorialKeyPostsData(base);
    expect(d.best?.id).toBe("a");
    expect(d.worst?.id).toBe("c");
    expect(d.hasComparison).toBe(true);
  });

  it("ordena os pontos cronologicamente e normaliza x entre 0 e 1", () => {
    const d = buildEditorialKeyPostsData(base);
    expect(d.points.map((p) => p.id)).toEqual(["c", "b", "a"]);
    expect(d.points[0]!.x).toBe(0);
    expect(d.points[2]!.x).toBe(1);
    for (const p of d.points) {
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(1);
    }
  });

  it("acompanha dados diferentes (sem valores fixos)", () => {
    const other = makeResult({
      allPostsScatter: [
        scatter({ id: "x", engagementPct: 10 }),
        scatter({ id: "y", engagementPct: 0 }),
      ],
      topPosts: [post({ id: "x", engagementPct: 10 })],
      bottomPosts: [post({ id: "y", engagementPct: 0 })],
    });
    const d = buildEditorialKeyPostsData(other);
    expect(d.average).toBeCloseTo(5, 6);
    expect(d.sampleSize).toBe(2);
    expect(d.best?.id).toBe("x");
  });

  it("não marca comparação quando bottomPosts está vazio", () => {
    const d = buildEditorialKeyPostsData(
      makeResult({
        allPostsScatter: [scatter({ id: "a" })],
        topPosts: [post({ id: "a" })],
        bottomPosts: [],
      }),
    );
    expect(d.hasComparison).toBe(false);
    expect(d.worst).toBeNull();
    expect(d.points[0]!.x).toBe(0.5);
  });

  it("suporta amostra vazia sem lançar", () => {
    const d = buildEditorialKeyPostsData(
      makeResult({ allPostsScatter: [], topPosts: [], bottomPosts: [] }),
    );
    expect(d.sampleSize).toBe(0);
    expect(d.best).toBeNull();
    expect(d.bestDeltaPct).toBeNull();
  });

  it("detecta amostra plana", () => {
    const d = buildEditorialKeyPostsData(
      makeResult({
        allPostsScatter: [scatter({ id: "a" }), scatter({ id: "b", engagementPct: 4.2 })],
        topPosts: [post({ id: "a" })],
        bottomPosts: [post({ id: "b" })],
      }),
    );
    expect(d.flatSample).toBe(true);
    expect(d.amplitude.kind).toBe("none");
  });
});

describe("buildAmplitude", () => {
  it("devolve rácio quando o pior é positivo", () => {
    expect(buildAmplitude(6, 2)).toMatchObject({ kind: "ratio", ratio: 3 });
  });

  it("devolve pontos percentuais quando o pior é zero", () => {
    expect(buildAmplitude(6, 0)).toMatchObject({ kind: "points", points: 6 });
  });

  it("devolve ausência de amplitude quando são iguais", () => {
    expect(buildAmplitude(3, 3).kind).toBe("none");
  });
});

describe("copy das publicações-chave", () => {
  const d = buildEditorialKeyPostsData(
    makeResult({
      allPostsScatter: [
        scatter({ id: "a", engagementPct: 6 }),
        scatter({ id: "c", engagementPct: 2, takenAtIso: "2026-03-01T10:00:00Z" }),
      ],
      topPosts: [post({ id: "a", engagementPct: 6, takenAtIso: "2026-03-05T10:00:00Z" })],
      bottomPosts: [post({ id: "c", engagementPct: 2, format: "Image" })],
    }),
  );

  it("observações são factuais e mencionam os valores reais", () => {
    const obs = buildKeyPostsObservations(d);
    expect(obs.join(" ")).toContain("6,00%");
    expect(obs.join(" ")).toContain("2,00%");
    expect(obs.join(" ")).not.toMatch(/porque|deve-se a/i);
  });

  it("leitura é cautelosa e não causal", () => {
    const reading = buildKeyPostsReading(d);
    expect(reading).not.toBeNull();
    expect(reading!.hypothesis).toMatch(/não permitem atribuir causalidade/);
  });
});
