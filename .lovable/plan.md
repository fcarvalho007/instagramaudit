## Goal

Make the paid sidebar "Adicionar concorrente" action actually consume a beta credit and trigger a new analysis using the existing endpoint. Keep the period (30d/90d) chips opening the modal but in a clear "em preparação" state with **no credit consumption** (backend support deferred — confirmed by user).

## Why scoped this way

`/api/analyze-public-v1` already:
- Accepts `instagram_username` + `competitor_usernames` (max 2)
- Reserves a credit server-side via `reserveCredit({ leadId, cacheKey })`
- Has a partial unique index on `(lead_id, cache_key)` → built-in idempotency (server returns `duplicate` on concurrent retries, single credit)
- Confirms on success, releases on failure
- Persists snapshot and refreshes lead session

So competitor add is mostly a frontend wiring job. It does NOT accept a period/window param today; adding one is out of scope here.

## Changes

### 1. `src/components/report-redesign/v2/consume-credit-dialog.tsx`
- Add `submitting` prop. Confirm button shows spinner + disabled while submitting. Cancel disabled too. Backdrop click disabled while submitting.
- For competitor intent, add a small input (`@handle`) — required, lowercased, regex `^[a-z0-9._]{1,30}$`, trimmed, `@` stripped. Inline validation message (pt-PT). Confirm disabled when invalid or equal to primary/existing competitor.
- New optional field on `ConsumeCreditIntent` for competitor: `{ kind: "competitor"; handle?: string }` (handle filled from the input on submit).
- For period intent, replace the confirm CTA with a calm "Em preparação" state explaining período personalizado virá em breve; **no credit consumed**, no submit. Keep balance line for context.

### 2. `src/components/report-redesign/v2/report-block-nav.tsx`
- Pass current `primaryHandle` and existing `competitorHandles` (already available via report payload) into the nav so we can build the new competitor list.
- `onConfirmConsume` becomes async:
  - `period` branch → only fire tracking events (`beta_credit_intent_period`, no `_used`), close modal. No fetch, no credit. UX message: "Janela personalizada em preparação."
  - `competitor` branch:
    1. Set `submitting=true`.
    2. Track `beta_credit_intent_competitor`.
    3. Call `fetchPublicAnalysis(primaryHandle, [...existingCompetitors, newHandle].slice(0, 2))`.
    4. On `{ success: true }`: track `beta_credit_used` + `beta_credit_used_competitor` with metadata `{ action_type, competitor_handle, snapshot_id, lead_id, credit_amount: 1 }`. Refresh balance (re-call `getMyCreditBalance`). Close dialog. Show toast "Concorrente adicionado — análise pronta." Call existing `router.invalidate()` so the report reloads with the new snapshot.
    5. On `{ success: false }`: track `beta_credit_use_failed` with `error_code`. Keep dialog open, show inline error. The server already released the credit; refresh balance anyway.
  - `finally` → `submitting=false`.
- Double-submit guard: button disabled while `submitting=true` (UI) + existing in-flight Map in `fetchPublicAnalysis` (network) + server unique index on `(lead_id, cache_key)` (db). Three layers.
- Empty-balance branch unchanged (already opens feedback CTA).

### 3. `src/lib/credits/credits.functions.ts`
- No changes — `getMyCreditBalance` is already wired and re-callable.

### 4. `src/lib/products/product-events.functions.ts` (or wherever `trackEvent` lives)
- No schema changes. Just emit the new event types listed above using existing `product_events` insert.

### 5. i18n `src/locales/pt/report.json`
- Add keys: `consume_dialog.competitor_handle_label`, `competitor_handle_placeholder`, `competitor_handle_invalid`, `competitor_handle_duplicate`, `submitting`, `success_toast`, `error_toast`, `period_coming_soon_title`, `period_coming_soon_body`.

## Credit lifecycle (recap)

| Step | Actor | Action |
|------|-------|--------|
| 1 | User | Confirm in dialog |
| 2 | Client | POST `/api/analyze-public-v1` with new competitor list |
| 3 | Server | `reserveCredit({leadId, cacheKey})` → -1, returns `reservationId` (or `duplicate`) |
| 4 | Server | Runs Apify + persists snapshot |
| 5a | Server (success) | `confirmReservation({reservationId, snapshotId})` → audit row, balance stays at -1 |
| 5b | Server (failure before snapshot) | `releaseReservation({reservationId})` → +1, balance restored |
| 6 | Client | Refresh balance pill, invalidate router |

## Idempotency keys

- **Client UI**: `submitting` state disables confirm.
- **Client network**: `fetchPublicAnalysis` in-flight Map keyed on `handle|competitors`.
- **Server DB**: unique partial index `uniq_credit_ledger_reserve_per_report` on `(lead_id, cache_key)` where `reason='reserve'` and no matching release/confirm. Second concurrent POST returns `duplicate` and serves the in-flight result without a second debit.

## Not implemented (explicit follow-ups)

- **Period 30d/90d** (extending endpoint with `period_days` + `onlyPostsNewerThan` + cacheKey rebuild). Chips open modal in "em preparação" state. No credit spent. Will need a separate prompt.
- No new credit-store / top-up flow. Empty state still routes to feedback as today.

## Validation checklist

1. Paid user with 2 credits clicks "Adicionar concorrente" → dialog opens with input.
2. Enter valid handle → confirm → spinner → analysis runs → toast → balance becomes 1.
3. Double-click confirm during submit → only one POST fires; only one credit debited.
4. Hard refresh while in-flight + click confirm again → server returns `duplicate`; no second debit.
5. Invalid handle (e.g. `@`, length 0, special char) → confirm disabled.
6. Handle equal to primary or existing competitor → confirm disabled with inline message.
7. Apify fails → balance restored; dialog shows error; balance pill refreshes to 2.
8. Paid user with 0 credits clicks competitor → empty state ("Pedir mais créditos") → no fetch, no debit.
9. Paid user clicks 30d / 90d → "em preparação" state, no credit consumed, no fetch.
10. Free user clicks any chip → existing pricing/unlock modal (unchanged).
11. No payment / pricing / EuPago / entitlement / schema logic changed.

## Files changed (expected)

- `src/components/report-redesign/v2/consume-credit-dialog.tsx` — submitting state, competitor input, period "em preparação".
- `src/components/report-redesign/v2/report-block-nav.tsx` — async confirm, calls `fetchPublicAnalysis`, refreshes balance, tracks lifecycle events, router.invalidate.
- `src/locales/pt/report.json` (or equivalent) — new strings.

No backend / migration / schema / pricing / EuPago / entitlement files touched.
