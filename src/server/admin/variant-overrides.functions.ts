/**
 * Server functions for the module visibility manager.
 * Admin-only CRUD for report variant overrides.
 */

import { createServerFn } from "@tanstack/react-start";
import {
  loadOverride,
  loadAllOverrides,
  saveDraft,
  publishDraft,
  discardDraft,
  resetToDefaults,
} from "@/lib/report/variant-overrides.server";
import { getVariantFeatures } from "@/lib/report/report-variant";
import { getEffectiveFeatures } from "@/lib/report/effective-features";
import type { ReportVariant, VariantFeatures } from "@/lib/report/report-variant";

// ── Read: effective features for a variant (public-safe) ─────────

export const getPublishedFeatures = createServerFn({ method: "GET" })
  .inputValidator((data: { variant: ReportVariant }) => data)
  .handler(async ({ data }) => {
    try {
      const override = await loadOverride(data.variant, false);
      const staticDefaults = getVariantFeatures(data.variant);
      return getEffectiveFeatures(data.variant, staticDefaults, override);
    } catch {
      // Fallback to static defaults on any DB error
      return getVariantFeatures(data.variant);
    }
  });

// ── Read: draft features for admin preview ───────────────────────

export const getDraftFeatures = createServerFn({ method: "GET" })
  .inputValidator((data: { variant: ReportVariant }) => data)
  .handler(async ({ data }) => {
    try {
      const override = await loadOverride(data.variant, true);
      const staticDefaults = getVariantFeatures(data.variant);
      // If no draft, fall back to published, then static
      if (!override) {
        const published = await loadOverride(data.variant, false);
        return getEffectiveFeatures(data.variant, staticDefaults, published);
      }
      return getEffectiveFeatures(data.variant, staticDefaults, override);
    } catch {
      return getVariantFeatures(data.variant);
    }
  });

// ── Read: all overrides for admin matrix ─────────────────────────

export const getAllOverrides = createServerFn({ method: "GET" }).handler(
  async () => {
    const rows = await loadAllOverrides();
    return { rows };
  },
);

// ── Write: save draft ────────────────────────────────────────────

export const saveVariantDraft = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      variant: ReportVariant;
      features: Partial<VariantFeatures>;
      adminEmail: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    await saveDraft(data.variant, data.features, data.adminEmail);
    return { ok: true };
  });

// ── Write: publish draft ─────────────────────────────────────────

export const publishVariantDraft = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { variant: ReportVariant; adminEmail: string }) => data,
  )
  .handler(async ({ data }) => {
    await publishDraft(data.variant, data.adminEmail);
    return { ok: true };
  });

// ── Write: discard draft ─────────────────────────────────────────

export const discardVariantDraft = createServerFn({ method: "POST" })
  .inputValidator((data: { variant: ReportVariant }) => data)
  .handler(async ({ data }) => {
    await discardDraft(data.variant);
    return { ok: true };
  });

// ── Write: reset to static defaults ──────────────────────────────

export const resetVariantDefaults = createServerFn({ method: "POST" })
  .inputValidator((data: { variant: ReportVariant }) => data)
  .handler(async ({ data }) => {
    await resetToDefaults(data.variant);
    return { ok: true };
  });