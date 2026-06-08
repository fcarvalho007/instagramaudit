# QA Audit — Pro 30d/90d analysis flow (post PR3.A)

Static code audit only — no live calls were issued. Manual browser steps are listed at the end for the user to run.

## PASS/FAIL table

| # | Check | Result | Evidence |
|---|---|---|---|
| 1.1 | 30d chip clickable for Pro | PASS | `report-block-nav.tsx:969-994` chip renders `onPeriodPaidClick(days)` when `premiumUnlocked`. |
| 1.2 | Click opens `ConsumeCreditDialog` | PASS | `report-block-nav.tsx:861-863` → `openConsumeDialog({kind:"period",days})`; dialog mounted at L1072/L923. |
| 1.3 | Dialog clearly explains "may consume 1 credit if not cached" | PASS | `consume-credit-dialog.tsx:87-92` uses `period_action_body`; pt-PT string `src/i18n/locales/pt/report.json:661` = "Esta análise pode consumir 1 crédito se ainda não existir em cache…". |
| 1.4 | Confirm sends `POST /api/analyze-public-v1` with `window:"30d"` | PASS | `report-block-nav.tsx:640-645` calls `fetchPublicAnalysis(..., {window: windowKind})`; `client.ts:35-49` posts `{instagram_username, competitor_usernames, window}`. |
| 1.5 | Navigates to `?w=30d` after success | PASS | `report-block-nav.tsx:683-691` `navigate({ search: prev => ({...prev, w: windowKind}) })`. |
| 1.6 | Correct toast for cache vs fresh | PASS | `report-block-nav.tsx:670-677` reads `result.data_source` → `period_success_toast_cache` / `_fresh` / `_neutral`. |
| 1.7 | Refreshes credit balance | PASS | `refreshBalance()` called at L669 (success) and L704/L720 (failure paths). |
| 2.1 | Pro w/ 0 credits — dialog opens | PASS | Same `openConsumeDialog` path; dialog mounts regardless of balance. |
| 2.2 | Confirm CTA blocked at 0 credits | PASS | `consume-credit-dialog.tsx:82` `hasCredit = balance >= 1`; L276/296 renders `empty_cta` button instead of confirm CTA — no `onConfirm` invocation possible. |
| 2.3 | Empty state explains lack of credits | PASS | L157-170 swap title/body to `empty_title`/`empty_body` when `!hasCredit`. |
| 2.4 | No backend analyze call on empty state | PASS | Empty CTA only calls `onOpenChange(false)` + `onEmptyFeedback?.()` (L298-304). No `fetchPublicAnalysis` reachable. |
| 3.1 | Free user — 30d/90d show locked/upsell | PASS | L973-994 chip uses `onPeriodLockedClick` when `!premiumUnlocked` → `handlePremiumAccessClick("sidebar_period", …)`. Lock icon rendered L989-991. |
| 3.2 | No analyze call for Free | PASS | `ConsumeCreditDialog` only mounted when `premiumUnlocked` (L922, L1071). Free path never reaches `fetchPublicAnalysis`. |
| 3.3 | No credit reservation attempted (Free) | PASS | Server-side defence: `analyze-public-v1.ts:585-599` rejects wide window with `WINDOW_REQUIRES_PRO` **before** `reserveCredit` (L602). |
| 4.1 | Repeat 30d uses cache, cache toast | PASS | Server returns `data_source:"cache"` for fresh hit; toast maps via L670-677. |
| 4.2 | No new credit ledger entry on cache repeat | PASS | `analyze-public-v1.ts:601` `skipReserve = cacheFreshHit && alreadyAssociated` → `reserveCredit` not called for same lead+cache_key. |
| 4.3 | No new `provider_call_logs` entry on cache hit | PASS (by design) | Cache branch returns the existing snapshot without invoking the provider runner. (Confirm via admin diagnostics during manual run.) |
| 5.1 | 90d wired identically to 30d | PASS | `report-block-nav.tsx:622` `windowKind = days === 90 ? "90d" : "30d"`. Same chip map (`PREMIUM_WINDOWS`), same handler, same dialog. |
| 5.2 | 90d request body would send `window:"90d"` | PASS | Same `fetchPublicAnalysis(..., {window:"90d"})` path → `client.ts:47`. |
| 6 | No changes to checkout / EuPago / pricing / schema / Free-Public / competitor comparison UI | PASS (scope) | PR3.A touches only sidebar nav + dialog wiring + analyze client params. None of the protected modules referenced. |

