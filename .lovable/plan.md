## Scope

Touch ONLY:
- `src/lib/email/templates/payment-confirmed.ts` (copy + reassurance card + signature)
- `src/lib/email/__tests__/payment-confirmed.test.ts` (NEW)

Nothing else is edited. No changes to:
- `send-payment-confirmed.server.ts` (sender)
- `routes/api/public/eupago-webhook.ts` (webhook, idempotency, kill-switch)
- `transactional-email.server.ts`
- `shared.ts` (the global `signatureHtml` keeps using "equipa AuditProfiles" for all other templates — we override locally only)
- `email-template-registry.ts` (no metadata changes needed; subject + display unchanged)
- prices, EuPago payloads, credits, entitlements, report generation, schema

## Changes in `payment-confirmed.ts`

### 1. Main confirmation sentence (replaces the current "Obrigado{,name}. O relatório completo de … está desbloqueado e fica guardado na tua conta." paragraph)

- With handle:
  `O relatório completo de <strong>@{handle}</strong> está desbloqueado — com acesso vitalício às 6 secções.`
- Fallback (no handle):
  `O relatório completo está desbloqueado — com acesso vitalício às 6 secções.`

Greeting line stays as today (`greetingHtml(firstName)` / `greetingText`). The "Obrigado{, name}" sentence is removed from the body — the new signature carries the thanks.

### 2. Reassurance info card (replaces the two `pMuted(...)` paragraphs below the CTA)

New light-blue info card, inline-styled, mobile-safe, matching premium email pattern:

```html
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
  style="background-color:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;margin:0 0 20px 0;">
  <tr>
    <td style="padding:14px 18px;">
      <p style="margin:0;font-size:14px;line-height:1.55;color:#1e3a8a;
        font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
        Pagamento único, sem subscrição nem renovação automática.
        O relatório fica guardado na tua conta.
      </p>
    </td>
  </tr>
</table>
```

Plain-text equivalent: a single line
`Pagamento único, sem subscrição nem renovação automática. O relatório fica guardado na tua conta.`

The standalone "Qualquer questão sobre o pagamento ou o relatório, responde a este email." line is removed (absorbed into the signature flow — keeps email lean and closer to the mockup).

### 3. Signature (local override, NOT shared)

Inline in this template only, do not edit `shared.ts`:

HTML:
```html
<p style="margin:24px 0 0 0;font-size:14px;line-height:1.6;color:#57534e;
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  Obrigado pela confiança,<br/>
  Frederico · AuditProfiles
</p>
```

Plain text:
```
Obrigado pela confiança,
Frederico · AuditProfiles
```

Stop calling `signatureHtml` / `signatureText` in this template; remove those two imports if they become unused.

### 4. Receipt card — unchanged

`receiptRowHtml` / `receiptTotalRowHtml` / row order / optional method + reference fields stay exactly as they are. All values continue to flow from `PaymentConfirmedInput` (no hardcoded price, method, reference, or product).

### 5. Subject, preheader, headline, dark navy header (via `wrapHtml`)

Unchanged.

## New tests — `src/lib/email/__tests__/payment-confirmed.test.ts`

Vitest, mirroring `report-saved.test.ts` style. Cases:

1. **Full data** (handle + method + reference) renders:
   - subject equals `"Pagamento confirmado — relatório completo desbloqueado"`
   - HTML contains `@webhspt`, `acesso vitalício às 6 secções`, the info-card text, `Obrigado pela confiança,`, `Frederico · AuditProfiles`, `9,90 €` (the passed amount), product name, method, reference, CTA `Abrir relatório completo`.
   - text body contains same key strings.
2. **No handle** → uses the "O relatório completo está desbloqueado — com acesso vitalício às 6 secções." fallback and does not contain `@undefined` / `@null` / `@ `.
3. **No method, no reference** → renders without throwing, output does NOT contain `Método de pagamento` or `Referência`.
4. **No hardcoded price** → render with `amountLabel: "1,23 €"` and assert `1,23 €` appears AND no occurrence of `9,90` / `9,00` / hardcoded `€` totals other than the passed value (regex: count of `€` matches receipt rows only).
5. **No unresolved placeholders** → reuse `assertNoBrokenPlaceholders` (no `{{`, no `undefined`, no `>null<`).
6. **Info card present** → HTML matches `background-color:#eff6ff` and the reassurance copy.
7. **Signature override** → HTML and text do NOT contain `equipa AuditProfiles`.

## Safety checklist (what does NOT change)

- Sender: `send-payment-confirmed.server.ts` untouched
- Webhook: `routes/api/public/eupago-webhook.ts` untouched
- Kill-switch `PAYMENT_CONFIRMATION_EMAIL_ENABLED` untouched
- Idempotency key generation untouched
- Prices, payment amounts, checkout, EuPago payloads untouched
- Credits, entitlements, report generation untouched
- Database schema untouched
- Admin automations / registry metadata untouched
- Other templates' signatures keep using the shared "equipa AuditProfiles" — override is local

## Manual preview checklist (after implementation)

In `/admin/email-lab`, select `payment_confirmed`:
1. Subject still `"Pagamento confirmado — relatório completo desbloqueado"`.
2. Greeting + new "acesso vitalício às 6 secções" sentence visible.
3. Receipt card shows Produto / Valor pago / (Método) / (Referência) / Total from preview data.
4. Blue info card visible below CTA with the reassurance copy.
5. Signature reads "Obrigado pela confiança, / Frederico · AuditProfiles".
6. Preview with handle missing → fallback sentence renders, no `@undefined`.
7. Preview with method/reference missing → those rows disappear cleanly.
8. Mobile width preview: info card, receipt card and CTA stack without overflow.

## Output to report after build

1. Files changed: 2 (template + new test file).
2. Confirm sender / webhook / kill-switch / idempotency untouched.
3. Confirm prices / payment amounts / checkout / EuPago / credits / entitlements / report generation / schema untouched.
4. Diff summary: new lead sentence, blue reassurance card replaces two muted paragraphs, local signature override, receipt logic intact.
5. Manual preview checklist above.
