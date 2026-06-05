Add a clear note to `docs/BETA_RUNBOOK.md` marking the EuPago 9€ live payment test as deferred, without blocking other product work.

### Where to add

1. **Section 0 (Estado atual e premissas)** — insert a new bullet under the existing list summarizing checkout readiness:
   - Checkout flow validated up to EuPago redirect (lead session, pending payment row, upsell split, metadata, no side-effect provider calls, no duplicates).
   - Real payment + webhook + entitlement + admin revenue validation **not yet executed**.

2. **New checklist before existing tester checklist** — insert after section 13 and before "Checklist ANTES de convidar um tester":
   ```
   ## Checklist ANTES de abrir CTAs de pagamento ao público

   - [ ] Realizar 1 pagamento real de 9€ (report_full_9) via EuPago
   - [ ] Validar estado pending → paid na tabela lead_payments
   - [ ] Confirmar que o webhook criou exatamente 1 entitlement para report_full_9
   - [ ] Verificar que o evento payment_webhook_paid existe na Timeline
   - [ ] Confirmar que não há chamadas a Apify/OpenAI/DataForSEO durante o webhook
   - [ ] Validar que a receita aparece em /admin/receita
   ```

### What is NOT changed

- No checkout code changes.
- No EuPago integration changes.
- No payment CTA changes.
- No schema or migration changes.
- No live payment test execution.

### Expected final status statement

Checkout ready up to EuPago redirect. Live payment/webhook/entitlement validation deferred to a future controlled test.