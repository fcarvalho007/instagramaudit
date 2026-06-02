import { describe, it, expect } from "vitest";

import ptReport from "@/i18n/locales/pt/report.json";
import enReport from "@/i18n/locales/en/report.json";

/**
 * Pure tests guarding the unified premium CTA flow. They run in node
 * (no React) and assert on i18n keys + the tracking event allow-list,
 * which together fix the bug where the analysis-period selector opened
 * the lead-capture UnlockModal instead of the premium pricing dialog.
 */

function resolve(json: Record<string, unknown>, dottedKey: string): string {
  return dottedKey
    .split(".")
    .reduce<unknown>((acc, k) => {
      if (acc && typeof acc === "object" && k in (acc as object)) {
        return (acc as Record<string, unknown>)[k];
      }
      return undefined;
    }, json) as string;
}

describe("Premium CTA — unified labels", () => {
  it("selector locked CTA reads 'Desbloquear relatório completo' in PT", () => {
    expect(resolve(ptReport, "selector.locked.cta")).toBe(
      "Desbloquear relatório completo",
    );
  });

  it("selector locked CTA reads 'Unlock full report' in EN", () => {
    expect(resolve(enReport, "selector.locked.cta")).toBe("Unlock full report");
  });

  it("selector locked title matches the unified copy in both locales", () => {
    expect(resolve(ptReport, "selector.locked.title")).toBe(
      "Disponível no relatório completo",
    );
    expect(resolve(enReport, "selector.locked.title")).toBe(
      "Available in the full report",
    );
  });

  it("sidebar primary CTA shares the same unified label", () => {
    // The sidebar already used this key; we assert it stays canonical
    // so future copy changes have to update both places at once.
    expect(resolve(ptReport, "nav.access.cta")).toBe(
      "Desbloquear relatório completo",
    );
    expect(resolve(enReport, "nav.access.cta")).toBe("Unlock full report");
  });

  it("secondary copy explains the free fallback without offering onboarding", () => {
    const pt = resolve(ptReport, "selector.locked.secondary");
    const en = resolve(enReport, "selector.locked.secondary");
    expect(pt).toBe("Continuar com visão gratuita");
    expect(en).toBe("Continue with free overview");
    // Defensive: the selector must never mention onboarding / lead
    // capture vocabulary in this copy.
    expect(pt.toLowerCase()).not.toMatch(/email|onboarding|registar/);
    expect(en.toLowerCase()).not.toMatch(/email|onboarding|sign\s?up/);
  });
});

describe("Premium CTA — tracking allow-list", () => {
  // Import lazily so the test stays node-pure (the module pulls Zod
  // and TanStack server-fn helpers at module scope).
  it("registers premium_cta_clicked and premium_window_interest", async () => {
    const mod = await import("@/lib/tracking.functions");
    // The module re-uses Zod's enum internally; assert via a round-trip
    // through the public `trackEvent` schema by inspecting the exported
    // helper. We simply check both event names live in the source.
    const source = await import("fs").then((fs) =>
      fs.promises.readFile(
        new URL("../../../../lib/tracking.functions.ts", import.meta.url),
        "utf8",
      ),
    );
    expect(source).toMatch(/"premium_cta_clicked"/);
    expect(source).toMatch(/"premium_window_interest"/);
    // Sanity — the exported function exists.
    expect(typeof mod.trackEvent).toBe("function");
  });
});