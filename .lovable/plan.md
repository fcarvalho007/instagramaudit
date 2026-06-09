## Status: Already implemented and verified (9/9 tests green)

The previous turn implemented this exact requirement. Summary of what's in place:

### Files
- **`src/lib/security/lovable-ai-cost.ts`** (new) — `estimateLovableAiCallCostUsd({ model, promptTokens, completionTokens })`
  - Token-based: `LOVABLE_AI_PRICE_INPUT_USD_PER_1K` (default `0.0001`), `LOVABLE_AI_PRICE_OUTPUT_USD_PER_1K` (default `0.0004`), with optional model-suffixed overrides (e.g. `..._GOOGLE_GEMINI_3_FLASH_PREVIEW`).
  - Flat fallback `LOVABLE_AI_FLAT_FALLBACK_USD` (default `$0.001`) when tokens missing OR computed value < fallback.
  - Always returns a positive number ≥ flat fallback. Never null, never 0 for an actual gateway attempt.

- **`src/lib/comparison-readings/generate.server.ts`** (edited) — the single `recordProviderCall` for `provider='lovable_ai'` now passes `estimatedCostUsd: estimateLovableAiCallCostUsd(...)` (covers success, `timeout`, `http_error`, `network_error`). The `LOVABLE_API_KEY` missing branch explicitly writes `0` (no outbound call happened).

- **`src/lib/security/__tests__/lovable-ai-cost.test.ts`** (new) — 3 tests, all passing:
  1. Call with tokens → token-based estimate (large usage 50k/10k → $0.009; small usage falls back to $0.001 as designed).
  2. Call without tokens (null/0/undefined) → flat fallback `$0.001`.
  3. Daily cap trips: 50 rows × $0.001 with cap `$0.05` → `assertLovableAiDailyBudgetAvailable()` rejects with `LovableAiBudgetExceededError`.

### Untouched
- `lovable-ai-budget.server.ts` (sum logic already prefers `actual_cost_usd ?? estimated_cost_usd ?? 0`).
- `runEnrichment` already catches `LovableAiBudgetExceededError` and skips `comparison_readings` without breaking report rendering.
- Prompts, UI, checkout, EuPago, credits, report cards — all untouched.

### Validation
- New `provider_call_logs` rows with `provider='lovable_ai'` AND `actor LIKE 'comparison_readings:%'` now carry non-null `estimated_cost_usd`.
- Setting `LOVABLE_AI_DAILY_CAP_USD=0.05` blocks further calls after ~50 invocations at the flat fallback.
- Over-budget run is skipped (existing catch); report renders without the AI readings card.

No further action required unless you want to (a) seed `LOVABLE_AI_DAILY_CAP_USD` as a secret, or (b) backfill nulls on historical rows.
