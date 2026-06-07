# Audit — créditos após `report_full_9` pago

Apenas leitura. Nada foi alterado em código, BD ou EuPago.

## 1. Ficheiros inspecionados

- `src/routes/api/public/eupago-webhook.ts` — receiver do webhook EuPago.
- `src/lib/payments/entitlements.server.ts` — `grantEntitlement` (unique `lead_id+product_code`).
- `src/lib/credits/credits.server.ts` — `grantInitialCredits` (+2), `grantPostPurchaseBetaCredits` (+2), reserve/confirm/release.
- `src/routes/api/onboarding/start.ts` — chama `grantInitialCredits(leadId)` na criação do lead (linha 350).
- `src/lib/email/send-payment-confirmed.server.ts` — sender (kill-switch `PAYMENT_CONFIRMATION_EMAIL_ENABLED`, default OFF; idempotente por `product_events.payment_confirmation_email_sent` + `metadata.payment_id`).
- `src/lib/email/templates/payment-confirmed.ts` — copy do email.
- `src/components/report-redesign/v2/report-block-nav.tsx` — chip de saldo na sidebar (`getMyCreditBalance`).

## 2. Comportamento atual no `paid` branch do webhook

Ordem dentro de `normalized === "paid"`:

1. **Short-circuit idempotente:** se `row.status === 'paid' && row.paid_at` → devolve `ok` sem fazer nada.
2. `UPDATE lead_payments SET status='paid', paid_at=now()`.
3. `grantEntitlement(...)` → insert em `lead_entitlements` (idempotente por unique `(lead_id, product_code)`, swallow do `23505`).
4. `enqueuePaidEnrichmentsForPayment(...)` — best-effort, sem créditos.
5. **`grantPostPurchaseBetaCredits({ leadId, paymentId })` → `credit_ledger` +2** com `reason='admin_adjust'`, `metadata={ kind:'post_purchase_beta_bonus', payment_id }`. Idempotência **aplicacional**: `SELECT … WHERE reason='admin_adjust' AND metadata->>kind=… AND metadata->>payment_id=…` antes do insert. Em sucesso emite `product_events.credits_post_purchase_granted` com `delta:2`.
6. Coupon redemption se aplicável.
7. `product_events.payment_webhook_paid`.
8. Fire-and-forget `sendPaymentConfirmedEmail({ paymentId })` — só dispara se `PAYMENT_CONFIRMATION_EMAIL_ENABLED='true'`.

## 3. Créditos hoje vs regra pretendida

| Origem | Quando | Delta | Reason / metadata | Idempotência |
|---|---|---|---|---|
| `grantInitialCredits` | criação do lead (`/api/onboarding/start`) | **+2** | `initial_grant` | unique parcial `uniq_credit_ledger_initial_grant` |
| `grantPostPurchaseBetaCredits` | webhook `paid` | **+2** | `admin_adjust` + `kind=post_purchase_beta_bonus` + `payment_id` | aplicacional (SELECT antes do INSERT) |
| "1 crédito incluído na compra" | — | **NÃO EXISTE** | — | — |

**Saldo efetivo após pagamento (cenário típico, lead que já passou pelo onboarding):**

- Onboarding: já tinha +2 (`initial_grant`).
- Pagamento: +2 (`post_purchase_beta_bonus`).
- Crédito "incluído na compra": **0**.
- Total no ledger ≈ saldo prévio (potencialmente já gasto) + 2.

A regra comercial pretendida ("1 incluído + 2 bónus = 3 ao pagar") **não está implementada**. Não há nenhum ledger row com `reason` tipo `purchase_included` ou equivalente atado ao `payment_id` com `delta=1`.

## 4. Comunicação ao utilizador

### Email `payment_confirmed`
- **Kill-switch OFF por default** (`PAYMENT_CONFIRMATION_EMAIL_ENABLED`). Em produção, se a flag não estiver `'true'`, o email **não é enviado** e é registado `payment_confirmation_email_skipped` com `reason=DISABLED_BY_FLAG`.
- Quando enviado, inclui um card "Oferta beta desbloqueada": *"Como estamos em beta, oferecemos 2 créditos adicionais para explorares mais o relatório. Podes usá-los para gerar outro período ou adicionar concorrentes."* (HTML linha 119, texto linha 165).
- **Não menciona** "1 incluído na compra". Só fala dos 2 bónus. O card é incondicional (não verifica se o grant correu).

### Plataforma (UI)
- Sidebar do report (`report-block-nav.tsx`) mostra `nav.explore.beta_credits_available { count: balance }` quando há saldo, ou `nav.explore.beta_credits_empty` quando 0. Saldo lido de `getMyCreditBalance` (RPC `credit_balance`).
- **Não há copy "1 incluído + 2 bónus beta"** em nenhum lado da UI pós-pagamento (sem toast, sem confirmação, sem breakdown).

## 5. Veredicto

**FAIL parcial.** Resumo:

- ✅ Entitlement `report_full_9` é atribuído de forma idempotente após `paid`.
- ✅ +2 bónus beta atribuídos após `paid` (idempotente por `payment_id`).
- ❌ **+1 crédito incluído na compra não existe** — nem no ledger nem no email/UI.
- ❌ Saldo total pretendido **3 créditos pós-pagamento** não acontece (atribuímos só +2).
- ❌ Email **não diferencia** "1 incluído + 2 bónus" e por defeito **não é enviado** (kill-switch).
- ❌ UI **não explica** a origem dos créditos.

