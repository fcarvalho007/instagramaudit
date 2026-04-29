/**
 * OpenAI token cost calculator.
 *
 * Pure module. Prices are stored in USD per 1M tokens, sourced from the
 * OpenAI pricing page and updated manually when models change. When a
 * model is unknown we fall back to the conservative `FALLBACK_MODEL` rate
 * so the admin ledger never under-estimates.
 *
 * No I/O. No network. Safe to call from any runtime.
 */

/** Default model used when caller does not pass an explicit override. */
export const DEFAULT_OPENAI_MODEL = "gpt-5.4-mini";

/** Conservative fallback used when an unknown model id is encountered. */
export const FALLBACK_MODEL = "gpt-5.4-mini";

interface ModelPrice {
  /** USD per 1,000,000 input tokens. */
  inputPerMillion: number;
  /**
   * USD per 1,000,000 cached input tokens (prompt tokens that hit OpenAI's
   * automatic prompt cache). Optional — when absent, cached tokens are
   * billed at the standard `inputPerMillion` rate.
   */
  cachedInputPerMillion?: number;
  /** USD per 1,000,000 output tokens. */
  outputPerMillion: number;
}

/**
 * Pricing table. Numbers reflect public OpenAI list prices at the time of
 * this prompt; they may drift. Keep this table the single source of truth
 * — never hardcode prices at call sites.
 */
const PRICING: Record<string, ModelPrice> = {
  "gpt-4.1-mini": { inputPerMillion: 0.4, outputPerMillion: 1.6 },
  "gpt-5-mini": { inputPerMillion: 0.25, outputPerMillion: 2.0 },
  "gpt-5.4-mini": {
    inputPerMillion: 0.75,
    cachedInputPerMillion: 0.075,
    outputPerMillion: 4.5,
  },
};

/**
 * Read-only view of the pricing table for diagnostic tooling.
 * Returns the internal table directly — callers must not mutate it.
 */
export function getPricingTable(): Readonly<Record<string, Readonly<ModelPrice>>> {
  return PRICING;
}

/** Resolve a model id to a price entry, falling back when unknown. */
function priceFor(model: string): ModelPrice {
  return PRICING[model] ?? PRICING[FALLBACK_MODEL]!;
}

/** True when the given model id has explicit pricing in the table. */
export function isKnownModel(model: string): boolean {
  return Object.prototype.hasOwnProperty.call(PRICING, model);
}

export interface CostInput {
  model?: string;
  promptTokens: number;
  completionTokens: number;
  /**
   * Subset of `promptTokens` that hit OpenAI's automatic prompt cache.
   * When provided, these tokens are billed at the model's cached rate
   * (if defined) instead of the standard input rate. Clamped to ≤ promptTokens.
   */
  cachedTokens?: number;
}

export interface CostBreakdown {
  model: string;
  promptTokens: number;
  completionTokens: number;
  cachedTokens: number;
  totalTokens: number;
  /** USD, rounded to 6 decimals. Never negative. */
  estimatedCostUsd: number;
}

/**
 * Compute USD cost for a completed OpenAI call.
 *
 * Negative or non-finite token counts are clamped to zero. The returned
 * `estimatedCostUsd` is rounded to 6 decimals — small enough to capture
 * sub-cent calls, large enough to avoid float noise in the admin UI.
 */
export function calculateOpenAiCost(input: CostInput): CostBreakdown {
  const model = input.model && input.model.length > 0 ? input.model : DEFAULT_OPENAI_MODEL;
  const promptTokens = sanitizeTokenCount(input.promptTokens);
  const completionTokens = sanitizeTokenCount(input.completionTokens);
  const cachedTokensRaw = sanitizeTokenCount(input.cachedTokens ?? 0);
  // Cached tokens are a subset of prompt tokens — clamp to that ceiling.
  const cachedTokens = Math.min(cachedTokensRaw, promptTokens);
  const uncachedPromptTokens = promptTokens - cachedTokens;
  const price = priceFor(model);
  const cachedRate = price.cachedInputPerMillion ?? price.inputPerMillion;

  const cost =
    (uncachedPromptTokens / 1_000_000) * price.inputPerMillion +
    (cachedTokens / 1_000_000) * cachedRate +
    (completionTokens / 1_000_000) * price.outputPerMillion;

  return {
    model,
    promptTokens,
    completionTokens,
    cachedTokens,
    totalTokens: promptTokens + completionTokens,
    estimatedCostUsd: Math.max(0, Math.round(cost * 1_000_000) / 1_000_000),
  };
}

function sanitizeTokenCount(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}
