## Status: already implemented in the previous build turn

Every requirement in this request was shipped in the last build pass. Re-stating against the spec:

### Files already changed
- `src/components/checkout/human-diagnosis-upsell.tsx` (new) — upgrade card with 97€ / 149€ riscado, 4 bullets, primary CTA "Sim, quero diagnóstico humano" + clearly visible secondary "Continuar só com o relatório de 9€".
- `src/routes/checkout.report-full.tsx` — 4-step flow (Confirmar desbloqueio · Prioridade · Leitura humana? · Faturação e pagamento), `selectedProduct` state, `StepProgress total={4}`, summary + return path bound to selected product.
- `src/components/checkout/order-summary.tsx` — already accepts `productCode`; now receives `selectedProduct` so it shows 9€ or 97€ correctly.
- `src/lib/payments/eupago.functions.ts` — schema accepts optional `upsell { presented, accepted, source_product }`; writes `source_product`, `target_product`, `final_product`, `upsell_presented`, `upsell_accepted`, `upsell_from`, `upsell_to` into `lead_payments.metadata`; extends server-side `payment_checkout_created` event metadata with the same fields. Amount is still resolved server-side via `getServerProduct(selectedProduct)`.

### Final flow (matches spec)
Step 1 Confirm unlock → Step 2 Prioridade (existing qualifier kept between unlock and upsell) → Step 3 Upsell → Step 4 Billing + Confirmar e pagar. EuPago is called only on the final CTA.

Note: the spec lists only 3 steps (unlock → upsell → billing). The current build keeps the existing "Prioridade" qualifier as step 2 (already approved in the previous design pass and used for `report_priority` metadata). If you want it removed to land on exactly 3 steps as written, say so and I'll drop it.

### Metadata stored (on `lead_payments.metadata`)
`source_product` (= `report_full_9`), `target_product`, `final_product`, `upsell_presented`, `upsell_accepted`, `upsell_from`, `upsell_to`, plus existing `billing`, `qualification`, `report_priority`, `source_component`, `coupon_code`. `instagram_username` and `report_cache_key` live on dedicated columns.

Naming delta vs spec: stored key is `source_product`, not `initial_product`. If you want the literal `initial_product` key as well, I'll add it as an alias.

### Tracking events emitted
`checkout_upsell_seen` (on step 3 view, once), `checkout_upsell_accepted`, `checkout_upsell_declined`, `checkout_payment_started`, `checkout_payment_failed`, plus server-side `payment_checkout_created`. All carry `source_product` / `final_product` / `upsell_accepted` where relevant.

### Validation
`bunx tsc --noEmit` ran clean at the end of the previous build turn. No checkout/payment tests beyond the existing `src/lib/payments/__tests__/checkout-errors.test.ts`, which is unrelated.

### Risks before smoke test
- None blocking. The only design call worth confirming is the kept "Prioridade" step (4 total) vs the spec's 3-step shape.
- Mobile QA at 360/390 wasn't re-run after the upsell step was added; visual sweep recommended during smoke test.

## Proposed action

Switch to build mode only if you want one of these tweaks:
1. Drop the "Prioridade" step to match the literal 3-step spec.
2. Add `initial_product` as an alias key in metadata.
3. Re-run `bunx tsc --noEmit` and walk the preview at 360/390/768/1440 to confirm no overflow.

Otherwise the upsell is already live — no further code changes needed and you can proceed straight to smoke test.