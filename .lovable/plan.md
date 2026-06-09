## Goal
Gate competitor analysis behind the `report_full_9` entitlement in `/api/analyze-public-v1`, mirroring the existing `WINDOW_REQUIRES_PRO` pattern.

## Changes

### 1. `src/lib/analysis/types.ts`
Add `"COMPETITORS_REQUIRE_PRO"` to the `PublicAnalysisErrorCode` union (next to `WINDOW_REQUIRES_PRO`).

### 2. `src/routes/api/analyze-public-v1.ts`
- Add to `ERROR_MESSAGES`:
  `COMPETITORS_REQUIRE_PRO: "A análise de concorrentes está disponível no plano Pro."`
- Add to `HTTP_STATUS`: `COMPETITORS_REQUIRE_PRO: 403`.
- Insert a new gate inside the `if (!isInternalBypass)` block, **after** `leadId` resolution and **before** the wide-window gate / `reserveCredit` / cache work that triggers providers. Trigger condition: `competitors.length > 0` and `!(await hasEntitlement(leadId, "report_full_9"))`. On block:
  - `logEvent({ handle: primary, competitorHandles: competitors, cacheKey, dataSource: "none", outcome: "blocked_credits", errorCode: "COMPETITORS_REQUIRE_PRO", estimatedCostUsd: 0 })`
  - `return failure("COMPETITORS_REQUIRE_PRO")`
- Order in the gate chain: onboarding → competitors-pro → wide-window (90d kill-switch → wide-window-pro) → reserveCredit.
- If the lead is already Pro (entitlement true) the existing flow runs unchanged. The wide-window block re-uses `hasEntitlement`; both checks remain (cheap; cache hit at the lookup layer is fine, no refactor required).
- Internal bypass (`isInternalBypass` via `INTERNAL_API_TOKEN`) is untouched — admin/refresh tooling keeps working. No new bypass is introduced.

### 3. Tests — `src/routes/api/__tests__/analyze-public-v1-competitors-gate.test.ts` (new)
Unit-level assertions consistent with `analyze-public-v1-window-flag.test.ts`:
- `COMPETITORS_REQUIRE_PRO` is in `PublicAnalysisErrorCode`.
- `ERROR_MESSAGES["COMPETITORS_REQUIRE_PRO"]` present and PT-PT.
- `HTTP_STATUS["COMPETITORS_REQUIRE_PRO"] === 403`.

Behaviour invariants documented as test comments (deep integration covered by existing harness):
- Free + competitors → returns `COMPETITORS_REQUIRE_PRO`, no `reserveCredit`, no provider call, no snapshot, no ledger row (gate sits before reserve/cache/Apify).
- Pro + competitors → gate passes, existing path unchanged.
- Free without competitors → no gate fires, current behaviour preserved.
- Pro 30d/90d without competitors → unchanged.

## Out of scope
Checkout, EuPago, pricing, email templates, comparison UI, storage persistence, Free individual report, frontend (frontend already hides competitor inputs for Free; this is the server-side enforcement of the same rule).
