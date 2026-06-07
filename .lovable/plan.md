## Objetivo

Após pagamento confirmado de `report_full_9`, atribuir automaticamente **+3 créditos** (1 incluído + 2 bónus beta), de forma idempotente, restrito a este produto, e refletir isso no email e no sidebar.

## Estado atual (relevante)

- `eupago-webhook.ts` no ramo `paid` já chama `grantEntitlement` e `grantPostPurchaseBetaCredits` (+2, idempotente por `payment_id`, `metadata.kind='post_purchase_beta_bonus'`).
- **Não existe** o "+1 incluído na compra".
- Bónus aplicado a **qualquer produto** pago — precisa ser restrito a `report_full_9`.
- Email `payment-confirmed.ts` já menciona "2 créditos adicionais"; precisa de passar a falar de 1+2 = 3.
- Sidebar lê saldo via `getMyCreditBalance` e mostra `nav.explore.beta_credits_available` — só precisa de copy refinada.

## Mudanças

### 1. `src/lib/credits/credits.server.ts`

- Adicionar constante `PURCHASE_INCLUDED_KIND = "purchase_included_credit"` e `PURCHASE_INCLUDED_AMOUNT = 1`.
- Nova função `grantPurchaseIncludedCredit({ leadId, paymentId, productCode })`:
  - Mesma estratégia de idempotência aplicacional do bónus beta: SELECT por `reason='admin_adjust'` + `metadata->>kind='purchase_included_credit'` + `metadata->>payment_id=<paymentId>`.
  - Insere `delta=+1`, `reason='admin_adjust'`, metadata: `{ kind, payment_id, product_code, source: "payment_confirmed", included_credits: 1 }`.
  - Devolve `{ granted: boolean }`.
- Atualizar `grantPostPurchaseBetaCredits` para aceitar `productCode` e enriquecer metadata: `{ kind, payment_id, product_code, source: "payment_confirmed", beta_bonus: true, bonus_credits: 2, included_credits: 1, total_granted: 3 }`. Mantém idempotência por `payment_id`.

### 2. `src/routes/api/public/eupago-webhook.ts`

No bloco `normalized === "paid"`, após `grantEntitlement` e antes do email:

- **Restringir** a atribuição de créditos a `row.product === "report_full_9"`. Para `authority_diagnosis_97` ou outros, saltar (mantém comportamento legado de não receber créditos).
- Chamar sequencialmente, dentro de try/catch isolado (não derruba webhook):
  1. `grantPurchaseIncludedCredit({ leadId, paymentId: row.id, productCode: row.product })`
  2. `grantPostPurchaseBetaCredits({ leadId, paymentId: row.id, productCode: row.product })`
- Registar `recordProductEvent` `credits_purchase_included_granted` e atualizar o evento `credits_post_purchase_granted` para incluir `total_granted: 3` quando ambos foram concedidos.

### 3. Email — `src/lib/email/templates/payment-confirmed.ts`

- Substituir o card "Oferta beta desbloqueada" por copy com a totalidade 1+2=3:
  > **Créditos ativados**
  > Além do acesso ao relatório completo, ativámos **3 créditos** na tua conta: 1 incluído na compra + 2 créditos extra por esta fase beta. Podes usá-los para testar novas janelas de análise ou adicionar concorrentes.
- Atualizar versão `text` em conformidade.
- Card é mostrado apenas quando `productName` corresponde ao relatório completo. Adicionar input opcional `creditsGranted?: { included: number; bonus: number } | null` em `PaymentConfirmedInput`; `send-payment-confirmed.server.ts` passa `{ included: 1, bonus: 2 }` apenas para `report_full_9`, `null` caso contrário (card omitido). Não introduz mudança visual para outros produtos.

### 4. Sidebar — `src/components/report-redesign/v2/report-block-nav.tsx` e i18n

- Atualizar string `nav.explore.beta_credits_available` (PT) para versão neutra que funcione para 3, 2 ou 1 crédito.
- Adicionar tooltip/aria opcional com a breakdown quando saldo = 3 imediatamente após compra: "1 incluído na compra + 2 bónus beta". Implementação simples: tooltip estático no hover do badge se `balance >= 3`. Sem nova chamada de rede.

### 5. Tests — `src/lib/credits/__tests__/credits-post-purchase.test.ts`

Estender o ficheiro existente (mesmo mock):

- `grantPurchaseIncludedCredit`: +1 ao saldo numa primeira chamada; segunda chamada com mesmo `payment_id` é no-op (saldo continua 1).
- Sequência combinada: incluído + bónus → saldo = 3 com 2 linhas no ledger; retry da sequência mantém saldo = 3.
- Pagamentos diferentes acumulam (3 + 3 = 6).

Novo ficheiro `src/routes/api/public/__tests__/eupago-webhook-credits.test.ts` (mock leve de `grantEntitlement`, `grantPurchaseIncludedCredit`, `grantPostPurchaseBetaCredits`, `recordProductEvent`, `enqueuePaidEnrichmentsForPayment` e `lead_payments`):

- `report_full_9` paid → grants chamados uma vez cada com `productCode='report_full_9'`.
- `authority_diagnosis_97` paid → **nenhum** dos dois grants é chamado.
- Status `expired` / `failed` / `pending` → grants nunca chamados.
- Re-entrega do mesmo webhook (segunda invocação) → grants chamados de novo mas devolvem `granted: false` (idempotência aplicacional já testada na suite de credits).

Email render test em `src/lib/email/templates/__tests__` (ou estender existente se houver):
- `report_full_9` com `creditsGranted={included:1,bonus:2}` → HTML/text contêm "3 créditos", "1 incluído", "2 créditos extra".
- Outro produto com `creditsGranted=null` → card ausente.

## Idempotência (resumo)

- Chave lógica por grant: `(lead_id, reason='admin_adjust', metadata.kind, metadata.payment_id)`.
- Verificada via SELECT pré-insert (mesmo padrão já em produção para o bónus beta).
- Webhook idempotente continua a beneficiar do early-return `row.status === 'paid' && row.paid_at`; mesmo se este falhar (race), os grants individuais são no-op.
- Sem nova migração de schema.

## O que NÃO muda

- Preços, montantes do checkout, request à EuPago, transição de estado de pagamento.
- Lógica de `grantEntitlement`, fluxo de cupões, enrichments pagos.
- Lógica do relatório gratuito, Apify, OpenAI, DataForSEO.
- Schema da BD (apenas metadata adicional dentro de `credit_ledger.metadata`).
- Backfill retroativo — apenas pagamentos futuros.

## Output ao terminar a implementação

- Lista de ficheiros alterados.
- Exemplo de linhas no `credit_ledger` para uma compra `report_full_9`.
- Estratégia de idempotência confirmada.
- Cópia exata adicionada ao email.
- Lista de testes adicionados + resultado.
- Confirmação de que nenhum montante ou request a EuPago foi alterado.
