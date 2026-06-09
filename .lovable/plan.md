# Diagnóstico — fluxo "Sem créditos disponíveis"

## 1. Componente que renderiza o modal

`src/components/report-redesign/v2/consume-credit-dialog.tsx` — único modal "Sem créditos disponíveis / Pedir mais créditos". Montado em duas posições por `src/components/report-redesign/v2/report-block-nav.tsx` (linhas ~998 e ~1156, ambos os ramos `premiumUnlocked`).

## 2. Condição que o dispara

O modal abre sempre que o utilizador Pro clica num chip de período (30d/90d, `onPeriodPaidClick`) ou em "Adicionar concorrente" (`onAddCompetitor`). O ramo "Sem créditos" é escolhido dentro do componente pela condição:

```
const hasCredit = balance >= 1;
// …
hasCredit ? <CTA consumir 1 crédito> : <CTA "Pedir mais créditos">
```

`balance` vem do `getBalance(leadId)` → soma do `credit_ledger` via RPC `credit_balance`. Quando o saldo é 0 o estado "empty" é exibido com `empty_title` / `empty_body` / `empty_cta`.

## 3. Para onde vai hoje a "Pedir mais créditos"

**Não vai a lado nenhum.** No componente o handler é:

```tsx
onClick={() => { onOpenChange(false); onEmptyFeedback?.(); }}
```

Ambas as call-sites em `report-block-nav.tsx` **não passam** `onEmptyFeedback`. Resultado: o botão fecha o modal silenciosamente. Não há ligação ao checkout, nem ao €9 Pro, nem a qualquer pack de créditos. É um dead-end.

## 4. Checkout suporta tipos de compra diferentes?

Apenas indiretamente, via `product_code` no schema de `createEupagoCheckout` (`src/lib/payments/eupago.functions.ts`). Hoje só existem dois SKU no catálogo (`src/lib/payments/products.ts` + `products.server.ts`):

- `report_full_9` — €9 desbloqueio Pro
- `authority_diagnosis_97` — €97 upsell

Não existe SKU de "pack de créditos". A rota `/checkout/report-full` está hard-coded para `SOURCE_PRODUCT = "report_full_9"`.

## 5. Como o EuPago identifica o produto

Em `createEupagoCheckout` (function) é inserida uma linha em `lead_payments` com `product: product.code`, `amount_cents`, `currency`, `report_cache_key`, `metadata.source_product/final_product`. O `internalPaymentId` (UUID da linha) é passado como `identifier` no provider call (`src/lib/payments/eupago.server.ts`). É a única chave que viaja para o EuPago para depois reconciliar o webhook.

## 6. Como o webhook concede entitlements e créditos

`src/routes/api/public/eupago-webhook.ts`:

1. Verifica HMAC.
2. Reconcilia a linha por `provider_payment_id` ou `identifier`.
3. Quando `paid`:
   - `lead_payments.status = paid`.
   - `grantEntitlement({ leadId, productCode })`.
   - Pipeline de enriquecimentos pagos + comment scraping (best-effort).
   - **Se `product === "report_full_9"`**: chama `grantPurchaseIncludedCredit` (+1, idempotente por `payment_id` + `metadata.kind="purchase_included_credit"`) e `grantPostPurchaseBetaCredits` (+2, idempotente por `payment_id` + `metadata.kind="post_purchase_beta_bonus"`). Total = 3.
   - Redime cupão e envia email de confirmação.

Não há ramo no webhook para um SKU de "credit pack".

## 7. `credit_ledger` consegue distinguir tipos?

Sim, mas implicitamente. O `reason` é um enum (`initial_grant | reserve | confirm | release | admin_adjust`). Os créditos pós-compra usam **`reason = 'admin_adjust'`** com `metadata.kind` (`purchase_included_credit`, `post_purchase_beta_bonus`) e `metadata.payment_id`. Reserva/consumo usam `reason='reserve'/'confirm'/'release'` com `reservation_id`, `cache_key`, `analysis_event_id`.

Implicações:
- Distinguir "incluído no Pro inicial" vs "pack comprado depois" requer **outro `metadata.kind`** (p.ex. `credit_pack_purchased`).
- O esquema actual é suficiente — não obriga migração se reutilizarmos `reason='admin_adjust'` com novo `kind`.
- A admin observability (`src/routes/api/admin/lead-credit-activity.$id.ts`) já lê o ledger e o `metadata`, basta passar a discriminar o novo `kind` no agregador.

## 8. Volta o user à acção após pagamento?

Parcialmente. O checkout aceita `?return=<path>` (validado por regex) e usa-o como `successUrl/failUrl/backUrl` no provider. O modal de créditos **não** envia hoje nenhum `return` nem `intent` (período/concorrente), portanto mesmo que o botão fosse ligado ao checkout o utilizador voltaria à rota do report mas a acção original (ex.: gerar 90d) **não seria re-disparada**. Não existe nenhuma "pending intent" persistida entre pré-pagamento e regresso.

## 9. Mudanças necessárias para credit packs (alto nível)

