## Status: most of this is already shipped

The audit-approved server side of the post-purchase beta bonus is already in production. Confirmed in code:

- `src/lib/credits/credits.server.ts` exports `grantPostPurchaseBetaCredits({ leadId, paymentId })`. Idempotent by `payment_id` via a pre-insert `select` filtered on `reason='admin_adjust'` + `metadata->>kind='post_purchase_beta_bonus'` + `metadata->>payment_id=<id>`. Constants `POST_PURCHASE_BETA_BONUS = 2`, `POST_PURCHASE_BETA_KIND = "post_purchase_beta_bonus"`.
- `src/routes/api/public/eupago-webhook.ts` (paid branch, after `grantEntitlement`) calls `grantPostPurchaseBetaCredits` inside its own try/catch so a failure never breaks the webhook, and on `granted=true` records a `credits_post_purchase_granted` product event with `{ payment_id, product_code, delta: 2, kind: "post_purchase_beta_bonus" }`.
- `src/lib/credits/credits.functions.ts` exposes `getMyCreditBalance` (lead-cookie scoped) so the report can read the balance.
- `src/components/report-redesign/v2/report-block-nav.tsx` `ExploreSection` already loads and renders the balance line (`beta_credits_available` / `beta_credits_empty`) but ONLY when `premiumUnlocked` is true, so it stays invisible to free users.

What is NOT yet done (and is the actual delta this plan implements):

1. **No post-purchase surprise UX surface.** The checkout return URL is `/checkout/report-full?status=success` (and `/checkout/authority-diagnosis?status=success`), but neither route renders anything for `status=success` — the user lands back on step 1. The "Oferta beta desbloqueada" message has nowhere to appear.
2. **Empty-state copy mismatch.** Spec asks for "0 créditos disponíveis"; current key `nav.explore.beta_credits_empty` reads "Sem créditos beta disponíveis".
3. **No unit tests** for `grantPostPurchaseBetaCredits` idempotency.
4. **Naming nit.** Spec suggests the event be called `beta_credits_granted`; we already emit `credits_post_purchase_granted`. Keep the existing name to avoid breaking analytics dashboards; document the mapping in the migration plan only.
5. **`premiumUnlocked` is hard-coded `false`** in `src/routes/analyze.$username.tsx:429`. That means even paid users currently see the free sidebar — the balance line never shows in practice. This is the wider "expose paid state to the report" work and is OUT OF SCOPE for this prompt (the prompt explicitly says "if data is available"). We will leave a TODO comment and call it out below as a known gap, no entitlement-reading code changes.

## Changes

### 1. `src/routes/checkout.report-full.tsx` — surface the surprise after EuPago return

- Extend `searchSchema` with `status: z.enum(["success"]).optional()`.
- At the top of `CheckoutSteps`, when `search.status === "success"`, render a new `<PostPurchaseSuccessPanel />` instead of the step UI. The panel shows:
  - Confirmation headline: "Pagamento confirmado — relatório desbloqueado".
  - Subtle "surprise" card (not styled as a discount):
    - Eyebrow: "Oferta beta desbloqueada"
    - Body: "Como estamos em beta, oferecemos 2 créditos adicionais para explorares mais o relatório."
    - Helper: "Podes usar estes créditos para gerar outro período ou adicionar concorrentes."
  - Primary CTA: "Ver o meu relatório" → `navigate` to `search.return ?? "/app/reports"` (fallback `/app/reports`, which is the existing post-purchase entry point).
- The panel fires `trackEvent({ eventType: "post_purchase_view", metadata: { product_code: "report_full_9" } })` exactly once, and `trackEvent({ eventType: "post_purchase_bonus_seen", metadata: { kind: "post_purchase_beta_bonus" } })` once on mount.
- No EuPago payload changes, no checkout/billing/upsell logic changes — only the early-return rendering branch when `status=success`.
- Authority-diagnosis equivalent (`/checkout/authority-diagnosis?status=success`) is intentionally left untouched in this prompt because the bonus is scoped to the 9€ full report (the audit grants the bonus on every `paid` webhook regardless of product, but the surprise copy is product-specific; gating the panel here keeps the message on-brand). We add a TODO to revisit if authority-diagnosis should show its own confirmation panel.

### 2. `src/i18n/locales/{pt,en}/report.json` — empty-state copy

- Change `nav.explore.beta_credits_empty`:
  - PT: "Sem créditos beta disponíveis" → "0 créditos disponíveis"
  - EN: existing equivalent → "0 credits available"
