import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { AdapterResult } from "@/lib/report/snapshot-to-report-data";

import {
  buildEditorialFrequencyData,
  describeWindow,
} from "../frequency/frequency-data";
import { EditorialFrequency } from "../frequency/editorial-frequency";

/** Gera dias consecutivos a partir de uma segunda-feira UTC conhecida. */
function timeline(counts: number[]): Array<{
  date: string;
  published: boolean;
  postCount: number;
}> {
  const start = new Date("2026-01-05T00:00:00Z"); // segunda-feira
  return counts.map((postCount, i) => {
    const d = new Date(start.getTime());
    d.setUTCDate(d.getUTCDate() + i);
    return {
      date: d.toISOString().slice(0, 10),
      published: postCount > 0,
      postCount,
    };
  });
}

function makeResult(over: {
  counts: number[];
  weekly?: number;
  method?: string;
  windowDays?: number;
  sufficient?: boolean;
  sampleSize?: number;
  notePt?: string | null;
}): AdapterResult {
  const days = timeline(over.counts);
  return {
    data: {
      meta: {},
      profile: { username: "perfil" },
      keyMetrics: { postingFrequencyWeekly: over.weekly ?? 3.5 },
    },
    coverage: {},
    enriched: {
      postingTimeline: days,
      windowRange: {
        startIso: days[0]!.date,
        endIso: days[days.length - 1]!.date,
      },
      cadence: {
        method: over.method ?? "window_30d",
        weekly: over.weekly ?? 3.5,
        sampleSize:
          over.sampleSize ?? over.counts.reduce((s, n) => s + n, 0),
        windowDays: over.windowDays ?? 30,
        sufficient: over.sufficient ?? true,
        notePt: over.notePt ?? null,
      },
    },
    externalReferences: null,
  } as unknown as AdapterResult;
}

describe("buildEditorialFrequencyData", () => {
  it("aggregates weekday counts from the real timeline", () => {
    // Seg=2, Ter=0, Qua=1, Qui=0, Sex=3, Sáb=0, Dom=1
    const d = buildEditorialFrequencyData(
      makeResult({ counts: [2, 0, 1, 0, 3, 0, 1] }),
    );
    expect(d.columns.map((c) => c.posts)).toEqual([2, 0, 1, 0, 3, 0, 1]);
    expect(d.totalPosts).toBe(7);
    expect(d.maxPosts).toBe(3);
    expect(d.peakWeekdays).toEqual([4]); // sexta-feira
    expect(d.hasTie).toBe(false);
    expect(d.silentWeekdays).toEqual([1, 3, 5]);
  });

  it("responds to a different fixture", () => {
    const d = buildEditorialFrequencyData(
      makeResult({ counts: [0, 0, 0, 0, 0, 4, 0] }),
    );
    expect(d.columns.map((c) => c.posts)).toEqual([0, 0, 0, 0, 0, 4, 0]);
    expect(d.peakWeekdays).toEqual([5]);
    expect(d.silentWeekdays).toHaveLength(6);
  });

  it("handles ties without electing a single best day", () => {
    const d = buildEditorialFrequencyData(
      makeResult({ counts: [2, 0, 2, 0, 0, 0, 0] }),
    );
    expect(d.peakWeekdays).toEqual([0, 2]);
    expect(d.hasTie).toBe(true);
    const html = renderToStaticMarkup(
      createElement(EditorialFrequency, {
        result: makeResult({ counts: [2, 0, 2, 0, 0, 0, 0] }),
      }),
    );
    expect(html).toContain("Vários dias partilham a maior concentração");
    expect(html).toContain("repartida por segunda-feira e quarta-feira");
  });

  it("never manufactures a healthy status on an insufficient sample", () => {
    const d = buildEditorialFrequencyData(
      makeResult({
        counts: [1, 0, 0, 0, 0, 0, 0],
        weekly: 0,
        method: "insufficient",
        windowDays: 0,
        sufficient: false,
        notePt: "Amostra recente insuficiente",
      }),
    );
    expect(d.status.label).toBe("Amostra insuficiente");
    expect(d.status.tone).toBe("neutral");
    expect(d.calculationNote).toContain("Amostra recente insuficiente");
  });

  it("handles zero weekday data", () => {
    const d = buildEditorialFrequencyData(makeResult({ counts: [0, 0, 0, 0, 0, 0, 0] }));
    expect(d.hasWeekdayData).toBe(false);
    expect(d.peakWeekdays).toEqual([]);
    const html = renderToStaticMarkup(
      createElement(EditorialFrequency, {
        result: makeResult({ counts: [0, 0, 0, 0, 0, 0, 0] }),
      }),
    );
    expect(html).toContain("Sem publicações datadas suficientes");
  });

  it("describes the active window from the cadence method", () => {
    expect(describeWindow("window_30d", 30)).toBe("últimos 30 dias");
    expect(describeWindow("window_90d", 90)).toBe("últimos 90 dias");
    expect(describeWindow("sample_span", 47)).toBe(
      "período observado de 47 dias",
    );
    expect(describeWindow("insufficient", 0)).toBe(
      "publicações mais recentes disponíveis",
    );
  });
});

describe("EditorialFrequency", () => {
  it("renders the 02 eyebrow, the title and the seven weekday labels", () => {
    const html = renderToStaticMarkup(
      createElement(EditorialFrequency, {
        result: makeResult({ counts: [1, 2, 0, 1, 3, 0, 1] }),
      }),
    );
    expect(html).toContain("02");
    expect(html).toContain("Com que ritmo publicas");
    for (const label of ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]) {
      expect(html).toContain(label);
    }
  });

  it("is context aware for 90d and never assumes four weeks", () => {
    const html90 = renderToStaticMarkup(
      createElement(EditorialFrequency, {
        result: makeResult({
          counts: [1, 1, 1, 1, 1, 1, 1],
          method: "window_90d",
          windowDays: 90,
        }),
      }),
    );
    expect(html90).toContain("últimos 90 dias");
    expect(html90).not.toContain("últimos 30 dias");
    expect(html90).not.toContain("quatro semanas");

    const htmlSpan = renderToStaticMarkup(
      createElement(EditorialFrequency, {
        result: makeResult({
          counts: [1, 0, 1, 0, 1, 0, 0],
          method: "sample_span",
          windowDays: 21,
        }),
      }),
    );
    expect(htmlSpan).toContain("período observado de 21 dias");
    expect(htmlSpan).not.toContain("quatro semanas");
  });

  it("does not perform any network request", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    renderToStaticMarkup(
      createElement(EditorialFrequency, {
        result: makeResult({ counts: [1, 1, 0, 0, 2, 0, 0] }),
      }),
    );
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
