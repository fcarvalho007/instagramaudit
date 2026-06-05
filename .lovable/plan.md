
# Step 2 — `payment_confirmed` transactional email (kill-switch OFF by default)

Scope strictly limited to creating one new transactional email + safe fire-and-forget wire on the EuPago paid branch. Zero changes to prices, checkout, EuPago payload, entitlements, credits, report generation or schema.

## 1. Files to create / edit

| Action | File | Purpose |
|---|---|---|
| Create | `src/lib/email/templates/payment-confirmed.ts` | Pure renderer (subject, preheader, headline, body_html, body_text). Same shape as other templates (`EmailTemplateParts` + `RenderedEmail`). |
| Create | `src/lib/email/send-payment-confirmed.server.ts` | Server-only sender. Loads payment + lead inside, builds context, calls `sendTransactionalEmail`, never throws, returns structured result. Owns the kill-switch + idempotency check + `payment_confirmation_email_sent` / `payment_confirmation_email_failed` / `payment_confirmation_email_skipped` events. |
| Edit | `src/lib/email/templates/index.ts` | Re-export the new template renderer + parts. |
| Edit | `src/lib/email/transactional-email.server.ts` | Add `"payment-confirmed"` to `TxFlow` union and `FLOW_FAILURE_EVENT` map (`payment_confirmation_email_failed`). Strictly additive — no other changes. |
| Edit | `src/lib/admin/email-template-registry.ts` | Register `payment_confirmed` entry (category `pagamento`, wired but gated by kill-switch, realistic preview data). Add `CATEGORY_LABELS["pagamento"]` and append `"pagamento"` to `CATEGORY_ORDER`. |
| Edit | `src/routes/api/public/eupago-webhook.ts` | One additive line at the very end of the `normalized === "paid"` branch (after the existing `recordProductEvent("payment_webhook_paid")`), wrapped in `void` so failure cannot affect the 200 response or any prior step. No other edits. |

Optional / conditional:
- If a Vitest config is detected (`vitest.config.ts` is present), add `src/lib/email/__tests__/send-payment-confirmed.test.ts` with 3 unit tests (kill-switch OFF, idempotency dedup, missing optional fields). Tests will mock `supabaseAdmin`, `sendTransactionalEmail` and `recordProductEvent`. If mocking proves heavy in practice, fall back to manual checklist only — no test will be skipped silently.

## 2. Template content (pt-PT)

- Subject: `"Pagamento confirmado — relatório completo desbloqueado"`. If `handle` is known, optional variant `"Pagamento confirmado — @{handle}"` may be used; default stays the generic one to avoid awkward fallback.
- Preheader: `"O relatório completo de @{handle} já está disponível na tua conta."` Fallback (no handle): `"O teu relatório completo já está disponível na tua conta."`
- Headline (card): `"Pagamento confirmado."`
- Body (in order):
  1. Greeting via existing `greetingHtml(firstName)` (handles null gracefully → `"Olá,"`).
  2. Intro paragraph: `"Obrigado{firstName ? ', '+firstName : ''}. O relatório completo de {handle ?? 'o teu relatório'} está desbloqueado e fica guardado na tua conta."`
  3. **Receipt card** rendered as a 2-column `<table>` with rows for: Produto, Valor pago, Método de pagamento (only if available), Referência (only if available), Total. Rows for optional fields are emitted conditionally — no empty placeholder lines.
  4. Primary CTA via `renderButtonHtml("Abrir relatório completo", reportUrl)` + `renderUrlFallbackHtml(reportUrl)`.
  5. `pMuted("Pagamento único, sem subscrição nem renovação automática.")`
  6. `pMuted("Qualquer questão sobre o pagamento ou o relatório, responde a este email.")`
  7. `signatureHtml("Até já,")`.
- Plain-text body mirrors the same structure (same conditional skipping).
- No unsubscribe link (pure transactional). `wrapHtml` already renders the dark navy header band and footer in the project's existing style — reused as-is.

### Data rules (no hardcoded prices)

- `amountLabel` is built from `lead_payments.amount_cents` + `lead_payments.currency` using `Intl.NumberFormat("pt-PT", { style: "currency", currency })`. Never a hardcoded "9€" / "97€".
- `productName` comes from `PUBLIC_PRODUCTS[product].namePt` (lookup only — read-only).
- `paymentMethod`: read from `lead_payments.metadata.payment_method` if string and non-empty; otherwise the whole row is omitted.
- `paymentReference`: prefer `lead_payments.provider_reference`; fallback `lead_payments.provider_payment_id`. If neither, row omitted.
- `handle`: prefer `lead_payments.instagram_username`; fallback `null`. Used to build `reportUrl` via the existing `resolveReportUrl` helper.
- `firstName`: read from `leads.first_name` (or `parseFullName(leads.name).first` if `first_name` is empty). Null is fine — greeting handles it.
- `reportUrl`: built via existing `resolveReportUrl(handle, reportSnapshotId)`. If neither handle nor snapshot id is available, the email is **skipped** (recorded as `payment_confirmation_email_skipped` with `reason: "NO_REPORT_URL"`) to avoid sending a CTA-less email.