- Keep `beta_credits_available` (singular/plural) untouched.

### 3. `src/i18n/locales/pt/checkout.json` (or the closest existing checkout namespace, fallback to inline strings in `checkout.report-full.tsx`)

- Add the post-purchase panel strings under a new `checkout.post_purchase.*` namespace. If no `checkout` i18n file exists, keep strings inline in PT (the file is already PT-only in tone) and add EN later — the rest of `checkout.report-full.tsx` already uses inline PT strings.

### 4. `src/lib/credits/__tests__/credits.server.test.ts` — new file

- Use the existing vitest harness (project uses `bunx vitest run`). Mock `@/integrations/supabase/client.server` with an in-memory store keyed on `(lead_id, reason, metadata.kind, metadata.payment_id)`.
- Cases:
  1. `grantPostPurchaseBetaCredits` on a fresh `(leadId, paymentId)` inserts one row with `delta=2`, `reason='admin_adjust'`, `metadata.kind='post_purchase_beta_bonus'`, returns `{ granted: true }`.
  2. A second call with the same `(leadId, paymentId)` finds the existing row and returns `{ granted: false }` without inserting.
  3. A call with the same `leadId` but a different `paymentId` inserts a new row and returns `{ granted: true }` (covers re-purchases).
  4. A select error from Supabase propagates as a thrown `Error` (caller is responsible for swallowing).

If `@/integrations/supabase/client.server` is not mockable in the existing test setup, fall back to a smaller test that imports the helper with a hand-rolled fake `supabaseAdmin` injected via module mock; do NOT touch the real client.

### 5. Webhook-level idempotency test (optional, only if a webhook test harness already exists)

- Skip new infra. If `src/routes/api/public/__tests__/eupago-webhook.test.ts` (or similar) already exists, add a case that runs the webhook handler twice for the same payload and asserts `grantPostPurchaseBetaCredits` was called twice but `recordProductEvent` only fired the `credits_post_purchase_granted` event once (because the second `grantPostPurchaseBetaCredits` returns `{ granted: false }` and the event emission is gated on `result.granted`). If no harness exists, skip — the unit test above already covers the idempotency primitive.

## What is explicitly NOT changed

- Product prices, `PUBLIC_PRODUCTS`, `lead_payments` rows, EuPago payload, checkout fields, billing form, upsell, `grantEntitlement`, coupon redemption, `recordProductEvent`'s signature, report generation, scraping, metric calculations, RLS, DB schema, `analyze.$username.tsx` (the `premiumUnlocked={false}` hard-code stays — see Known Gap below).

## Known gap (call out, do not implement here)

`src/routes/analyze.$username.tsx` hard-codes `premiumUnlocked={false}`. Until that route reads the user's entitlement and flips the flag, the sidebar's "X créditos beta disponíveis" line never renders in practice and `ConsumeCreditDialog` never opens. The bonus is correctly granted server-side; only the report-page visibility is blocked. Fixing it requires an entitlements read (and probably the `_authenticated/` auth gate), which is a separate prompt's worth of work. We leave the existing `getMyCreditBalance` call untouched so it activates automatically once the flag flips.

## Manual validation checklist

1. With a fresh lead, complete a 9€ report-full checkout against the EuPago sandbox. After redirect to `/checkout/report-full?status=success`, the success panel appears with the "Oferta beta desbloqueada" copy and the "Ver o meu relatório" CTA.
2. In Supabase, `credit_ledger` has exactly one row for this lead with `delta=2`, `reason='admin_adjust'`, `metadata->>kind='post_purchase_beta_bonus'`, `metadata->>payment_id=<lead_payments.id>`.
3. `product_events` has exactly one `credits_post_purchase_granted` event for that lead with the same `payment_id`.
4. Manually re-POST the same EuPago webhook payload. The credit_ledger row count and product_events row count for this `payment_id` stay at 1 each. The webhook returns 200 either way.
5. Before payment, no UI surface mentions the bonus (search the report page, pricing page, premium-interest dialog: no "beta", no "2 créditos", no "bónus").
6. Once `premiumUnlocked` flips to `true` for a paid user (separate work), the sidebar shows "2 créditos beta disponíveis", then "1 crédito beta disponível", then "0 créditos disponíveis" as they are consumed.
7. `bunx vitest run src/lib/credits/__tests__/credits.server.test.ts` passes locally.
