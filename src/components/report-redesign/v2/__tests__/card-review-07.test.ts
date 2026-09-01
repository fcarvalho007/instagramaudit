/**
 * Card Review 07 — Engagement.
 *
 * Guardas estruturais: o header mantém-se canónico (inline, sem
 * qualifierPlacement) e o corpo passa a usar o bloco comparativo único
 * com as mesmas chaves i18n de KPI (zero copy nova).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(process.cwd(), "src/components/report-redesign/v2");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

const CARD = read("report-overview-engagement.tsx");
const ROW = read("overview/engagement-kpi-row.tsx");

describe("Card Review 07 — Engagement", () => {
  it("header continua canónico e inline", () => {
    expect(CARD).toContain("<ReportCardSectionHeader");
    expect(CARD).not.toContain("qualifierPlacement");
    expect(CARD).toContain('eyebrow={t("engagement.eyebrow")}');
    expect(CARD).toContain('title={t("engagement.title")}');
    expect(CARD).toContain("qualifier={engagementStatus}");
  });

  it("usa o bloco comparativo único em vez de três KPI cards", () => {
    expect(CARD).toContain("<EngagementKpiRow");
    expect(CARD).not.toContain("sm:grid-cols-3");
  });

  it("reutiliza as chaves i18n existentes dos KPIs", () => {
    for (const key of [
      "engagement.kpi.profile_full",
      "engagement.kpi.profile_short",
      "engagement.kpi.profile_caption_full",
      "engagement.kpi.tier_full",
      "engagement.kpi.tier_caption_full",
      "engagement.kpi.gap_full",
      "engagement.kpi.gap_caption",
    ]) {
      expect(CARD).toContain(key);
    }
  });

  it("preserva a lógica analítica e o gráfico", () => {
    for (const token of [
      "getConsolidatedBenchmarkSeries",
      "getActiveTierIndex",
      "const gapPp = k.engagementRate - chartBenchmarkVal",
      "readingText",
      "<ReportEngagementBenchmarkChart",
      "<InsightCallout",
    ]) {
      expect(CARD).toContain(token);
    }
  });

  it("o bloco de KPIs é puramente apresentacional", () => {
    expect(ROW).not.toContain("useTranslation");
    expect(ROW).not.toMatch(/benchmarkSeries|engagementRate\s*[-*/]/);
  });
});
