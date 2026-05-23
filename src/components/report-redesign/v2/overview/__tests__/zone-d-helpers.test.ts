import { describe, it, expect } from "vitest";
import {
  getFrequencyHeadline,
  getFrequencyVerdict,
} from "../frequency-card";
import {
  getFormatHeadline,
  getFormatVerdict,
  toDominantKey,
  type FormatEntry,
} from "../format-card";

// ─── getFrequencyHeadline ───────────────────────────────────────────

describe("getFrequencyHeadline", () => {
  it("returns 'Mais de 1 post por dia' for postsPerDay > 1.2", () => {
    expect(getFrequencyHeadline(1.3)).toBe("Mais de 1 post por dia");
  });

  it("returns 'Cerca de 1 post por dia' for postsPerDay ~1.0", () => {
    expect(getFrequencyHeadline(1.0)).toBe("Cerca de 1 post por dia");
  });

  it("returns '1 post a cada 1–2 dias' for postsPerDay ~0.67", () => {
    expect(getFrequencyHeadline(0.67)).toBe("1 post a cada 1–2 dias");
  });

  it("returns '1 post a cada 2–3 dias' for postsPerDay ~0.4", () => {
    expect(getFrequencyHeadline(0.4)).toBe("1 post a cada 2–3 dias");
  });

  it("returns 'Menos de 1 post por semana' for postsPerDay ~0.1", () => {
    expect(getFrequencyHeadline(0.1)).toBe("Menos de 1 post por semana");
  });

  it("handles zero gracefully", () => {
    expect(getFrequencyHeadline(0)).toBe("Menos de 1 post por semana");
  });
});

// ─── getFrequencyVerdict ────────────────────────────────────────────

describe("getFrequencyVerdict", () => {
  it("returns strong cadence for score >= 70 (aligned with status 'Alta')", () => {
    const v = getFrequencyVerdict(75);
    expect(v.strong).toContain("forte");
  });

  it("returns acceptable cadence for score 40-69 (aligned with status 'Média')", () => {
    const v = getFrequencyVerdict(55);
    expect(v.strong).toContain("aceitável");
  });

  it("returns irregular cadence for score < 40 (aligned with status 'Baixa')", () => {
    const v = getFrequencyVerdict(30);
    expect(v.strong).toContain("irregular");
  });

  it("boundary: score 70 is strong", () => {
    expect(getFrequencyVerdict(70).strong).toContain("forte");
  });

  it("boundary: score 40 is acceptable", () => {
    expect(getFrequencyVerdict(40).strong).toContain("aceitável");
  });

  it("boundary: score 39 is irregular", () => {
    expect(getFrequencyVerdict(39).strong).toContain("irregular");
  });
});

// ─── getFormatHeadline ──────────────────────────────────────────────

describe("getFormatHeadline", () => {
  it("returns 'Apenas carrosséis' when carousel >= 80%", () => {
    const formats: FormatEntry[] = [
      { format: "Carousels", sharePct: 83, count: 10 },
      { format: "Reels", sharePct: 17, count: 2 },
    ];
    expect(getFormatHeadline(formats)).toBe("Apenas carrosséis");
  });

  it("returns 'Carrosséis dominam' when carousel ~67%", () => {
    const formats: FormatEntry[] = [
      { format: "Carousels", sharePct: 67, count: 8 },
      { format: "Reels", sharePct: 33, count: 4 },
    ];
    expect(getFormatHeadline(formats)).toBe("Carrosséis dominam");
  });

  it("returns 'Reels dominam' when reels ~67%", () => {
    const formats: FormatEntry[] = [
      { format: "Reels", sharePct: 67, count: 8 },
      { format: "Carousels", sharePct: 33, count: 4 },
    ];
    expect(getFormatHeadline(formats)).toBe("Reels dominam");
  });

  it("returns 'Mistura equilibrada' when 50/50", () => {
    const formats: FormatEntry[] = [
      { format: "Carousels", sharePct: 50, count: 6 },
      { format: "Reels", sharePct: 50, count: 6 },
    ];
    expect(getFormatHeadline(formats)).toBe("Mistura equilibrada");
  });

  it("returns safe fallback for empty distribution", () => {
    expect(getFormatHeadline([])).toBe("Sem dados de formato");
  });

  it("returns 'Formato pouco definido' when top < 40%", () => {
    const formats: FormatEntry[] = [
      { format: "Carousels", sharePct: 35, count: 4 },
      { format: "Reels", sharePct: 33, count: 4 },
      { format: "Imagens", sharePct: 32, count: 4 },
    ];
    expect(getFormatHeadline(formats)).toBe("Formato pouco definido");
  });
});

// ─── getFormatVerdict ───────────────────────────────────────────────

describe("getFormatVerdict", () => {
  it("carousel verdict mentions guardar", () => {
    const v = getFormatVerdict("carousel");
    expect(v.strong).toContain("guardar");
  });

  it("reel verdict mentions alcance", () => {
    const v = getFormatVerdict("reel");
    expect(v.strong).toContain("alcance");
  });

  it("image verdict mentions comunicação", () => {
    const v = getFormatVerdict("image");
    expect(v.strong).toContain("comunicação");
  });

  it("mixed verdict mentions variado", () => {
    const v = getFormatVerdict("mixed");
    expect(v.strong).toContain("variado");
  });
});

// ─── toDominantKey ──────────────────────────────────────────────────

describe("toDominantKey", () => {
  it("maps Reels with high share to reel", () => {
    expect(toDominantKey("Reels", 65)).toBe("reel");
  });

  it("maps Carousels with high share to carousel", () => {
    expect(toDominantKey("Carousels", 60)).toBe("carousel");
  });

  it("returns mixed when share < 40", () => {
    expect(toDominantKey("Reels", 35)).toBe("mixed");
  });
});
