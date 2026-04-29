## Audit result: configuration is already correct

A full read of `src/lib/insights/cost.ts`, `src/lib/insights/openai-insights.server.ts`, plus `rg "nano"` and `rg "gpt-5\.4-nano"` across `src/lib/insights/` confirm the OpenAI Insights layer is already aligned with the requested target state. **No code change is needed in `cost.ts` or `openai-insights.server.ts`.**

### Confirmed in `src/lib/insights/cost.ts`

- `DEFAULT_OPENAI_MODEL = "gpt-5.4-mini"` ✅
- `FALLBACK_MODEL = "gpt-5.4-mini"` ✅
- Pricing for `gpt-5.4-mini`:
  - `inputPerMillion: 0.75` ✅
  - `cachedInputPerMillion: 0.075` ✅
  - `outputPerMillion: 4.5` ✅
- `ModelPrice.cachedInputPerMillion?: number` field exists ✅
- `CostInput.cachedTokens?: number` field exists ✅
- `CostBreakdown.cachedTokens: number` field exists ✅
- Cost formula splits `promptTokens` into `(promptTokens − cachedTokens)` at standard rate + `cachedTokens` at cached rate, with clamping ✅
- `getPricingTable()` and `isKnownModel()` exported for diagnostics ✅
- `PRICING` table contains `gpt-4.1-mini`, `gpt-5-mini`, `gpt-5.4-mini` — **no `gpt-5.4-nano`** ✅

### Confirmed in `src/lib/insights/openai-insights.server.ts`

- `resolveModel()` reads `process.env.OPENAI_INSIGHTS_MODEL` (trimmed), falls back to `DEFAULT_OPENAI_MODEL` ✅
- Reads `usage.prompt_tokens_details.cached_tokens` from the OpenAI response and forwards it to `calculateOpenAiCost({ ..., cachedTokens })` ✅
- No `gpt-5.4-nano` references in code or comments ✅

### Repo-wide sweep
- `rg "gpt-5\.4-nano" src/lib/insights/` → no matches
- `rg "nano" src/lib/insights/` → no matches

## What this plan will do

The only outstanding task from the prompt is the diagnostic script (#6). I will add a single read-only script and run it.

### 1. Add `scripts/insights-diagnostic.ts`
A standalone Bun-runnable script that performs **no network I/O**. It imports from `src/lib/insights/cost.ts` (and optionally re-implements `resolveModel` locally to avoid pulling the server module's Supabase dependency into a CLI context) and prints a JSON report:

```
{
  env_present: boolean,            // OPENAI_INSIGHTS_MODEL set?
  resolved_model: string,          // result of resolveModel()
  default_model: "gpt-5.4-mini",
  fallback_model: "gpt-5.4-mini",
  known_models: string[],          // Object.keys(getPricingTable())
  pricing_for_resolved: ModelPrice,
  sample_cost_1M_in_1M_out: CostBreakdown,
  sample_cost_with_cached: CostBreakdown,  // 1M prompt of which 500k cached, 1M out
  notice: "no provider call performed"
}
```

To stay consistent with the rule "do not call OpenAI", the script will not touch `openai-insights.server.ts` (which transitively imports Supabase). It will inline a 4-line `resolveModel()` that reads `process.env.OPENAI_INSIGHTS_MODEL` exactly the same way as the server module.

### 2. Validation steps
- `bunx tsc --noEmit`
- `bun run scripts/insights-diagnostic.ts`
- `rg "gpt-5\.4-nano" src/lib/insights/` (expect zero matches)

### 3. Final report
Will include all the fields listed in the prompt's "Report" section.

## Files changed

- **created**: `scripts/insights-diagnostic.ts`
- **no other files modified**

## Out of scope (explicitly untouched)
- `src/lib/insights/openai-insights.server.ts` — already correct
- `src/lib/insights/cost.ts` — already correct
- UI, PDF, admin, schema, `/report/example`, locked files
- No OpenAI / Apify / DataForSEO calls performed
