## Scope

Most post-purchase surfaces already render the surprise beta-bonus copy:

- `PostPurchaseSuccessPanel` in `src/routes/checkout.report-full.tsx` already shows the "Oferta beta desbloqueada" card with the exact spec copy.
- Sidebar paid-state credit balance is already rendered subtly via `getMyCreditBalance`.

The one remaining gap is the **payment-confirmed email**, which currently ends after the "pagamento único" reassurance card without mentioning the bonus.

## Change

Update `src/lib/email/templates/payment-confirmed.ts` to append a subtle "Oferta beta" info card after the reassurance card, in both HTML and plain-text bodies. Keep it calm and non-promotional.

### HTML (after `reassuranceCardHtml`)

A muted neutral card (similar style to receipt card, not the blue reassurance one) so it reads as a thoughtful footnote, not an upsell:

```
Title  (eyebrow): "Oferta beta desbloqueada"
Body:  "Como estamos em beta, oferecemos 2 créditos adicionais para explorares
        mais o relatório. Podes usá-los para gerar outro período ou adicionar
        concorrentes."
```

Background `#fafaf9`, border `#e7e5e4`, same radius/padding as the receipt card. No CTA button (the existing "Abrir relatório completo" already drives action).

### Plain text

Insert after the "Pagamento único…" line and before the signature:

```
— Oferta beta desbloqueada —
Como estamos em beta, oferecemos 2 créditos adicionais para explorares mais o relatório.
Podes usá-los para gerar outro período ou adicionar concorrentes.
```

### Why unconditional

`grantPostPurchaseBetaCredits` is called in `eupago-webhook` for every successful payment (no product gating), and the bonus is granted **before** `sendPaymentConfirmedEmail` runs, so every payment-confirmed email today corresponds to a payment whose lead just received +2 credits. Including the card unconditionally matches reality and avoids touching the sender/webhook.

If later the grant becomes product-scoped, we can add an optional `showBetaBonus?: boolean` input — but not now (don't change sender today).

## Files to edit

- `src/lib/email/templates/payment-confirmed.ts` — append HTML card + text block.
- `src/lib/email/__tests__/payment-confirmed.test.ts` — extend existing snapshot/assertions to cover the new lines.

## Not changed

Product price, payment amount, EuPago payloads, webhook logic, idempotency, kill-switch, sender (`send-payment-confirmed.server.ts`), entitlement, `grantPostPurchaseBetaCredits`, report generation, DB schema, pre-purchase pricing modal, `PostPurchaseSuccessPanel`, sidebar paid-state, `PremiumInterestDialog`.

## Risks & safeguards

- **Risk**: email might be sent for a future product that doesn't grant credits. **Mitigation**: today there's no such case; if introduced later, add an optional `showBetaBonus` prop and gate the section. Document in code comment.
- **Risk**: card reads as marketing. **Mitigation**: muted neutral palette, no CTA, no exclamation, sentence-case body.
- **Risk**: snapshot tests break. **Mitigation**: update them in the same patch.

## Manual validation checklist

1. Pre-purchase pricing modal (`PremiumInterestDialog`) shows no mention of beta credits.
2. Post-purchase `?status=success` view shows the "Oferta beta desbloqueada" card (already in place).
3. Payment-confirmed email renders: greeting → lead sentence → receipt card → CTA → reassurance card → **Oferta beta card** → signature.
4. Plain-text version contains "Oferta beta desbloqueada" section.
5. Dynamic fields (`productName`, `amountLabel`, `paymentMethod`, `paymentReference`, `reportUrl`, `firstName`, `instagramHandle`) still render correctly.
6. No changes in EuPago webhook, payment sender, entitlement grant, or DB.
7. `bun test src/lib/email/__tests__/payment-confirmed.test.ts` passes.

Approve to implement.