1. **Catálogo**: adicionar SKU(s) `credit_pack_*` em `products.ts` (label, preço público) e `products.server.ts` (`amount_cents`, descrição). Manter `exposed` desligado se quisermos lançar só via modal.
2. **Modal**: passar `onEmptyFeedback` que abre um sub-fluxo "comprar créditos" — pode ser dialog inline com escolha de pack ou navegação directa para nova rota `/checkout/credits`.
3. **Rota de checkout**: nova `/checkout/credits` (espelha `report-full.tsx`) ou tornar `checkout.report-full` agnóstica via `?product=`. Recomendado: rota dedicada para isolar billing e copy. Reutiliza `createEupagoCheckout` passando `product_code`.
4. **Pending intent**: persistir a intenção (período/competitor/handle/return_path) antes de redirecionar para checkout, e re-aplicá-la quando o user volta com `?status=success`. Opções:
   - cookie HttpOnly de curta duração;
   - `report_cache_key` + query param `intent=...&return=/analyze/<handle>`.
5. **Webhook**: novo ramo `if (product startsWith "credit_pack_")` → `grantCreditPack({ leadId, paymentId, amount, kind: "credit_pack_purchased" })`. Reutiliza `credit_ledger.reason='admin_adjust'` + `metadata.kind` para idempotência e admin. Não conceder bónus beta.
6. **Admin**: actualizar `lead-credit-activity` e os widgets de Visão Geral para mostrar três buckets: `initial_pro` (purchase_included+beta), `pack_purchased`, `consumed` (reserve líquido).
7. **Tracking**: novos `product_events`: `credits_pack_checkout_created`, `credits_pack_granted`, `credits_pack_redirect_resumed`.
8. **Testes**: adicionar cobertura para o novo `grantCreditPack` (idempotência), webhook ramo pack, modal abrir checkout e resume-after-payment.

## Fluxo actual vs alvo

```text
ACTUAL
[chip 30d / concorrente] → ConsumeCreditDialog
   ├─ balance≥1 → consume 1 → fetch
   └─ balance=0 → "Pedir mais créditos" → onOpenChange(false)  ← DEAD END

ALVO
[chip 30d / concorrente] → ConsumeCreditDialog
   ├─ balance≥1 → consume 1 → fetch
   └─ balance=0 → "Comprar pack" → /checkout/credits?return=/analyze/<h>&intent=…
                       → EuPago → webhook (grantCreditPack)
                       → redirect back → auto re-trigger acção pendente
```

## Risco

- Reutilizar `report_full_9` para packs gera duplo grant (purchase_included + beta). Tem de ser SKU separado.
- Sem persistir o `intent`, o user volta e clica de novo — UX má mas seguro (a compra já foi creditada).
- O `return` param é validado por regex; expandir o conjunto de chars se a intent precisar de payload base64.
- Cupões: a tabela `payment_coupons` está associada a `product` — confirmar se queremos cupões para packs ou bloquear.
- Webhooks retroactivos: garantir idempotência por `(payment_id, kind)` para evitar duplo crédito.

## Ficheiros afectados (na implementação futura)

- `src/components/report-redesign/v2/consume-credit-dialog.tsx`
- `src/components/report-redesign/v2/report-block-nav.tsx`
- `src/lib/payments/products.ts` + `products.server.ts`
- `src/routes/checkout.credits.tsx` (novo) ou refactor de `checkout.report-full.tsx`
- `src/lib/payments/eupago.functions.ts` (input schema aceita novo SKU; nada mais a mudar)
- `src/routes/api/public/eupago-webhook.ts` (novo ramo `credit_pack_*`)
- `src/lib/credits/credits.server.ts` (novo `grantCreditPack`)
- `src/lib/tracking.server.ts` (event types)
- `src/routes/api/admin/lead-credit-activity.$id.ts` + componentes admin
- `src/i18n/locales/{pt,en}/report.json` + `errors.json`
- Testes: `credits.test.ts`, novo teste webhook, teste do modal/resume

## Plano de implementação (sequencial)

1. **Catálogo** — adicionar SKU(s) `credit_pack_1`/`credit_pack_5` (definir preços com o owner antes de mexer).
2. **`grantCreditPack`** em `credits.server.ts` (idempotente por payment+kind) + testes unitários.
3. **Webhook** — ramo para `product startsWith "credit_pack_"` chamando `grantCreditPack`, sem bónus beta, sem enrichments (já tem o snapshot pago). Testes de idempotência.
4. **Checkout route** — `/checkout/credits` (clone enxuto de `report-full`, sem upsell/priority/goals; só billing minimal + summary).
5. **Modal** — ligar `onEmptyFeedback` (ou novo prop `onBuyCredits`) que navega para `/checkout/credits?return=<rota actual>&product=credit_pack_X` + abrir summary inline antes da redirect.
6. **Resume after payment** — guardar intent em cookie/localStorage antes do redirect; ao voltar com `status=success` e saldo>0, re-disparar o `onConfirmConsume` original.
7. **Admin + tracking** — novos buckets e eventos.
8. **i18n + copy** — remover "Pedir mais créditos" dead-end, substituir por "Comprar pack" e copy com preço.
9. **Regressão** — typecheck + `bun test` nos suites de credits, webhook, analyze-public-v1 credit gate.

Aguardo aprovação (e definição de SKU/preços dos packs) para passar a Edit Mode.
