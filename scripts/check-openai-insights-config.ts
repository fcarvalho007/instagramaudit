/**
 * Diagnostic: prints how the OpenAI Insights layer resolves its model and
 * pricing. **Does not** call OpenAI, Apify, DataForSEO, or any provider.
 *
 * Usage:
 *   bun run scripts/check-openai-insights-config.ts
 *
 * With a value injected for the env var:
 *   OPENAI_INSIGHTS_MODEL=gpt-5.4-mini bun run scripts/check-openai-insights-config.ts
 *
 * Note: in the deployed Worker the env var is provided by Lovable Cloud
 * secrets; this local script reflects only what is in the current shell.
 */

import {
  DEFAULT_OPENAI_MODEL,
  FALLBACK_MODEL,
  calculateOpenAiCost,
  getPricingTable,
  isKnownModel,
} from "../src/lib/insights/cost";

const fromEnv = process.env.OPENAI_INSIGHTS_MODEL;
const trimmed = fromEnv?.trim();
const resolved = trimmed && trimmed.length > 0 ? trimmed : DEFAULT_OPENAI_MODEL;

const pricing = getPricingTable();
const sample = calculateOpenAiCost({
  model: resolved,
  promptTokens: 1_000_000,
  completionTokens: 1_000_000,
  cachedTokens: 0,
});
const sampleWithCache = calculateOpenAiCost({
  model: resolved,
  promptTokens: 1_000_000,
  completionTokens: 1_000_000,
  cachedTokens: 1_000_000,
});

const report = {
  env_var_present: typeof fromEnv === "string" && fromEnv.length > 0,
  env_var_raw_length: fromEnv?.length ?? 0,
  resolved_model: resolved,
  default_model: DEFAULT_OPENAI_MODEL,
  fallback_model: FALLBACK_MODEL,
  resolved_is_known: isKnownModel(resolved),
  known_models: Object.keys(pricing),
  pricing_for_resolved: pricing[resolved] ?? null,
  sample_cost_usd: {
    one_million_in_one_million_out_no_cache: sample.estimatedCostUsd,
    one_million_in_one_million_out_all_cached: sampleWithCache.estimatedCostUsd,
  },
};

console.log(JSON.stringify(report, null, 2));
console.log("[diagnostic] no provider call performed.");