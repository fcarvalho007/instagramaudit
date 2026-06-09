# Harden Lovable AI Gateway gating for `comparison_readings`

## TL;DR
Mirror the OpenAI hardening (kill-switch + allowlist + daily budget cap + provider_call_logs telemetry) for the Lovable AI Gateway path used by `comparison_readings`. No schema changes, no prompts/models/UI/copy changes. Skips are silent and safe — report keeps rendering.

---

## Today's gaps (audit)
- `runComparisonReadings` → `generateComparisonReadingsForSnapshot` calls `https://ai.gateway.lovable.dev/v1/chat/completions` directly with no allowlist, kill-switch, daily cap, or `provider_call_logs` row.
- Paid entitlement gate is already enforced upstream (only `PAID_ENRICHMENT_TYPES` enqueues `comparison_readings` post-payment via `enqueuePaidEnrichmentsForSnapshot`). Free flow uses `buildFreeEnrichmentStatus()` → `skipped_free`. Keep that as-is.

## Design decisions
- **Mirror the OpenAI structure** but invert kill-switch default for the live feature:
  - `LOVABLE_AI_ENABLED`: default ON (`!== "false"`). Documented as opt-out emergency kill; OpenAI's opt-in default would silently disable a production-paid path on first deploy.
  - `LOVABLE_AI_TESTING_MODE`: default OFF (`=== "true"`). When on, restricts to `LOVABLE_AI_ALLOWLIST` (same CSV parser as OpenAI/DFS).
  - `LOVABLE_AI_DAILY_CAP_USD`: default 5 (same as OpenAI). 60s in-memory cache like OpenAI.
