# MVP Credit Purchase Flow — Final Validation Audit

**Mode:** Read-only audit. No code changes.

## Files verified

- `src/lib/payments/products.ts` — public catalogue
- `src/lib/payments/products.server.ts` — authoritative price (900 cents)
- `src/routes/checkout.credits.tsx` — checkout page + success panel
- `src/components/report-redesign/v2/report-block-nav.tsx` — no-credit modal CTA
- `src/lib/credits/credits.server.ts` — grant functions + idempotency
- `src/routes/api/public/eupago-webhook.ts` — webhook dispatch
- Tests: `src/lib/credits/__tests__/credit-pack.test.ts`, `credits-post-purchase.test.ts`, `credits.test.ts`, `lead-reports.test.ts`, `src/lib/payments/__tests__/*`

## Current actual flow

```text
report-block-nav.onBuyCredits()
  → navigate /checkout/credits?pack=credit_pack_1&intent=…&return=…&source=report_no_credits_modal
  → CheckoutSteps (single SKU, ignores ?pack override, always credit_pack_1)
  → createEupagoCheckout({ product_code: "credit_pack_1" })
  → EuPago hosted page (amount 900 cents)
  → POST /api/public/eupago-webhook
      ├─ HMAC verify
      ├─ lead_payments → paid
      ├─ grantCreditPack(+1, kind=credit_pack_purchased)         [idempotent /payment_id]
      ├─ grantCreditPackLaunchBonus(+2, kind=credit_pack_launch_bonus) [idempotent /payment_id]
      ├─ NO grantEntitlement, NO enrichments enqueue
      └─ recordProductEvent payment_webhook_paid
  → user redirected back to /checkout/credits?status=success&pack=credit_pack_1&return=…
  → PostPurchaseSuccessPanel polls getMyCreditBalance until >= 3 (10s window)
  → "Voltar ao relatório" button = manual return, no auto re-trigger
```

## Pass / fail table

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | No-credit modal → /checkout/credits?pack=credit_pack_1 | PASS | report-block-nav.tsx:952-970 |
| 2 | Checkout shows only one credit option | PASS | checkout.credits.tsx:33-41 (PACKS = [credit_pack_1]); selector ignored, DEFAULT_PACK forced |
| 3 | Product sent to EuPago = credit_pack_1 | PASS | createCheckout call uses selectedPack.code; amountCents=900 in server catalogue |
| 4 | Webhook grants +1 paid + +2 bonus | PASS | eupago-webhook.ts:178-234 |
| 5 | Two ledger entries (credit_pack_purchased + credit_pack_launch_bonus) | PASS | distinct kinds in credits.server.ts:38,56 |
| 6 | Both grants idempotent by payment_id | PASS | both fns filter by metadata.payment_id + kind before insert; covered by credit-pack.test.ts |
| 7 | Success page copy + balance | PASS | checkout.credits.tsx:391, 398-410, 414-422 (polling) |
| 8 | Manual return to report | PASS | "Voltar ao relatório" button window.location.assign(target); no auto-redirect |
| 9 | No pending action auto re-trigger | PASS | success panel only fetches balance; `intent` not read on success branch |
| 10 | report_full_9 still grants Pro + 3 credits + enrichments | PASS | eupago-webhook.ts:274-374 (grantEntitlement, enqueuePaidEnrichments, enqueueCommentScraping, +1 included +2 beta) |
| 11 | Credit packs do not grant Pro entitlement | PASS | pack branch returns at line 271 before grantEntitlement |
| 12 | Credit packs do not trigger enrichments | PASS | pack branch returns before enqueuePaidEnrichmentsForPayment / enqueueCommentScrapingForPayment |
| 13 | 30d/90d, competitor, force_refresh, cache untouched | PASS | no diff in `src/lib/analysis/window-configs.ts`, `period-cache.functions.ts`, `routes/api/analyze-public-v1.ts` from credit-pack work; pack branch never invokes them |
| 14 | All related tests pass | PASS | credits, credit-pack, credits-post-purchase, payments products, eupago-checkout, eupago-signature, checkout-errors, lead-reports = 8 files / 54 tests green |
| 15 | Unrelated failing tests listed separately | see below |

## Unrelated failing tests (NOT touched by this flow)

- `src/lib/analysis/__tests__/constants.test.ts` — Apify input wiring constant
- `src/components/report-redesign/v2/__tests__/premium-cta-unification.test.ts` — UnlockModal shell wiring
- `src/routes/api/admin/__tests__/send-commercial-followup.test.ts` — 5 admin email tests
- `src/components/admin/v2/beta-leads/__tests__/lead-context-labels.test.ts` — PT copy assertion

Total: 8 failing tests across 4 files. None touch credit packs, checkout, webhook grants or report_full_9. Pre-existing.

## Remaining risks (cosmetic, low severity — not requested to fix)

1. **Stale enum values still accepted** in checkout query schema (`credits_3 / 10 / 25` in `PACK_QUERY_VALUES`). Harmless — always normalised to `credit_pack_1`.
2. **Checkout H1 says "Escolhe o teu pack de créditos"** (single SKU now; should ideally read "Comprar 1 crédito"). No functional impact.
3. **The word "beta" still appears** in `/termos`, `/admin/beta-requests`, `/admin/automacoes` headings. None of these are inside the credit purchase UX. The credit-pack copy itself uses "lançamento", not "beta".
4. **Polling window 10s** on success page — if EuPago webhook is delayed >10s, user sees stale balance until they refresh manually. Documented behaviour.

## Manual production QA checklist

1. From a fresh logged-in lead with 0 credits, on `/analyze/<user>`, click any locked Pro CTA → "Comprar créditos" → confirm URL contains `pack=credit_pack_1&return=…&source=report_no_credits_modal`.
2. Confirm checkout shows H1 + price card with "9€" + "1 crédito · pagamento único". No selector visible. No mention of bonus.
3. Fill billing → confirm redirect to EuPago hosted page.
4. Complete a real (or sandbox) payment.
5. Verify in DB (`credit_ledger`): two new rows for the lead with `reason='admin_adjust'`, `metadata.kind` = `credit_pack_purchased` (+1) and `credit_pack_launch_bonus` (+2), same `metadata.payment_id`.
6. Confirm success page shows: "Créditos adicionados com sucesso", green/gift box "Oferta de lançamento aplicada: recebeste 2 créditos extra", "Saldo actualizado: 3 créditos".
7. Click "Voltar ao relatório" → lands on the original report URL (the `return` path). Confirm no analysis is auto-triggered.
8. Manually click a Pro action (e.g. 30d) → consume 1 credit normally (balance drops to 2). Confirms packs don't grant Pro entitlement; they only add credits.
9. Re-deliver the same EuPago webhook (or replay) → confirm no duplicate ledger rows (idempotency by `payment_id`).
10. Separately, run a `report_full_9` purchase end-to-end → confirm Pro unlock + enrichments fire + 3 credits granted (1 included + 2 beta bonus). Untouched by this audit.

## Verdict

All 14 functional checks PASS. Flow is consistent with the approved MVP decision. No fixes required to ship; risks above are cosmetic and tracked.
