/**
 * OpenAI Insights configuration diagnostic.
 *
 * Read-only — does NOT call OpenAI, Apify, DataForSEO or any other
 * provider. Imports only the pure `cost.ts` module so the script can run
 * outside the Worker runtime (no Supabase / no fetch).
 *
 * Run with: bun run scripts/insights-diagnostic.ts
 */

import {
  DEFAULT_OPENAI_MODEL,
  FALLBACK_MODEL,
  calculateOpenAiCost,
  getPricingTable,
  isKnownModel,
} from "../src/lib/insights/cost";

/**
 * Mirrors `resolveModel()` from `openai-insights.server.ts` exactly,
 * inlined here so the diagnostic does not pull in the server module
 * (which transitively imports Supabase). Single source of truth for the
 * resolution rule remains the server module — keep these in sync.
 */
function resolveModel(): string {
  const fromEnv = process.env.OPENAI_INSIGHTS_MODEL;
  if (fromEnv && fromEnv.trim().length > 0) return fromEnv.trim();
  return DEFAULT_OPENAI_MODEL;
}

const envPresent = Boolean(
  process.env.OPENAI_INSIGHTS_MODEL &&
    process.env.OPENAI_INSIGHTS_MODEL.trim().length > 0,
);

const resolved = resolveModel();
const pricingTable = getPricingTable();
const knownModels = Object.keys(pricingTable);
const pricingForResolved = pricingTable[resolved] ?? pricingTable[FALLBACK_MODEL];

const sampleStandard = calculateOpenAiCost({
  model: resolved,
  promptTokens: 1_000_000,
  completionTokens: 1_000_000,
});

const sampleCached = calculateOpenAiCost({
  model: resolved,
  promptTokens: 1_000_000,
  completionTokens: 1_000_000,
  cachedTokens: 500_000,
});

const report = {
  env_present: envPresent,
  resolved_model: resolved,
  resolved_is_known: isKnownModel(resolved),
  default_model: DEFAULT_OPENAI_MODEL,
  fallback_model: FALLBACK_MODEL,
  known_models: knownModels,
  pricing_for_resolved: pricingForResolved,
  sample_cost_1M_in_1M_out: sampleStandard,
  sample_cost_with_cached_500k_in_1M_out: sampleCached,
  notice: "no provider call performed",
};

console.log(JSON.stringify(report, null, 2));