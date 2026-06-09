## Goal

Hide and reject the 90-day Pro window behind a new `app_config` flag `pro_window_90d_enabled` (default **false**). 30d remains fully functional. No change to checkout, EuPago, pricing, credits, comparison UI or Free/Public.

## Why this shape

The codebase already has a clean public-flag pattern:

- `app_config` rows are simple key/value pairs (e.g. `feature_compare_competitors_enabled = "false"`).
- `getPublicAppConfig` (`src/lib/config/app-config.functions.ts`) is a `createServerFn` that exposes a curated, safe-for-browser subset via `usePublicAppConfig()` (cached with React Query).
- `analyze-public-v1.ts` already enforces a Pro gate for wide windows (`WINDOW_REQUIRES_PRO`) **before** `reserveCredit`. We bolt the 90d kill-switch into the same pre-reservation block.

## Changes

### 1. Migration · seed flag

```sql
INSERT INTO public.app_config (key, value, updated_by)
VALUES ('pro_window_90d_enabled', 'false', 'system')
ON CONFLICT (key) DO NOTHING;
```

### 2. Public config exposure · `src/lib/config/app-config.functions.ts`

- Add `proWindow90dEnabled: boolean` to `PublicAppConfig` interface and `PUBLIC_APP_CONFIG_DEFAULTS` (default `false`).
- Read key `pro_window_90d_enabled` in `readAppConfig([...])`.
- Parse with existing `parseConfigBool`.

### 3. Error code · `src/lib/analysis/types.ts`

Add `"WINDOW_90D_DISABLED"` to `PublicAnalysisErrorCode` union.

### 4. Backend reject · `src/routes/api/analyze-public-v1.ts`

In `ERROR_MESSAGES` add:
- `WINDOW_90D_DISABLED: "A análise de 90 dias está temporariamente indisponível. Tenta 30 dias."`

In `HTTP_STATUS` add: `WINDOW_90D_DISABLED: 403`.

Inside the wide-window block (currently lines ~586-604, immediately before the existing `WINDOW_REQUIRES_PRO` Pro entitlement check and **before** `reserveCredit`), add:

```ts
if (windowKind === "90d") {
  const { readAppConfigValue } = await import("@/lib/config/app-config.server");
  const flagRaw = await readAppConfigValue("pro_window_90d_enabled", "false");
  if (flagRaw !== "true") {
    await logEvent({
      handle: primary,
      competitorHandles: competitors,
      cacheKey,
      dataSource: "none",
      outcome: "blocked_credits",
      errorCode: "WINDOW_90D_DISABLED",
      estimatedCostUsd: 0,
    });
    return failure("WINDOW_90D_DISABLED");
  }
}
```

This runs strictly **before** entitlement check and **before** `reserveCredit`, so no `credit_ledger` row is ever written for a blocked 90d call.

### 5. Frontend hide · `src/components/report-redesign/v2/report-block-nav.tsx`

`PREMIUM_WINDOWS = [30, 90] as const` (line 489) becomes runtime-filtered:

```tsx
import { usePublicAppConfig } from "@/lib/config/use-app-config";
// inside component:
const { proWindow90dEnabled } = usePublicAppConfig();
const premiumWindows = useMemo(
  () => (proWindow90dEnabled ? [30, 90] : [30]) as readonly number[],
  [proWindow90dEnabled],
);
```

Replace both `PREMIUM_WINDOWS.map(...)` (line 969) and the compact-layout dialog default (`days: 30`, already 30 — unchanged) with `premiumWindows.map(...)`. The full module-level `PREMIUM_WINDOWS` constant is removed.

No other UI surfaces a 90d chip (verified: `analysis-period-selector.tsx` is a separate Lab-only selector with 30/60/90/365 and is not used in the public report nav).

### 6. Admin toggle (opt-in, requirement #5)

The writable admin pattern exists (`setExecutionMode` in `execution-mode.functions.ts`), but the sibling **read-only** flag `feature_compare_competitors_enabled` has no UI toggle either — it's flipped via SQL. To stay minimal and consistent with the closest precedent (a public feature-flag), **no admin UI is added**. The flag is flipped via a one-line SQL update in Supabase:

```sql
UPDATE public.app_config
SET value = 'true', updated_at = now(), updated_by = 'admin'
WHERE key = 'pro_window_90d_enabled';
```

If you'd rather have a button in `/admin/sistema`, say the word and I'll add `getProWindow90d`/`setProWindow90d` server fns and a `SystemSwitchRow` next to the existing Execution Mode toggle — same pattern, ~40 LOC.

## Out of scope

- Checkout, EuPago webhook, pricing copy, credits, comparison UI, Free/Public flow — untouched.
- The Pro entitlement gate (`WINDOW_REQUIRES_PRO`) and credit reservation logic — untouched.
- Admin Lab (`apify-lab`) which uses its own window enum.
- Tests beyond a small backend assertion (see below).

## Validation

| Scenario | Expected |
|---|---|
| Flag OFF, user has Pro + credits, clicks period in sidebar | Only "30d" chip rendered; "90d" absent. |
| Flag OFF, direct POST to `/api/analyze-public-v1` with `window:"90d"` | 403, `error_code: "WINDOW_90D_DISABLED"`, message pt-PT, **no row in `credit_ledger`**, `analysis_events` row with `outcome=blocked_credits`. |
| Flag OFF, POST with `window:"30d"` | Unchanged behaviour (Pro gate → reservation → fresh/cache). |
| Flag ON | "90d" chip reappears; 90d POST flows through existing `WINDOW_REQUIRES_PRO` + reservation + execution. |
| Free/Public default `window:"baseline"` | Untouched (gate only fires on `isWideWindow`). |

Add one focused vitest spec in `src/routes/api/__tests__/analyze-public-v1-window-flag.test.ts` that asserts the error code is in `PublicAnalysisErrorCode`, mirroring `analyze-public-v1-credits.test.ts`. A full integration test of the gate is deferred to keep this PR tight.

## File-change summary

- `supabase/migrations/<ts>_pro_window_90d_flag.sql` — new (seed).
- `src/lib/config/app-config.functions.ts` — add flag to interface, defaults, read list, return mapping.
- `src/lib/analysis/types.ts` — add `WINDOW_90D_DISABLED` to union.
- `src/routes/api/analyze-public-v1.ts` — add ERROR_MESSAGES entry, HTTP_STATUS entry, pre-reservation gate.
- `src/components/report-redesign/v2/report-block-nav.tsx` — runtime `premiumWindows` from config.
- `src/routes/api/__tests__/analyze-public-v1-window-flag.test.ts` — new spec.