## 6. Riscos / observações

1. **Idempotência do bónus pós-compra é aplicacional**, não DB-level. Janela de race entre `SELECT` e `INSERT` se dois webhooks chegarem em simultâneo *antes* do `UPDATE status='paid'` do passo 2. Mitigado na prática pelo short-circuit `row.status === 'paid'` no topo do branch, mas só funciona depois do primeiro UPDATE commitar. Recomenda-se índice parcial único em `credit_ledger((metadata->>'payment_id')) WHERE reason='admin_adjust' AND metadata->>'kind'='post_purchase_beta_bonus'`.
2. **Leads antigos** já receberam `initial_grant=+2` no onboarding. Ao pagar, ficarão hoje com `(2 - consumido) + 2`. Se introduzirmos `+1 purchase_included`, esses leads passam para `… + 1 + 2 = +3` adicionais — alinhado com a intenção (o `initial_grant` é um eixo de onboarding separado).
3. **QA manual** com `admin_adjust` não usa `kind=post_purchase_beta_bonus` + `payment_id`, por isso não colide com o idempotency check do bónus. Mas o **breakdown na UI/email** vai precisar de distinguir os vários `reason/kind` para conseguir explicar "incluído na compra" vs "bónus beta" vs "ajuste admin".
4. **Email desligado por default**: o utilizador que paga hoje em produção **não recebe** confirmação a menos que `PAYMENT_CONFIRMATION_EMAIL_ENABLED` esteja `'true'`. Mesmo ligando, copy atual menciona apenas 2 bónus.
5. **Snapshot da UI**: o saldo na sidebar pode mostrar `count=4` (2 onboarding sobreviventes + 2 bónus) sem qualquer breakdown — confuso para o utilizador que esperava ler "1 incluído + 2 bónus".

## 7. Plano de implementação recomendado (a aprovar separadamente)

1. **Ledger** — nova função `grantPurchaseIncludedCredit({ leadId, paymentId, productCode })`:
   - Insert `delta=+1`, `reason='admin_adjust'` (ou novo enum `purchase_included` se for aceitável tocar no domínio de `reason`), `metadata={ kind:'purchase_included', payment_id, product_code }`.
   - Idempotência: índice parcial único em `(metadata->>'payment_id') WHERE metadata->>'kind'='purchase_included'`. Aplicar o mesmo índice ao `post_purchase_beta_bonus` (resolve risco 1).
2. **Webhook** — chamar `grantPurchaseIncludedCredit` antes de `grantPostPurchaseBetaCredits` no branch `paid`, com o mesmo padrão try/catch isolado e `product_events.credits_purchase_included_granted`.
3. **Email** — atualizar `payment-confirmed.ts`:
   - Aceitar `creditsIncluded: number` e `creditsBetaBonus: number` no input.
   - Card "Créditos adicionados à conta": *"Incluímos 1 crédito na compra e, por esta fase beta, adicionámos 2 créditos extra. Saldo: 3 créditos."*
   - Render do card só quando `creditsIncluded > 0` (futuro-proof).
   - `send-payment-confirmed.server.ts` lê os deltas reais do ledger (filtrando por `payment_id`) em vez de hard-codar.
4. **UI** — sidebar / página pós-pagamento mostrar breakdown numa tooltip ou linha auxiliar: "1 incluído na compra · 2 bónus beta · X de onboarding".
5. **Backfill** — leads que já pagaram antes desta mudança: script idempotente que percorre `lead_payments WHERE status='paid' AND product='report_full_9'` e chama `grantPurchaseIncludedCredit`. Não dispara email retroativo.
6. **Email kill-switch** — separar a discussão: ativar `PAYMENT_CONFIRMATION_EMAIL_ENABLED=true` é decisão à parte mas necessária para a comunicação ser efetiva. Não ligar como parte deste PR sem aprovação explícita.

## 8. Próximo prompt de implementação (NÃO executar)

> Implementa o crédito "+1 incluído na compra" para `report_full_9`:
> 1. Migration: índice parcial único em `credit_ledger((metadata->>'payment_id'))` `WHERE reason='admin_adjust' AND metadata->>'kind' IN ('purchase_included','post_purchase_beta_bonus')`.
> 2. `src/lib/credits/credits.server.ts`: adicionar `grantPurchaseIncludedCredit({ leadId, paymentId, productCode })` com delta=+1, `metadata.kind='purchase_included'`, idempotente.
> 3. `src/routes/api/public/eupago-webhook.ts`: chamar essa função no branch `paid` *antes* de `grantPostPurchaseBetaCredits`, isolado em try/catch, e emitir `product_events.credits_purchase_included_granted`.
> 4. `src/lib/email/templates/payment-confirmed.ts` + sender: ler os dois deltas reais do `credit_ledger` por `payment_id` e mostrar card "Incluímos 1 crédito na compra e adicionámos 2 créditos beta. Saldo: N créditos."
> 5. UI sidebar: adicionar breakdown opcional via tooltip no chip de créditos, alimentado por um endpoint server-fn que devolve `{ included, betaBonus, initialOnboarding, adjustments, total }`.
> 6. Backfill: script idempotente para pagamentos já marcados `paid` sem `purchase_included` no ledger.
> 7. Testes: estender `credits.test.ts` e `eupago-webhook` (cobertura de idempotência por `payment_id` em retries).
> Não alterar checkout, preços, EuPago, kill-switch do email, nem schema fora do índice indicado.
