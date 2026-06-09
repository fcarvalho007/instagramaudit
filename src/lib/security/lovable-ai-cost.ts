/**
 * Lovable AI Gateway call-cost estimator (server-safe, no DB deps).
 *
 * Used to populate `provider_call_logs.estimated_cost_usd` for
 * `provider='lovable_ai'` rows so `assertLovableAiDailyBudgetAvailable()`
 * has a non-zero signal to sum against `LOVABLE_AI_DAILY_CAP_USD`.
 *
 * Pricing knobs (per 1K tokens, USD). Conservative defaults; override
 * via env when official Lovable AI pricing is available:
 *   LOVABLE_AI_PRICE_INPUT_USD_PER_1K   (default 0.0001)
 *   LOVABLE_AI_PRICE_OUTPUT_USD_PER_1K  (default 0.0004)
 *   LOVABLE_AI_FLAT_FALLBACK_USD        (default 0.001)  per-call fallback
 *
 * Optional model-specific overrides (suffix derived from the model id,
 * uppercased with non-alphanumerics → "_"):
 *   LOVABLE_AI_PRICE_INPUT_USD_PER_1K_GOOGLE_GEMINI_3_FLASH_PREVIEW
 *   LOVABLE_AI_PRICE_OUTPUT_USD_PER_1K_GOOGLE_GEMINI_3_FLASH_PREVIEW
 */

function readPositiveFloat(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function modelSuffix(model: string): string {
  return model.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "");
}

export interface LovableAiPricing {
  inputUsdPer1k: number;
  outputUsdPer1k: number;
  flatFallbackUsd: number;
}

export function getLovableAiPricing(model: string): LovableAiPricing {
  const suffix = modelSuffix(model);
  const genericIn = readPositiveFloat("LOVABLE_AI_PRICE_INPUT_USD_PER_1K", 0.0001);
  const genericOut = readPositiveFloat("LOVABLE_AI_PRICE_OUTPUT_USD_PER_1K", 0.0004);
  const flat = readPositiveFloat("LOVABLE_AI_FLAT_FALLBACK_USD", 0.001);
  return {
    inputUsdPer1k: readPositiveFloat(
      `LOVABLE_AI_PRICE_INPUT_USD_PER_1K_${suffix}`,
      genericIn,
    ),
    outputUsdPer1k: readPositiveFloat(
      `LOVABLE_AI_PRICE_OUTPUT_USD_PER_1K_${suffix}`,
      genericOut,
    ),
    flatFallbackUsd: flat,
  };
}

export interface EstimateInput {
  model: string;
  promptTokens?: number | null;
  completionTokens?: number | null;
}

function finitePositive(n: number | null | undefined): number {
  if (typeof n !== "number" || !Number.isFinite(n) || n <= 0) return 0;
  return n;
}

function round5(n: number): number {
  return Math.round(n * 1e5) / 1e5;
}

/**
 * Returns a positive USD estimate for a Lovable AI Gateway call.
 * Never returns 0 or null — failing or token-less calls still consume
 * gateway quota, so they're charged the flat fallback.
 */
export function estimateLovableAiCallCostUsd(input: EstimateInput): number {
  const { model } = input;
  const pricing = getLovableAiPricing(model);
  const inTok = finitePositive(input.promptTokens);
  const outTok = finitePositive(input.completionTokens);

  if (inTok === 0 && outTok === 0) {
    return round5(pricing.flatFallbackUsd);
  }

  const computed = (inTok / 1000) * pricing.inputUsdPer1k
    + (outTok / 1000) * pricing.outputUsdPer1k;

  if (!Number.isFinite(computed) || computed < pricing.flatFallbackUsd) {
    return round5(pricing.flatFallbackUsd);
  }
  return round5(computed);
}