## 3. Sender contract (`send-payment-confirmed.server.ts`)

```ts
export interface SendPaymentConfirmedArgs {
  paymentId: string;       // lead_payments.id (required, idempotency key)
  reportSnapshotId?: string | null; // optional override
}

export type SendPaymentConfirmedResult =
  | { ok: true; provider: "brevo" | "resend"; messageId: string | null }
  | { ok: false; reason: string };

export async function sendPaymentConfirmedEmail(
  args: SendPaymentConfirmedArgs,
): Promise<SendPaymentConfirmedResult>;
```

Internal flow (all inside one try/catch):

1. **Kill-switch check.** If `process.env.PAYMENT_CONFIRMATION_EMAIL_ENABLED?.trim().toLowerCase() !== "true"` → record `payment_confirmation_email_skipped` with `reason: "DISABLED_BY_FLAG"` and `metadata.payment_id`; return `{ ok: false, reason: "DISABLED_BY_FLAG" }`. **Default OFF** (any missing/empty/non-"true" value disables sending).
2. **Idempotency check.** Query `product_events` for an existing row with `event_type = 'payment_confirmation_email_sent'` AND `metadata @> { payment_id: <id> }`. If found → return `{ ok: false, reason: "ALREADY_SENT" }`. Same defensive `.contains("metadata", ...)` pattern used in `lead-magnet-sequence.server.ts::eventAlreadyEmitted`.
3. **Load payment row.** `lead_payments` by `id`. If missing or `status !== "paid"`, record `payment_confirmation_email_skipped` (reason `PAYMENT_NOT_FOUND` or `PAYMENT_NOT_PAID`) and exit.
4. **Load lead row.** `leads.email`, `first_name`, `name`. If no email → skip (`NO_EMAIL`).
5. **Build report URL.** Via `resolveReportUrl(handle, reportSnapshotId)`. If empty → skip (`NO_REPORT_URL`).
6. **Render template** via `renderPaymentConfirmed({...})` wrapped with `renderWithOverride("payment_confirmed", ...)` so the admin override system keeps working.
7. **Send** via `sendTransactionalEmail({ flowType: "payment-confirmed", to: email, leadId, handle, metadata: { payment_id } })`.
8. **On success** → `recordProductEvent("payment_confirmation_email_sent", { leadId, handle, metadata: { payment_id, product_code, amount_cents, currency, message_id, provider } })` and return ok.
9. **On failure** → `sendTransactionalEmail` already records `payment_confirmation_email_failed` (because we added it to `FLOW_FAILURE_EVENT`). We additionally enrich with `metadata.payment_id` via the `metadata` field passed into the sender so dedupe + audit work.
10. **Catch-all** logs to `console.error` and returns `{ ok: false, reason: "UNEXPECTED:..." }`. Never throws.

## 4. Webhook wire (additive only)

In `src/routes/api/public/eupago-webhook.ts`, inside the existing `if (normalized === "paid") { ... }` block, after `await recordProductEvent({ eventType: "payment_webhook_paid", ... })` and **before** `return new Response("ok", { status: 200 })`, add exactly:

```ts
// Fire-and-forget transactional confirmation email.
// Sender owns its own try/catch, kill-switch (PAYMENT_CONFIRMATION_EMAIL_ENABLED)
// and idempotency (product_events::payment_confirmation_email_sent dedup by payment_id).
// Failure here must never affect payment state, entitlement or webhook response.
void (async () => {
  try {
    const { sendPaymentConfirmedEmail } = await import(
      "@/lib/email/send-payment-confirmed.server"
    );
    await sendPaymentConfirmedEmail({ paymentId: row.id });
  } catch (err) {
    console.error("[eupago-webhook] payment_confirmed dispatch error", err);
  }
})();
```

That is the only edit to the webhook file. Status transition, `updated_at`, `grantEntitlement`, coupon redemption and `payment_webhook_paid` event remain byte-identical.

The webhook still re-runs on EuPago re-delivery, but the existing `if (row.status === "paid" && row.paid_at) return ok` short-circuits BEFORE this block, and the sender's own dedup is a second safety net.

## 5. Kill-switch behaviour (exact)

| `PAYMENT_CONFIRMATION_EMAIL_ENABLED` value | Behaviour |
|---|---|
| unset / empty / `"false"` / `"0"` / anything ≠ `"true"` (case-insensitive, trimmed) | **No send.** Skipped event recorded (`payment_confirmation_email_skipped`, reason `DISABLED_BY_FLAG`). |
| `"true"` (case-insensitive, trimmed) | Send attempted; subject to the other guards (idempotency, missing data). |

