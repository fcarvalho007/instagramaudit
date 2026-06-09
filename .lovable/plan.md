## Goal
Make the Lovable AI Gateway daily budget enforceable by always writing a non-null `estimated_cost_usd` on `provider_call_logs` rows for `comparison_readings`, so `assertLovableAiDailyBudgetAvailable()` can actually trip its cap.

## Current state (verified)
- `comparison-readings/generate.server.ts` records the gateway call with `estimatedCostUsd: null` (both success and error branches — single `recordProviderCall` at L201-220, plus the early `LOVABLE_API_KEY` missing branch at L80-94).
- Token usage is already captured (`promptTokens`, `completionTokens`, `totalTokens`).
- `lovable-ai-budget.server.ts` sums `actual_cost_usd ?? estimated_cost_usd ?? 0` — with both null it adds 0, so the cap never trips.
- Model is `google/gemini-3-flash-preview` (`COMPARISON_READINGS_MODEL`).

## Changes

### 1. New module `src/lib/security/lovable-ai-cost.ts`
Pure, server-safe (no Supabase deps):

- `getLovableAiPricing(model)` reads env, defaults conservative:
  - `LOVABLE_AI_PRICE_INPUT_USD_PER_1K` (default `0.0001`)
  - `LOVABLE_AI_PRICE_OUTPUT_USD_PER_1K` (default `0.0004`)
  - `LOVABLE_AI_FLAT_FALLBACK_USD` (default `0.001`)
  - Model-specific override knobs (optional, suffix `_GEMINI_3_FLASH_PREVIEW`) read first; fall back to the generic ones. Unknown model → generic rates.
- `estimateLovableAiCallCostUsd({ model, promptTokens, completionTokens })`:
  - When either token count is a finite positive number → `input/1000*inRate + output/1000*outRate`, rounded to 5 decimals (matches DB column scale).
  - When both are null/0/non-finite OR the computed value is below the flat fallback → return the flat fallback.
  - Always returns a positive, non-null `number` ≥ flat fallback. Never returns 0.

### 2. Wire in `src/lib/comparison-readings/generate.server.ts`
- Import `estimateLovableAiCallCostUsd`.
- Replace `estimatedCostUsd: null` (main `recordProviderCall` at L215) with `estimatedCostUsd: estimateLovableAiCallCostUsd({ model, promptTokens, completionTokens })`. This covers success, `timeout`, `http_error`, and `network_error` — failures still consume gateway credits/quota for the attempted request, so charging the flat fallback is correct.
- The `LOVABLE_API_KEY` missing branch (`status: "config_error"`, L80-94) → keep `estimatedCostUsd: 0` (no outbound call happened). Add it explicitly (was implicit before) so the field is never null on this path; budget code already treats 0 correctly.

### 3. Tests
- **New `src/lib/security/__tests__/lovable-ai-cost.test.ts`** (3 cases per spec):
  1. With tokens → returns token-based estimate; deterministic given env rates; > flat fallback for non-trivial usage.
  2. Without tokens (both null) → returns the flat fallback (`0.001`).
  3. Daily cap trips: extend the mock used in `lovable-ai-budget.test.ts` style; insert N rows whose `estimated_cost_usd` equals the computed value (e.g. 50 calls × $0.001 = $0.05; set cap to `0.05`) and assert `assertLovableAiDailyBudgetAvailable()` rejects with `LovableAiBudgetExceededError`. Co-locate or import the existing mock pattern — keep it self-contained.
- Existing `lovable-ai-budget.test.ts` is unaffected (still passes — actual_cost path unchanged).

### 4. Failure-safety invariant
- `runEnrichment` already catches `LovableAiBudgetExceededError` and logs `comparison_readings skipped — daily Lovable AI budget exhausted` (verified at `run-enrichment.server.ts:132-136`). No change needed: an over-budget run is skipped and report rendering continues with the existing fallback empty readings.

## Out of scope
Prompts, UI, checkout, EuPago, credits, report cards, OpenAI/Apify cost paths, model selection, gateway client refactor. No DB migration (column already exists; we're just writing a non-null value).

## Validation
- `provider_call_logs` rows with `provider='lovable_ai'` and `actor LIKE 'comparison_readings:%'` will carry a non-null `estimated_cost_usd` going forward.
- Setting `LOVABLE_AI_DAILY_CAP_USD=0.05` would block further `comparison_readings` calls within ~50 invocations on the flat fallback alone — making the cap effective.
- Skipped run does not throw out of `runEnrichment`; report continues to render without the AI readings card.
