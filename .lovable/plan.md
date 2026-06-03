# Focused Checkout Flow — Diagnóstico de Autoridade Digital (97€ beta)

## 1. Route & layout architecture

New route group with a dedicated layout (no global nav, no report sidebar, no account menu).

```text
src/routes/
  checkout.tsx                          -> pathless layout (CheckoutShell + <Outlet/>)
  checkout.authority-diagnosis.tsx      -> the actual flow (single route, internal step state)
```

`checkout.tsx` renders:
- top bar: logo (links to `/`), step progress (1–4), "Pagamento seguro" lock icon, optional "Voltar ao relatório" (only when `?return=` present)
- centered container max-w-2xl, mobile-first (px-4 on 360/390)
- footer with `Lovable Cloud` trust line + `/termos` `/privacidade` links
- no `SiteHeader`, no `AppShell`, no `PricingTeaserBand`

Step state is internal (`useState`) — single URL with `?step=` mirror for back/forward and tracking. No nested routes per step (keeps state simple, avoids loader gymnastics).

## 2. Step flow (UX contract)

**Step 1 — Confirmar oferta**
- H1 + subtitle (from brief)
- Offer card: 97€ + strike 149€, "preço de lançamento · sobe para 149€", bullet list of inclusions
- CTA "Continuar" (primary). Secondary "Cancelar" → back to `returnPath` or `/precos`.

**Step 2 — Qualificação**
- Two single-select radio groups (Q1 objective, Q2 ownership) per brief
- "Outro" reveals a small free-text field (max 200 chars)
- CTA "Continuar". Both answers required.

**Step 3 — Interesse opcional**
- Two non-actionable interest cards (Auditoria 300€+, Workshop 1.500€+)
- Each has a checkbox "Tenho interesse, contactem-me" (default off)
- Explicit copy: "Estes serviços não são cobrados agora. É apenas um sinal de interesse."
- CTA "Continuar" (always enabled — skippable)

**Step 4 — Faturação e pagamento**
- Form: Nome/Empresa, NIF (PT format optional, validated 9 digits if filled), Morada, CP (`####-###`), Localidade, Email (required, defaults to lead email)
- Order summary card (sticky bottom on mobile, side on desktop): 97€ · pagamento único · sem subscrição
- CTA "Confirmar e pagar" → calls `createEupagoCheckout` → `window.location.assign(checkout_url)`
- Inline error region for serverFn failures

## 3. Data model impact

**No schema migration required.** Reuse existing `lead_payments.metadata` JSON column.

Extend `createEupagoCheckout` input schema (additive, all optional) to accept:
```
qualification: { objective, objective_other?, profile_ownership }
upsell_interest: { audit: boolean, workshop: boolean }
billing: { name, tax_id?, address, postal_code, city, invoice_email }
```
These flow into `lead_payments.metadata` alongside the existing keys. No DB change, no admin dashboard work.

Optionally also write `billing.invoice_email` into `leads.email` if empty (nice-to-have, can skip in phase 1).

## 4. EuPago boundary

- Amount stays server-side (`getServerProduct("authority_diagnosis_97").amountCents`) — unchanged.
- Webhook untouched.
- Only Step 4's "Confirmar e pagar" calls the serverFn. Steps 1–3 are pure client.
- `return_path` passed to serverFn = `/checkout/authority-diagnosis?status=success` (success page is out of scope of this plan; existing return handling is fine).

## 5. Tracking events

Add to `trackEvent` calls (no new infra; event type is free-form string in metadata):
- `checkout_started` — Step 1 mount
- `checkout_step_view` — every step mount, `{step: 1..4}`
- `checkout_step_complete` — on Continuar, with step payload (qualification answers, interest flags)
- `checkout_upsell_interest` — fired on Step 3 complete if either checkbox true
- `checkout_payment_started` — just before `createCheckout(...)` call (replaces/augments existing `payment_cta_clicked` for this flow)
- `checkout_payment_failed` — catch branch in Step 4

Existing `payment_checkout_created` / `payment_checkout_failed` server-side events stay intact.

## 6. Files likely to change / create

