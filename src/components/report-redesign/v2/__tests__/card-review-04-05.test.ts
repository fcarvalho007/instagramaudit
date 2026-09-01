import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { COMMERCIAL_SECTIONS } from "../block-config";

const read = (rel: string) =>
  readFileSync(resolve(process.cwd(), rel), "utf8");

describe("Card Review 04/05 — invariantes de tier", () => {
  const sections = COMMERCIAL_SECTIONS as ReadonlyArray<{
    id: string;
    tier: string;
  }>;

  it("Frequência é gratuita (igual em A, B e C)", () => {
    const freq = sections.find((s) => s.id === "frequencia");
    expect(freq?.tier).toBe("free");
  });

  it("Formatos continua atrás do email (ausente no Estado A)", () => {
    const fmt = sections.find((s) => s.id === "formatos");
    expect(fmt?.tier).toBe("free_email");
  });
});

describe("Card Review 04/05 — fórmulas preservadas", () => {
  const freq = read(
    "src/components/report-redesign/v2/overview/frequency-card.tsx",
  );
  const fmt = read("src/components/report-redesign/v2/overview/format-card.tsx");

  it("cadência continua a vir de postingFrequencyWeekly", () => {
    expect(freq).toContain("formatNumber(postingFrequencyWeekly");
  });

  it("consistência continua a ser publishedCount / dias da janela", () => {
    expect(freq).toContain("(publishedCount / windowedDays.length) * 100");
  });

  it("distribuição de formatos mantém o arredondamento normalizado a 100", () => {
    expect(fmt).toContain("const drift = 100 - rounded.reduce");
  });

  it("filmstrip mantém fallback honesto sem fabricar thumbnails", () => {
    expect(fmt).toContain("onError={() => setFailed(true)}");
  });
});
