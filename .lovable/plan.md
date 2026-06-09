## Goal
Activate the Pro 90d window by default. Keep `pro_window_90d_enabled` as an emergency kill-switch, add a dedicated 90d daily cost cap as operational protection, and surface a safe user-facing message when the cap trips.

## Current state (verified)
- `app_config.pro_window_90d_enabled = 'false'` (seeded by prior migration).
- Backend kill-switch lives at `analyze-public-v1.ts:619-642`, runs BEFORE entitlement check, BEFORE `reserveCredit`, BEFORE provider call. Default fallback `'false'`.
- Frontend chips: `report-block-nav.tsx:577-579` filters `PREMIUM_WINDOWS_ALL=[30,90]` to `[30]` when flag is false.
- `PUBLIC_APP_CONFIG_DEFAULTS.proWindow90dEnabled = false` in `app-config.functions.ts:36`.
- 90d per-run cap exists: `maxTotalChargeUsd: 0.3` in `window-configs.ts`.
- Global daily cap (`APIFY_DAILY_CAP_USD`) / hard cap (`APIFY_HARD_CAP_USD`) read in `apify-budget.server.ts`, sums `provider_call_logs` by day.

## Changes

### 1. Flip default to ON
- **DB data flip (insert tool):**
  `UPDATE public.app_config SET value='true', updated_at=now(), updated_by='system' WHERE key='pro_window_90d_enabled';`
- **Code default:**
  - `app-config.functions.ts:36` → `proWindow90dEnabled: true`.
  - `analyze-public-v1.ts:628` → `readAppConfigValue("pro_window_90d_enabled", "true")` (so a missing row defaults to ON; only an explicit `'false'` trips the kill-switch).
- **Test update:** `analyze-public-v1-window-flag.test.ts` → expect default `true`.

### 2. Frontend chips
- No render-logic change needed: `premiumWindows` already becomes `[30, 90]` whenever the flag is true. With default flipped, Pro users see both chips. Free users keep the existing locked/upsell behaviour (gated server-side by `WINDOW_REQUIRES_PRO`).

### 3. Backend kill-switch (unchanged behaviour, stricter default)
- Order remains: onboarding → competitors-pro → **90d kill-switch** → wide-window Pro gate → reserveCredit → provider. Explicit `'false'` continues to return `WINDOW_90D_DISABLED` with no ledger, no Apify call.

### 4. Dedicated 90d daily cap (new)
- **New env secret:** `APIFY_90D_DAILY_CAP_USD` (default `5.5` ≈ €5/day; readable via `readNumber`). No code panic if unset — fallback applies.
- **New helper** in `src/lib/security/apify-budget.server.ts`:
  - `getApify90dDailyCapUsd()` — reads env, default 5.5.
  - `getApify90dDailySpendUsd(now)` — sums `provider_call_logs` where `provider='apify' AND analysis_window='90d' AND created_at >= start_of_utc_day`. Reuses 60s cache pattern (separate cache slot).
  - `assertApify90dDailyBudgetAvailable()` — throws `Window90dBudgetExceededError` when spent ≥ cap.
- **Gate placement** in `analyze-public-v1.ts`, inside the existing `windowKind === "90d"` block, AFTER kill-switch check, BEFORE entitlement check / `reserveCredit`:
  ```
  try { await assertApify90dDailyBudgetAvailable(); }
  catch (e) {
    if (e instanceof Window90dBudgetExceededError) {
      await logEvent({ ...handle/competitors/cacheKey,
        dataSource: "none",
        outcome: "blocked_credits",
        errorCode: "WINDOW_90D_BUDGET_EXCEEDED",
        estimatedCostUsd: 0 });
      return failure("WINDOW_90D_BUDGET_EXCEEDED");
    }
    throw e;
  }
  ```
- **Cache hit exception:** A 90d request that hits fresh cache (`cacheFreshHit && alreadyAssociated`) must still cost 0 credits and not be blocked. Place the budget gate **only on the fresh-fetch path**: skip the check when `cacheFreshHit` is true, mirroring how `skipReserve` works. Concretely, only call `assertApify90dDailyBudgetAvailable()` when we will actually reserve credit AND call Apify.

### 5. New error code wiring
- `src/lib/analysis/types.ts` → add `"WINDOW_90D_BUDGET_EXCEEDED"` to `PublicAnalysisErrorCode`.
- `analyze-public-v1.ts`:
  - `ERROR_MESSAGES.WINDOW_90D_BUDGET_EXCEEDED = "A análise de 90 dias está temporariamente indisponível por segurança operacional. Tenta novamente mais tarde ou usa a janela de 30 dias."`
  - `HTTP_STATUS.WINDOW_90D_BUDGET_EXCEEDED = 503`.
- Frontend mapping in `report-block-nav.tsx` (alongside the existing `WINDOW_REQUIRES_PRO` branch): if `result.error_code === "WINDOW_90D_BUDGET_EXCEEDED"` → show the same PT-PT copy via a new i18n key `nav.explore.consume_dialog.period_error_window_90d_budget` (PT + EN files). No mention of Apify / provider / budget internals.

### 6. Admin observability (audit only, no code change required)
- `provider_call_logs.analysis_window` already populated for 90d via `record_analysis_event(..., p_analysis_window)`.
- `analysis_events.outcome='blocked_credits'` + `error_code='WINDOW_90D_BUDGET_EXCEEDED'` will surface in the existing admin cockpit blocked counters; confirm filter chip exists for the new code (only adjust label if missing — no new query/schema work).

### 7. Tests
- Extend `analyze-public-v1-window-flag.test.ts`:
  - `PUBLIC_APP_CONFIG_DEFAULTS.proWindow90dEnabled === true`.
  - `PublicAnalysisErrorCode` includes `"WINDOW_90D_BUDGET_EXCEEDED"`.
  - `ERROR_MESSAGES.WINDOW_90D_BUDGET_EXCEEDED` PT-PT, `HTTP_STATUS = 503`.
- Behaviour invariants as comments (deep integration covered by existing harness):
  - Flag false → `WINDOW_90D_DISABLED`, no ledger, no provider call.
  - Flag true + budget exhausted → `WINDOW_90D_BUDGET_EXCEEDED`, no ledger, no provider call.
  - Flag true + budget OK + cache fresh → 0 credits, no provider, no gate.
  - Flag true + budget OK + fresh fetch → reserves credit, calls provider.
  - 30d path untouched.

## Out of scope
Checkout, EuPago, pricing, payment emails, competitor UI, Free report, paid 30d behaviour, AI enrichment, report visual cards. Per-run `maxTotalChargeUsd` in `window-configs.ts` stays as-is.

## Recommended secret to add (operator action)
- `APIFY_90D_DAILY_CAP_USD=5.5` (≈ €5/day at current FX). Optional — code default 5.5 if absent.