- Sum spend from `provider_call_logs WHERE provider = 'lovable_ai' AND created_at >= start_of_utc_day`. New rows are inserted by the comparison-readings call using the existing `recordProviderCall` helper — no schema migration; the writer is already provider-agnostic.
- Cost per call comes from the gateway response `usage` block when present. If absent (gateway doesn't always return token counts), insert with tokens null + estimated_cost_usd null; the row still proves a call happened so future calls can be rate-limited by *call count* if needed (out of scope here).
- Surface skip reasons in `enrichment_jobs.error_message` by extending `EnrichmentResult` with an optional `skipReason?: string`. When `ok && payloadPatch === null && skipReason`, the driver writes `enrichment_jobs.status = "skipped"` + `error_message = skipReason` instead of `success`. Backward-compatible — existing call sites that return `ok: true, payloadPatch: null` without `skipReason` behave exactly as before.

## Tasks

### 1. New file: `src/lib/security/lovable-ai-allowlist.ts`
Same shape as `openai-allowlist.ts`:
- `isLovableAiEnabled()` → `process.env.LOVABLE_AI_ENABLED !== "false"` (default ON, see decision above)
- `isLovableAiTestingModeActive()` → `process.env.LOVABLE_AI_TESTING_MODE === "true"` (default OFF)
- `getLovableAiAllowlist()` → CSV parse of `LOVABLE_AI_ALLOWLIST`
- `isLovableAiAllowed(handle)` → kill-switch first, then optional allowlist

### 2. New file: `src/lib/security/lovable-ai-budget.server.ts`
Clone of `openai-budget.server.ts` with `provider = 'lovable_ai'`:
- `LovableAiBudgetExceededError`
- `getLovableAiDailyCapUsd()` → reads `LOVABLE_AI_DAILY_CAP_USD`, default 5
- `getLovableAiDailySpendUsd()` (60s cache, identical pattern)
- `assertLovableAiDailyBudgetAvailable()`
- `invalidateLovableAiBudgetCache()` (test hook)

### 3. Extend `src/lib/comparison-readings/generate.server.ts`
- Add optional second arg: `options?: { handle?: string | null; analysisEventId?: string | null }`.
- After every fetch resolution (success or error), call `recordProviderCall({ provider: "lovable_ai", actor: "comparison_readings:${model}", handle, model, status, httpStatus, durationMs, promptTokens, completionTokens, totalTokens, estimatedCostUsd: null, errorMessage, analysisEventId, sourceContext: "public_analysis" })`. Use existing helper.
- Read `usage.prompt_tokens` / `usage.completion_tokens` / `usage.total_tokens` from gateway response when present. Don't compute USD cost here (no token-price table yet — admit `null` and rely on call-count visibility).
- Existing config-error path (`LOVABLE_API_KEY missing`) also logs with `status: "config_error"`.

### 4. Update `runComparisonReadings` in `src/lib/enrichment/run-enrichment.server.ts`
Add gates in this order **before** the existing "no usable competitor" check:
1. `isLovableAiAllowed(handle)` false → `return { ok: true, payloadPatch: null, skipReason: "LOVABLE_AI_DISABLED_OR_NOT_ALLOWED" }`.
2. `assertLovableAiDailyBudgetAvailable()` → on `LovableAiBudgetExceededError`, log warn (spent/cap) and return `{ ok: true, payloadPatch: null, skipReason: "LOVABLE_AI_BUDGET_EXCEEDED" }`.
3. Existing competitor-presence check stays.
4. Pass `{ handle: ctx.profile.username, analysisEventId }` to `generateComparisonReadingsForSnapshot`.

### 5. Extend `EnrichmentResult` in `src/lib/enrichment/types.ts`
Add optional `skipReason?: string`. Pure type addition — no runtime change for existing returns.

### 6. Update driver `src/routes/api/public/enrich-snapshot.ts`
Inside the `result.ok` branch, when `result.payloadPatch === null && result.skipReason`:
- `setEnrichmentStatusAtomic(job.snapshot_id, job.enrichment_type, "skipped")`
- Update `enrichment_jobs` row with `status: "skipped"`, `completed_at`, `error_message: result.skipReason`.
- Increment `succeeded` counter (it's not a failure — same accounting as today's silent skips).

### 7. Tests (Vitest, no provider calls)
Add `src/lib/security/__tests__/lovable-ai-budget.test.ts` mirroring `openai-budget.test.ts` (mock supabase admin, assert cap-exceeded throws).
Add a small unit in `src/lib/enrichment/__tests__/run-enrichment-budget.test.ts` (or sibling) that:
- Mocks `isLovableAiAllowed = false` → `runEnrichment("comparison_readings", …)` returns `ok: true, payloadPatch: null, skipReason: "LOVABLE_AI_DISABLED_OR_NOT_ALLOWED"`.
- Mocks budget exceeded → same shape with `LOVABLE_AI_BUDGET_EXCEEDED`.
- Mocks both allowed + budget ok + no competitors → existing "no usable competitor" path still returns `{ ok: true, payloadPatch: null }` with no `skipReason`.

## Out of scope (explicit)
- No prompt / model / UI / report copy changes.
- No `StoredComparisonReadings` schema changes (skips don't write a stored payload).
- No backfill of historical `provider_call_logs`.
- No new pricing table for Lovable AI token cost (call-count visibility only).
- No change to Free/Public flow or entitlement enforcement.

## Validation
1. **Free flow unchanged**: `buildFreeEnrichmentStatus` still pre-marks `comparison_readings = "skipped_free"`; never enqueued. Re-run existing free-path tests.
2. **Paid flow, gateway enabled, budget ok**: `comparison_readings` runs, `provider_call_logs` gains a `lovable_ai` row, status flips to `success`.
3. **Paid flow, `LOVABLE_AI_ENABLED=false`**: enrichment_job ends `status="skipped"`, `error_message="LOVABLE_AI_DISABLED_OR_NOT_ALLOWED"`, snapshot payload unchanged, report renders without AI readings (falls back to deterministic cards).
4. **Paid flow, budget exhausted**: same outcome with `LOVABLE_AI_BUDGET_EXCEEDED`.
5. **Existing OpenAI/Apify/DFS enrichments**: unchanged — `EnrichmentResult.skipReason` is optional and they don't set it.
6. `bunx vitest run src/lib/security src/lib/enrichment` green.
7. Manual grep `rg "ai.gateway.lovable.dev"` → only `generate.server.ts` hits it, and that path now logs every call.

## Risks
- **Budget cache (60s) means rapid bursts can briefly exceed the cap.** Mirrors OpenAI behavior; acceptable for a $5/day cap. Note in code comment.
- Default-ON kill-switch deviates from OpenAI's default-OFF. Documented in the new file's header; operator can flip to "false" instantly without redeploy.
- Token counts may be absent from gateway responses → cost-based cap reduces to call-count visibility. Out-of-scope to compute USD here; future PR can add a token-price table.