**Default: OFF.** No secret needs to be created. Brevo / Resend kill-switches still apply on top.

## 6. Idempotency event (exact)

- Sent event: `payment_confirmation_email_sent`
- Failed event: `payment_confirmation_email_failed` (added to `FLOW_FAILURE_EVENT` map)
- Skipped event: `payment_confirmation_email_skipped` (consistent with existing `lead_magnet_sequence_skipped` style)
- Idempotency key: `metadata.payment_id` on `payment_confirmation_email_sent`. Dedup query: `event_type = 'payment_confirmation_email_sent' AND metadata @> { payment_id: <id> }`.

## 7. Registry entry (preview)

In `src/lib/admin/email-template-registry.ts`:

- Extend `CATEGORY_LABELS` with `pagamento: "Pagamento"` and append `"pagamento"` to `CATEGORY_ORDER`.
- Extend `EmailTemplateKey` and `TEMPLATE_VARIABLES` with `payment_confirmed: ["firstName", "instagramHandle", "productName", "amountLabel", "paymentMethod", "paymentReference", "reportUrl"]`.
- Add entry:
  - `key: "payment_confirmed"`, `category: "pagamento"`, `wired: true`,
  - `wiredAt: "src/routes/api/public/eupago-webhook.ts (branch paid)"`,
  - `wiredNote: "Disparado pelo webhook EuPago após pagamento confirmado. Atrás do kill-switch PAYMENT_CONFIRMATION_EMAIL_ENABLED (default OFF). Idempotente por payment_id."`,
  - Preview sample: firstName "Frederico", handle "webhspt", productName "Relatório completo", amountLabel `"9,00\u00A0€"` (mocked string — does **not** flow back into pricing), paymentMethod "MB WAY", paymentReference "AP-2026-0142".

`/admin/email-lab` already iterates `EMAIL_TEMPLATES` and uses the preview API (`/api/admin/email-templates/:key/preview`) — no changes needed there.

## 8. Non-regression confirmations

- Prices: `src/lib/payments/products.ts` and `products.server.ts` are **not touched**. The email reads `amount_cents` + `currency` from the existing paid row and formats client-side.
- Checkout creation: untouched. No edits in `src/lib/payments/eupago.server.ts`, no edits in `src/routes/api/...` other than the additive `void` block in the webhook.
- Entitlements: `grantEntitlement` is called before the new `void` block — order preserved, no changes.
- Schema: no migration. `product_events.metadata` (jsonb) already accepts arbitrary keys.

## 9. Manual validation checklist (post-merge, before flipping the flag ON)

1. **Kill-switch OFF (default).** With `PAYMENT_CONFIRMATION_EMAIL_ENABLED` unset, simulate a paid webhook re-delivery in staging → `lead_payments.paid_at` unchanged, entitlement unchanged, `product_events` shows `payment_confirmation_email_skipped` with `reason: DISABLED_BY_FLAG`. No outgoing Brevo/Resend HTTP call.
2. **Kill-switch ON.** Set the env to `"true"` in staging; replay a paid webhook → exactly one `payment_confirmation_email_sent` event with `metadata.payment_id = <row.id>`. Replay again → second insert short-circuits with `ALREADY_SENT` (no second send).
3. **Missing optional fields.** Manually call the sender against a paid row with no `metadata.payment_method` and no `provider_reference`/`provider_payment_id` → rendered HTML omits those rows; no `undefined`/`null` placeholders in the inbox preview (inspect via `/admin/email-lab` preview override).
4. **Webhook non-regression.** With the flag both OFF and ON, confirm the webhook still returns 200, `lead_payments.status = 'paid'`, exactly one `lead_entitlements` row, and `payment_webhook_paid` event is present (sender failure cannot break any of these).
5. **Live payment test stays deferred.** This step does **not** unblock the deferred real 9€ test — that gate (`docs/BETA_RUNBOOK.md` checklist) remains in place.

## 10. Risks & follow-up

- **Idempotency race**: the dedup lookup is not transactional. If two webhook re-deliveries hit within the same hundred-millisecond window before the first insert lands, both could pass the check. Mitigated by EuPago's natural inter-delivery gap and by the existing `row.status === "paid"` short-circuit; if duplicates are observed in production logs, follow up with a partial unique index on `product_events (event_type, (metadata->>'payment_id'))` — schema-level change requiring a separate plan and approval.
- **`payment_method` storage**: the current EuPago checkout flow does not consistently persist the chosen method into `lead_payments.metadata.payment_method`. Until that field is populated upstream, the row will simply be hidden in the email. No code change requested here; flagged for the future "EuPago metadata enrichment" pass.
- **Snapshot URL freshness**: `resolveReportUrl(handle, null)` returns a handle-based URL that may show the current latest snapshot rather than the one paid for. Acceptable for now; future improvement is to persist the paid snapshot id on `lead_payments.metadata` and pass it into the sender.

Ask for approval before switching to build mode.
