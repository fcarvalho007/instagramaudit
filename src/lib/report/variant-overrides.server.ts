/**
 * Server-only helpers for reading/writing report variant overrides.
 * Uses supabaseAdmin — bypasses RLS (table has no client policies).
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { ReportVariant, VariantFeatures } from "./report-variant";

export interface VariantOverrideRow {
  id: string;
  variant: ReportVariant;
  is_draft: boolean;
  features_json: Partial<VariantFeatures>;
  updated_by: string | null;
  updated_at: string;
}

/**
 * Load a single override (draft or published) for a variant.
 * Returns null if no override exists.
 */
export async function loadOverride(
  variant: ReportVariant,
  isDraft: boolean,
): Promise<Partial<VariantFeatures> | null> {
  const { data, error } = await supabaseAdmin
    .from("report_variant_overrides")
    .select("features_json")
    .eq("variant", variant)
    .eq("is_draft", isDraft)
    .maybeSingle();

  if (error || !data) return null;
  return data.features_json as Partial<VariantFeatures>;
}

/**
 * Load all override rows (for the admin matrix).
 */
export async function loadAllOverrides(): Promise<VariantOverrideRow[]> {
  const { data, error } = await supabaseAdmin
    .from("report_variant_overrides")
    .select("*")
    .order("variant")
    .order("is_draft");

  if (error || !data) return [];
  return data as unknown as VariantOverrideRow[];
}

/**
 * Upsert a draft override for a variant.
 */
export async function saveDraft(
  variant: ReportVariant,
  features: Partial<VariantFeatures>,
  adminEmail: string,
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("report_variant_overrides")
    .upsert(
      [
        {
          variant,
          is_draft: true,
          features_json: features as Record<string, unknown>,
          updated_by: adminEmail,
        },
      ],
      { onConflict: "variant,is_draft" },
    );

  if (error) throw new Error(`Failed to save draft: ${error.message}`);
}

/**
 * Publish: copy draft → published row (upsert), then delete draft.
 */
export async function publishDraft(
  variant: ReportVariant,
  adminEmail: string,
): Promise<void> {
  // Read draft
  const draft = await loadOverride(variant, true);
  if (!draft) throw new Error("No draft to publish");

  // Upsert published row
  const { error: pubErr } = await supabaseAdmin
    .from("report_variant_overrides")
    .upsert(
      [
        {
          variant,
          is_draft: false,
          features_json: draft as Record<string, unknown>,
          updated_by: adminEmail,
        },
      ],
      { onConflict: "variant,is_draft" },
    );

  if (pubErr) throw new Error(`Failed to publish: ${pubErr.message}`);

  // Delete draft
  await supabaseAdmin
    .from("report_variant_overrides")
    .delete()
    .eq("variant", variant)
    .eq("is_draft", true);
}

/**
 * Discard draft (delete draft row only).
 */
export async function discardDraft(variant: ReportVariant): Promise<void> {
  await supabaseAdmin
    .from("report_variant_overrides")
    .delete()
    .eq("variant", variant)
    .eq("is_draft", true);
}

/**
 * Reset to defaults: delete both draft and published rows.
 */
export async function resetToDefaults(variant: ReportVariant): Promise<void> {
  await supabaseAdmin
    .from("report_variant_overrides")
    .delete()
    .eq("variant", variant);
}