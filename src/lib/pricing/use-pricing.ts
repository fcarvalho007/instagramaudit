import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import {
  formatPrice,
  PRICING_FALLBACK,
  type PricingPlan,
  type PricingPlanKey,
  type PricingPlansMap,
} from "./pricing-types";

const ALLOWED_KEYS: PricingPlanKey[] = ["single_report", "pack_5_reports"];

async function fetchPricingPlans(): Promise<PricingPlansMap> {
  const { data, error } = await supabase
    .from("pricing_plans")
    .select("key, label, price_cents, currency, unit_label, sort_order, active")
    .eq("active", true);

  if (error || !data) return PRICING_FALLBACK;

  const out: Partial<PricingPlansMap> = {};
  for (const row of data) {
    if (!ALLOWED_KEYS.includes(row.key as PricingPlanKey)) continue;
    const key = row.key as PricingPlanKey;
    const currency = row.currency || "EUR";
    const plan: PricingPlan = {
      key,
      label: row.label,
      priceCents: row.price_cents,
      currency,
      unitLabel: row.unit_label,
      sortOrder: row.sort_order ?? 0,
      priceFormatted: formatPrice(row.price_cents, currency),
    };
    out[key] = plan;
  }

  return {
    single_report: out.single_report ?? PRICING_FALLBACK.single_report,
    pack_5_reports: out.pack_5_reports ?? PRICING_FALLBACK.pack_5_reports,
  };
}

/**
 * Hook único para ler os planos públicos da DB.
 * - 5 min stale time (preços mudam raramente).
 * - Fallback in-memory garante que a UI nunca renderiza vazio.
 */
export function usePricing() {
  const query = useQuery({
    queryKey: ["public-pricing"],
    queryFn: fetchPricingPlans,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    placeholderData: PRICING_FALLBACK,
  });
  return {
    plans: query.data ?? PRICING_FALLBACK,
    isLoading: query.isLoading,
    error: query.error,
  };
}