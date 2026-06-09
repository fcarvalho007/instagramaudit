/**
 * Pure function to compute effective variant features by merging
 * static defaults with optional runtime overrides, then applying
 * hard lock rules.
 *
 * This file is safe to import from both server and client code.
 */

import type { VariantFeatures, FeatureVisibility, ReportVariant } from "./report-variant";

// ── Lock rules — enforced AFTER merge, cannot be overridden ──────

type LockRule = {
  variants: ReportVariant[] | "*";
  value: FeatureVisibility;
};

const LOCKED_MODULES: Partial<Record<keyof VariantFeatures, LockRule>> = {
  debugLabels: { variants: ["public_mvp", "pro_preview"], value: "hidden" },
  overviewHeroKpis: { variants: "*", value: "full" },
  diagnosticQ01Q07: { variants: "*", value: "full" },
  methodology: { variants: ["public_mvp", "pro_preview"], value: "full" },
  // Lab-only blocks 03–06: hard-locked to "hidden" in every non-lab variant.
  // Defesa-em-profundidade contra overrides administrativos que possam,
  // por engano, expor blocos lab no relatório público (Free ou Pro).
  blockPerformance: { variants: ["public_mvp", "pro_preview"], value: "hidden" },
  blockContent:     { variants: ["public_mvp", "pro_preview"], value: "hidden" },
  blockSearch:      { variants: ["public_mvp", "pro_preview"], value: "hidden" },
  blockBenchmark:   { variants: ["public_mvp", "pro_preview"], value: "hidden" },
};

export { LOCKED_MODULES };

/**
 * Returns true if a module is locked for a given variant.
 */
export function isModuleLocked(
  module: keyof VariantFeatures,
  variant: ReportVariant,
): boolean {
  const rule = LOCKED_MODULES[module];
  if (!rule) return false;
  if (rule.variants === "*") return true;
  return rule.variants.includes(variant);
}

/**
 * Returns the locked value for a module/variant, or undefined if not locked.
 */
export function getLockedValue(
  module: keyof VariantFeatures,
  variant: ReportVariant,
): FeatureVisibility | undefined {
  if (!isModuleLocked(module, variant)) return undefined;
  return LOCKED_MODULES[module]!.value;
}

/**
 * Merge static defaults with an optional partial override, then
 * apply lock rules. Returns a complete VariantFeatures object.
 */
export function getEffectiveFeatures(
  variant: ReportVariant,
  staticDefaults: VariantFeatures,
  override?: Partial<VariantFeatures> | null,
): VariantFeatures {
  // Start from static defaults
  const merged: VariantFeatures = { ...staticDefaults };

  // Apply overrides (only valid keys)
  if (override) {
    for (const key of Object.keys(override) as (keyof VariantFeatures)[]) {
      if (key in merged && override[key]) {
        merged[key] = override[key];
      }
    }
  }

  // Enforce lock rules (always wins)
  for (const key of Object.keys(merged) as (keyof VariantFeatures)[]) {
    const locked = getLockedValue(key, variant);
    if (locked !== undefined) {
      merged[key] = locked;
    }
  }

  return merged;
}