Overall: **all checks PASS in code**. Three items (4.1, 4.3, and a live 90d) still need a manual confirm in browser.

## Files & lines audited

- `src/components/report-redesign/v2/report-block-nav.tsx` — 598-844 (dialog state, onConfirm, period handlers), 861-863, 922-935, 969-994, 1071-1084.
- `src/components/report-redesign/v2/consume-credit-dialog.tsx` — full file (82, 87-101, 157-170, 240-260, 276-305).
- `src/lib/analysis/client.ts` — full file (window param forwarding, in-flight guard).
- `src/routes/api/analyze-public-v1.ts` — 560-635 (Pro gate, lead lookup, skipReserve, INSUFFICIENT_CREDITS), 994-1067 (window-scoped enrichment selection).
- `src/i18n/locales/pt/report.json:661` and `en/report.json:661` — Pro-friendly `period_action_body` copy.

## Manual test steps (for the user)

Run on the preview at `/analyze/nunomarkl` (Pro test profile). Open DevTools → Network, filter for `analyze-public-v1`.

1. **Pro + credits, fresh 30d**
   - Click `30d` chip → dialog opens with title "Análise dos últimos 30 dias" and body containing "pode consumir 1 crédito".
   - Click confirm → expect 1 POST to `/api/analyze-public-v1` with body `window:"30d"`, response `data_source:"fresh"`, toast = `…toast_fresh`, URL becomes `?w=30d`, sidebar balance decrements by 1.
2. **Cache repeat 30d**
   - Reload page, click `30d` again → expect POST `window:"30d"`, response `data_source:"cache"`, toast = `…toast_cache`, balance unchanged. Verify in admin no new row in `credit_ledger` / `provider_call_logs` for this lead+cache_key.
3. **Pro + 0 credits**
   - Use a Pro lead with `balance = 0`. Click `30d` → dialog title = "Sem créditos" body, only "Enviar feedback" CTA visible, no confirm. No request fired.
4. **Free user**
   - Open the report as a Free lead. `30d` chip shows lock icon. Click → upsell dialog, no `analyze-public-v1` call.
5. **90d (read-only)**
   - DO NOT confirm yet. Click `90d`, inspect dialog (should say "90 dias"). Cancel. Verify no network request.
   - If approved, confirm once and check `data_source` + balance behaviour identical to 30d.

## Risks before publishing

- **Cost risk (low)**: 90d has not been smoke-tested live. Enrichment runs the 90-day Apify scrape and is more expensive than 30d. Surface the cost in admin diagnostics after the first live run.
- **Double-fetch risk (mitigated)**: After confirm we both fetch and navigate to `?w=30d`; the loader's second fetch is a guaranteed cache hit (server enforces `skipReserve` via `cacheFreshHit && alreadyAssociated`). Inflight guard in `client.ts:15` collapses StrictMode duplicates.
- **Empty state copy**: The `empty_cta` opens a feedback flow, not a purchase flow. Acceptable for beta — re-evaluate after public launch.
- **Toast key fallback**: If a future server change drops `data_source`, copy falls through to `period_success_toast_neutral`. No regression, just less specific UX.
- **Lock chip a11y**: Locked chips use `aria-disabled="true"` but remain clickable (intentional, opens upsell). Confirm SR users get the upsell, not silence.

## 90d separate live smoke test before public launch?

**Yes — recommended.** 30d and 90d share UI/client/server code paths, so functional risk is low, but 90d hits a different Apify config (larger sample, higher cost) and has not been exercised. One live confirm on `nunomarkl` is enough to validate provider cost, latency, and resulting snapshot before opening 90d to public Pro users.
