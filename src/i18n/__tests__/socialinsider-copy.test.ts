import { describe, it, expect } from "vitest";
import ptReportRaw from "../locales/pt/report.json";
import enReportRaw from "../locales/en/report.json";

const ptReport = ptReportRaw as unknown as Record<string, unknown>;
const enReport = enReportRaw as unknown as Record<string, unknown>;

const IMPERATIVE_RX =
  /(\bdeve\b|\btem de\b|\bideal\b|\bmeta\b|\bregra\b|recommended target|\btarget\b|\bmust\b|\bshould\b)/i;

function readingLabels(report: Record<string, unknown>): string[] {
  const ext = (report as unknown as {
    format: { external_ref: Record<string, string> };
  }).format.external_ref;
  return [
    ext.reading_above_freq,
    ext.reading_below_freq,
    ext.reading_near_freq,
    ext.absent,
  ];
}

describe("Socialinsider report copy", () => {
  it("PT reading labels are neutral (no imperative / target wording)", () => {
    for (const label of readingLabels(ptReport)) {
      expect(label, label).not.toMatch(IMPERATIVE_RX);
    }
  });

  it("EN reading labels are neutral (no imperative / target wording)", () => {
    for (const label of readingLabels(enReport)) {
      expect(label, label).not.toMatch(IMPERATIVE_RX);
    }
  });

  it("PT methodology distinguishes tier benchmark from external reference", () => {
    const note = (ptReport as unknown as {
      external_source_note: { methodology: string };
    }).external_source_note.methodology;
    expect(note).toBeTruthy();
    expect(note.toLowerCase()).toContain("escalão");
    expect(note.toLowerCase()).toContain("referência externa");
    expect(note.toLowerCase()).toContain("socialinsider");
    expect(note).not.toMatch(IMPERATIVE_RX);
  });

  it("EN methodology distinguishes tier benchmark from external reference", () => {
    const note = (enReport as unknown as {
      external_source_note: { methodology: string };
    }).external_source_note.methodology;
    expect(note).toBeTruthy();
    expect(note.toLowerCase()).toContain("tier benchmark");
    expect(note.toLowerCase()).toContain("external reference");
    expect(note.toLowerCase()).toContain("socialinsider");
    expect(note).not.toMatch(IMPERATIVE_RX);
  });

  it("PT bridge copy uses neutral framing (no imperative)", () => {
    const bridge = (ptReport as unknown as {
      format: { external_ref: { bridge: string } };
    }).format.external_ref.bridge;
    expect(bridge).toBeTruthy();
    expect(bridge).not.toMatch(IMPERATIVE_RX);
    expect(bridge.toLowerCase()).toContain("enquadramento");
  });

  it("EN bridge copy uses neutral framing (no imperative)", () => {
    const bridge = (enReport as unknown as {
      format: { external_ref: { bridge: string } };
    }).format.external_ref.bridge;
    expect(bridge).toBeTruthy();
    expect(bridge).not.toMatch(IMPERATIVE_RX);
    expect(bridge.toLowerCase()).toContain("context");
  });

  it("frequency intro never sums per-format Socialinsider values into a single total", () => {
    // The intro lists three separate ≈ values per format and explicitly
    // states it is NOT a fixed rule. It must reference each format key
    // ({{reel}}, {{carousel}}, {{image}}) so values stay disaggregated.
    const intro = (ptReport as unknown as {
      frequency: { external_ref: { intro: string } };
    }).frequency.external_ref.intro;
    expect(intro).toContain("{{reel}}");
    expect(intro).toContain("{{carousel}}");
    expect(intro).toContain("{{image}}");
    expect(intro.toLowerCase()).toContain("não é uma regra fixa");
  });

  it("Socialinsider numeric values are not hardcoded in i18n copy", () => {
    // i18n must only carry templates with {{placeholders}} — never the
    // actual postsPerMonth or engagementPct values. Quick sanity scan:
    // ensure typical Socialinsider numeric tokens (e.g. "6/mês", "1.34%")
    // do not appear as static text in the format.external_ref namespace.
    const ext = (ptReport as unknown as {
      format: { external_ref: Record<string, string> };
    }).format.external_ref;
    for (const [key, value] of Object.entries(ext)) {
      // ref_cell* templates legitimately contain "{{posts}}/mês"
      if (key.startsWith("ref_cell")) continue;
      expect(value, `${key} should not hardcode digits`).not.toMatch(
        /\d+(\.\d+)?\s*(\/mês|\/mo|%\s*ER)/,
      );
    }
  });
});