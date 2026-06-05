## P0 blocker check — RESOLVED

`createEupagoCheckout` (src/lib/payments/eupago.functions.ts) already resolves `lead_id` server-side from the signed `lead_session` cookie via `getLeadFromCookie()`, verifies the lead row exists in `leads` (lines 130–157), and only then inserts into `lead_payments`. Any client-sent `lead_id` is accepted by the schema but ignored. Missing/stale sessions throw `safeCheckoutPrepareError()` without leaking the FK error.

Conclusion: no `lead_payments_lead_id_fkey` risk remains. Safe to proceed with the upsell.

## Recommended upsell architecture

Single decision step inside `/checkout/report-full`. No new route, no parallel checkout. The choice swaps the `product_code` sent to `createEupagoCheckout`; the server already authoritatively prices `authority_diagnosis_97` at 97€ via `getServerProduct` — the client never sets price.

`/checkout/authority-diagnosis` keeps its current 3-step shape (qualification → audit/workshop interest capture → billing). No amount change, no extra payment row.

## Final flow — /checkout/report-full (4 steps)

```text
1. Confirmar desbloqueio   (ConfirmUnlockCard, unchanged)
2. Prioridade              (ReportPriorityForm, unchanged)
3. Leitura humana?         (NEW upsell decision step)
4. Faturação e pagamento   (Billing + summary, summary reflects chosen product)
```

Step 3 content:
- Title: "Queres uma leitura humana dos dados?"
- Subtitle: "O relatório mostra os sinais. O diagnóstico humano ajuda a transformar esses sinais em 3 prioridades concretas."
- Card "Adicionar Diagnóstico de Autoridade Digital" with: relatório completo incluído · 30 min com humano · 3 prioridades · orientação de conteúdo e posicionamento · total 97€ (riscado 149€).
- Primary CTA: "Sim, quero diagnóstico humano" → sets local state `selectedProduct = 'authority_diagnosis_97'`, fires `checkout_upsell_accepted`, advances.
- Secondary CTA (equally legible, ghost variant, not hidden): "Continuar só com o relatório de 9€" → keeps `report_full_9`, fires `checkout_upsell_declined`, advances.
- On step view: fire `checkout_upsell_seen` once.

Step 4 binds to `selectedProduct`:
- `OrderSummary` shows the chosen product (price, line items).
- `return_path` becomes `/checkout/<route>?status=success` keyed off product.
- `submitPayment` passes `product_code: selectedProduct` plus upsell metadata (see below).

No new visible step in `/checkout/authority-diagnosis`. Audit/workshop interest already flows through `UpsellInterest` + `upsell_interest` metadata; we keep it as-is.

## Metadata plan (stored in `lead_payments.metadata`)

Extend the JSON object the server already writes — no schema change. New keys (all optional):
- `source_product` — original product the user entered checkout for (`report_full_9`).
- `target_product` — product offered in the upsell (`authority_diagnosis_97`).
- `final_product` — product actually checked out (mirrors `lead_payments.product`, useful when querying metadata-only).
- `upsell_presented` — boolean.
- `upsell_accepted` — boolean.
- `upsell_from` / `upsell_to` — convenience strings, only set when accepted.
- Existing fields preserved: `qualification`, `upsell_interest`, `report_priority`, `billing`, `coupon_code`, `source_component`, `instagram_username` (already on the row column), `report_cache_key` (already a column).

Server change: extend `inputSchema` in `eupago.functions.ts` with an optional `upsell` object `{ presented: boolean, accepted: boolean, source_product: ProductCode }` and write the derived keys above into the metadata block. No DB migration.

## Tracking plan (via `trackEvent` → `product_events`)

New / standardised events emitted from `/checkout/report-full`:
- `checkout_upsell_seen` — on step 3 view. `{ source_product, target_product }`.
- `checkout_upsell_accepted` — on primary CTA. `{ source_product, target_product, final_product }`.
- `checkout_upsell_declined` — on secondary CTA. `{ source_product, final_product }`.
- `checkout_payment_started` — already emitted; extend metadata with `final_product`, `source_product`, `upsell_accepted`.
- `checkout_payment_failed` — already emitted; same extension.
- `payment_checkout_created` — already emitted server-side; extend server metadata with `source_product`, `upsell_accepted` (read from input).

Common metadata keys on every event (when known): `source_product`, `target_product`, `final_product`, `source_component`, `instagram_username`, `report_cache_key`.

`/checkout/authority-diagnosis` keeps emitting `checkout_upsell_interest` for audit/workshop selections — no change.

## Admin visibility plan (no UI work this task — just guarantee the data exists)

All questions answerable via existing `product_events` + `lead_payments`:
- Upsell funnel: count `checkout_upsell_seen` vs `checkout_upsell_accepted` vs `checkout_upsell_declined` over time.
- Revenue per product: `SUM(amount_cents)` from `lead_payments WHERE status='paid' GROUP BY product`. Both `report_full_9` and `authority_diagnosis_97` are already first-class.
- Pending vs failed vs paid by product: `GROUP BY product, status` on `lead_payments`.
- Upsell-attributable revenue: `lead_payments` where `metadata->>'upsell_accepted' = 'true'`.
- Audit / workshop interest count: `product_events WHERE event_type='checkout_upsell_interest'`, optionally `metadata->>'audit'`/`'workshop'`.

Document these queries inside the plan note for the next admin-dashboard task; no `/admin` UI changes here.

## Files expected to change (build phase)

- `src/routes/checkout.report-full.tsx` — add step 3 upsell, lift `selectedProduct` state, pass to summary + server call, bind step labels to 4 entries, emit new tracking events.
- `src/components/checkout/order-summary.tsx` — accept `productCode` prop (already does) and render correctly for both products; small copy tweak for upsell-accepted state ("Relatório completo incluído").
- `src/components/checkout/` — new `human-diagnosis-upsell.tsx` (presentational card with primary + secondary CTA, both visible).
- `src/lib/payments/eupago.functions.ts` — extend `inputSchema` with optional `upsell` block; write `source_product` / `target_product` / `final_product` / `upsell_presented` / `upsell_accepted` / `upsell_from` / `upsell_to` into metadata; include same keys in server-side `payment_checkout_created` event metadata.

Not touched: EuPago server module, webhook, prices, product codes, report generator, onboarding, credits, Apify/OpenAI/DataForSEO, DB schema, `/admin` UI, `/checkout/authority-diagnosis`.

## Implementation phases

1. Server schema + metadata writer (eupago.functions.ts) — additive, optional fields.
2. Upsell card component + step 3 wiring in report-full route + tracking events.
3. Order summary + return path bound to `selectedProduct`.
4. Smoke test (manual): see upsell → decline → 9€ pending row with `upsell_accepted=false`; restart → accept → 97€ pending row with `upsell_accepted=true`, `source_product=report_full_9`. Confirm no Apify/OpenAI/DataForSEO calls and no entitlement before payment.
5. `bunx tsc --noEmit`.

Admin dashboard work is intentionally out of scope; the metadata + events above are the contract.