## Verdict: PASS — launch-safe

### PASS/FAIL table

| # | Check | Status | Evidence |
|---|---|---|---|
| 1 | `provider_call_logs` rows for `provider='lovable_ai'` have non-null `estimated_cost_usd` / `actual_cost_usd` | PASS (code) / N/A (data) | `comparison-readings/generate.server.ts:215` passes `estimateLovableAiCallCostUsd({model,promptTokens,completionTokens})` which is guaranteed non-null & ≥ flat fallback. DB currently has 0 lovable_ai rows (no runs yet since the hardening), so nothing to backfill. |
| 2 | `assertLovableAiDailyBudgetAvailable()` sums correctly | PASS | `lovable-ai-budget.server.ts:70-74` reduces `actual_cost_usd ?? estimated_cost_usd ?? 0`. With (1) writing non-null estimates, the `?? 0` branch is only hit when both columns are NULL — which can no longer happen for new rows. |
| 3 | Token usage missing → flat fallback written | PASS | `lovable-ai-cost.ts` — when both `promptTokens` & `completionTokens` are null/0/non-finite OR the token-derived value < `LOVABLE_AI_FLAT_FALLBACK_USD` (default `$0.001`), returns the fallback. Unit test "call without tokens → flat fallback" (lovable-ai-cost.test.ts) covers null, 0, and undefined. |
| 4 | Test proves daily cap is exceeded and blocks future calls | PASS | `lovable-ai-cost.test.ts` "daily cap is exceeded once estimated spend reaches it" — 50 rows × $0.001 with `LOVABLE_AI_DAILY_CAP_USD=0.05` → `assertLovableAiDailyBudgetAvailable()` rejects with `LovableAiBudgetExceededError`. All 9 tests passed last run. |
| 5 | Over-budget `comparison_readings` ends as skipped, report unaffected | PASS | `run-enrichment.server.ts:131-146` catches `LovableAiBudgetExceededError`, logs `comparison_readings skipped — daily Lovable AI budget exhausted`, returns `{ok:true, payloadPatch:null, skipReason:"LOVABLE_AI_BUDGET_EXCEEDED"}`. No payload patch → report renders with the existing empty/cached readings branch, no throw propagates. |

### Launch safety
**Launch-safe.** The "summing null as zero" gap is closed for all new `lovable_ai` rows. Kill-switch + allowlist + budget cap form a complete defence-in-depth chain:
1. `isLovableAiAllowed()` blocks before any cost
2. `assertLovableAiDailyBudgetAvailable()` blocks at the cap
3. On the cap path, `runEnrichment` swallows the error so reports never break.

### Exact fix if still summing null as zero
Not needed — already correct. For reference, the only way (1) could regress is if a new caller writes `provider='lovable_ai'` without going through `estimateLovableAiCallCostUsd`. Mitigation if that ever appears:

```sql
-- Optional hardening (NOT required today): enforce non-null at DB level for lovable_ai
ALTER TABLE public.provider_call_logs
  ADD CONSTRAINT lovable_ai_cost_not_null
  CHECK (
    provider <> 'lovable_ai'
    OR estimated_cost_usd IS NOT NULL
    OR actual_cost_usd IS NOT NULL
  ) NOT VALID;  -- NOT VALID so historical nulls (none today) don't block
```

### Recommended operational settings before public launch
- Set `LOVABLE_AI_DAILY_CAP_USD` explicitly (currently unset → defaults to $5/day). Pick a value aligned with expected comparison_readings volume (e.g. `2` for beta).
- Optional: set `LOVABLE_AI_PRICE_INPUT_USD_PER_1K` / `_OUTPUT_USD_PER_1K` once official Lovable AI pricing is published; defaults are conservative placeholders.

No code change required.