**New**
- `src/routes/checkout.tsx` — layout route
- `src/routes/checkout.authority-diagnosis.tsx` — flow controller
- `src/components/checkout/checkout-shell.tsx` — header/progress/footer
- `src/components/checkout/step-progress.tsx`
- `src/components/checkout/offer-card.tsx`
- `src/components/checkout/qualification-form.tsx`
- `src/components/checkout/upsell-interest.tsx`
- `src/components/checkout/billing-form.tsx`
- `src/components/checkout/order-summary.tsx`
- `src/i18n/locales/pt/checkout.json` (+ `en/checkout.json` for parity; PT is the shipping copy)

**Modified (surgical)**
- `src/lib/payments/eupago.functions.ts` — extend `inputSchema` with optional `qualification`, `upsell_interest`, `billing`; merge into `metadata`. No behaviour change for existing callers.
- `src/components/pricing/pricing-page.tsx` — replace direct `ReserveDiagnosisButton` for the 97€ card with a `Link to="/checkout/authority-diagnosis"`. Keep `ReserveDiagnosisButton` import for the 9€ self-serve path (which stays a direct redirect — autoatendimento).
- `src/components/report-redesign/v2/premium-interest-dialog.tsx` — same swap: the "Reservar diagnóstico" button navigates to the new route (carry `instagram_username`, `report_cache_key`, `return` as search params).
- `src/i18n/i18n.ts` (or equivalent) — register `checkout` namespace.

**Untouched (explicit)**
- EuPago webhook, `eupago.server.ts`, `products.server.ts` amounts
- Onboarding, report generation/scoring, credits, Apify/OpenAI/DataForSEO
- Admin pages, `lead_payments` schema, thumbnails, `/report.example`

## 7. ReserveDiagnosisButton fate

Keep the component. The 9€ `report_full_9` path still uses it (autoatendimento — direct redirect is correct). Only the 97€ entry points are rerouted through the focused flow.

## 8. Mobile-first specifics (360 / 390)

- Single column, 16px padding
- Step progress: compact dots + "Passo 2 de 4" label (not a wide bar with 4 captions)
- Offer card / order summary: collapsible "Ver detalhes" on mobile to keep CTA above the fold
- Sticky bottom CTA bar on Steps 1, 3, 4 (CTA + price reminder)
- All form fields full-width, `text-base` (16px) to prevent iOS zoom
- No horizontal scroll: test with `overflow-x-hidden` on shell

## 9. Implementation phases

1. **Plumbing** — route files, empty layout, register i18n namespace, draft PT copy. Verify route renders at `/checkout/authority-diagnosis` with no nav. (1 batch)
2. **Steps 1–3 UI** — offer card, qualification, upsell. Pure client, no payments. Tracking events wired. (1 batch)
3. **Step 4 + serverFn extension** — billing form, order summary, schema additive change, hook into existing `createCheckout`. (1 batch)
4. **Entry points** — swap `pricing-page.tsx` and `premium-interest-dialog.tsx` to navigate into the new flow with context params. (1 batch)
5. **Polish + QA** — 360/390 visual check, `bunx tsc --noEmit`, smoke the redirect chain in preview. (1 batch)

## 10. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Lead cookie missing when user lands directly on `/checkout/authority-diagnosis` from an external link | Step 1 calls a tiny "ensure-lead" serverFn (already exists for the modal) — or redirect to `/precos` if no lead session. Decide at impl. |
| Extra friction could *reduce* conversion vs. direct EuPago | Mitigated by short steps (4), pre-filled email, sticky CTA. Tracking `checkout_step_complete` will let us measure drop-off and revert if needed. |
| `metadata` JSON grows; existing webhook reads specific keys | Additive only — webhook ignores unknown keys. No contract change. |
| NIF/postal validation rejects valid edge cases | Make NIF optional, postal regex lenient (`/^\d{4}-?\d{3}$/`). Errors are warnings, not blockers. |
| Browser back from EuPago lands on Step 4 with stale state | Persist step state to `sessionStorage` keyed by lead id; clear on `?status=success`. |

## 11. Out of scope (explicit)

- Success/failure landing pages (existing return URL behaviour stays)
- Admin view of qualification/interest data (data is in `metadata`, retrievable later)
- Invoice generation, NIF VIES validation, address autocomplete
- A/B test framework — ship as the single new path
- Changing the 9€ or 0€ flows
