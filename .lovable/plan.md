# Packs de crédito públicos (3/10/25) + modal "Sem créditos" action-aware

## Decisões de produto

- **Substituir** `credit_pack_1` (1 pago + 2 bónus oculto) por três packs públicos com quantidade anunciada igual à concedida:
  - `credits_3` — 3 créditos · 9€
  - `credits_10` — 10 créditos · 25€
  - `credits_25` — 25 créditos · 49€
- Default selecionado: `credits_3`.
- Pós-pagamento: regresso manual ao relatório (toast + saldo actualizado), sem re-disparo automático.
- O kind `credit_pack_launch_bonus` deixa de ser escrito; mantém-se em `credits.server.ts` apenas como constante referenciada por queries históricas, para não partir dashboards do passado.
- `report_full_9` mantém-se inalterado (continua a conceder Pro + `purchase_included_credit` +1 + `post_purchase_beta_bonus` +2 = 3 créditos iniciais).

## Fluxo alvo

```text
Pro com 0 créditos clica chip 30d/90d, concorrente ou fresh
        │
        ▼
Modal "Sem créditos" com copy ciente da acção (period_change /
competitor_add / force_refresh / generic_pro_analysis):
  • lembra que Pro está activo
  • explica que esta acção exige 1 crédito
  • esclarece que abrir cache não consome
  • CTA único: "Comprar créditos"
        │
        ▼
/checkout/credits?return=<rota>&intent=<intended_action>&pack=credits_3
  • Selector dos 3 packs (default credits_3)
  • Resumo + dados de facturação
  • Submit envia { purchase_type='credits_pack', pack_id,
    credits_quantity, amount_eur, intended_action, username, return_url }
        │
        ▼
EuPago → webhook valida HMAC, identifica pack pelo `product`,
chama grantCreditPack(amount=N) idempotente por payment_id.
Não toca em entitlements Pro, não dispara enrichments.
        │
        ▼
/checkout/credits?status=success&return=<rota>&pack=<pack_id>
  • Toast "Créditos adicionados com sucesso"
  • Polling do saldo até bater no esperado (≤10s)
  • CTA "Voltar ao relatório" → utilizador clica de novo manualmente
```

## Passos de implementação

### 1. Catálogo de produtos

- `src/lib/payments/products.ts`: adicionar `credits_3`, `credits_10`, `credits_25` em `PRODUCT_CODES`; `PUBLIC_PRODUCTS` com `namePt`, `priceLabel`, `priceNote` (todos `exposed: false` — só visíveis dentro do flow). Marcar `credit_pack_1` como deprecated mas manter no enum para back-compat dos pagamentos antigos.
- `src/lib/payments/products.server.ts`: `SERVER_PRODUCTS` com `amountCents` 900 / 2500 / 4900.

### 2. Migração DB

- `lead_payments.product` CHECK aceita os novos códigos (mantendo os antigos).
- `credit_ledger.metadata.kind = 'credit_pack_purchased'` continua a ser a única kind de receita; `pack_amount` no metadata reflecte a quantidade.

### 3. `getCreditPackAmount` + grant

Em `src/lib/credits/credits.server.ts`:
- `getCreditPackAmount` mapeia `credits_3 → 3`, `credits_10 → 10`, `credits_25 → 25`, mantém `credit_pack_1 → 1` (back-compat).
- `grantCreditPack` mantém-se idempotente por `(payment_id, kind)`; já aceita `amount` arbitrário.
- Deixar de chamar `grantCreditPackLaunchBonus` no webhook para os novos códigos; manter a função exportada mas sem call site activo.

### 4. Webhook EuPago (`src/routes/api/public/eupago-webhook.ts`)

- Branch `credit_pack_*` reconhece os três novos produtos via `getCreditPackAmount(product) != null`.
- Concede só `grantCreditPack` com o `amount` correcto; sem entitlement Pro, sem enrichments, sem bónus.
- `recordProductEvent('credits_pack_granted', { pack_id, credits_quantity, payment_id, amount_eur, intended_action })`.
- `report_full_9` continua exactamente como hoje (entitlement + included + beta bonus + enrichments).

### 5. Server fn de checkout (`src/lib/payments/eupago.functions.ts` / `eupago.server.ts`)

- `createEupagoCheckout` aceita os novos `product_code`s. O payload de criação grava em `lead_payments.metadata`:
  ```json
  {
    "purchase_type": "credits_pack",
    "pack_id": "credits_3",
    "credits_quantity": 3,
    "amount_eur": 9,
    "intended_action": "period_change",
    "username": "<handle>",
    "return_url": "<absolute>"
  }
  ```
- `return_path` ainda é o caminho relativo usado para o redirect EuPago.

### 6. Página `/checkout/credits` (`src/routes/checkout.credits.tsx`)

- Nova UI com **selector de 3 cards** (3 / 10 / 25 créditos), default `credits_3` lido de `?pack=` quando válido.
- Mostra preço por crédito calculado (ex.: "≈ 2,50€/crédito"), sem linguagem de desconto agressiva — só claridade.
- `?intent=` aceita `period_change | competitor_add | force_refresh | generic_pro_analysis` e é enviado ao server fn como `intended_action`.
- Painel de sucesso (`?status=success`) mantém o polling de saldo já implementado, mas adapta o texto para mencionar a quantidade comprada (ex.: "Saldo actualizado: 7 créditos").
- Toast/banner: "Créditos adicionados com sucesso".

### 7. Modal `consume-credit-dialog.tsx` (action-aware)

- Aceita prop `intent: 'period_change' | 'competitor_add' | 'force_refresh' | 'generic_pro_analysis'` (default `generic_pro_analysis`).
- Quando `!hasCredit && !atCompetitorLimit`, render:
  - **Título**: "Sem créditos disponíveis"
  - **Parágrafo 1 (action-specific)**:
    - period_change: "Esta análise de período exige uma nova recolha e consome 1 crédito."
    - competitor_add: "Adicionar este concorrente exige uma nova análise e consome 1 crédito."
    - force_refresh: "Forçar uma nova análise consome 1 crédito porque ignora o cache disponível."
    - generic_pro_analysis (default): "Esta acção exige uma nova análise Pro e consome 1 crédito."
  - **Parágrafo 2 (fixo)**: "O teu relatório Pro continua activo. Abrir análises em cache não consome créditos."
  - **CTA primário**: "Comprar créditos" → navega para `/checkout/credits?return=<rota>&intent=<intent>&pack=credits_3`.
  - **CTA secundário**: "Cancelar".
- Em `report-block-nav.tsx`, passar `intent` ao dialog conforme o origem do clique (chip 30d/90d → `period_change`; botão concorrente → `competitor_add`; "forçar nova" → `force_refresh`).

### 8. i18n (`src/i18n/locales/pt/report.json` + `en/report.json`)

Novas chaves em `nav.explore.consume_dialog`:
- `empty_title` (mantém)
- `empty_body_period_change`, `empty_body_competitor_add`, `empty_body_force_refresh`, `empty_body_generic`
- `empty_pro_active_note` ("O teu relatório Pro continua activo. Abrir análises em cache não consome créditos.")
- `empty_cta` = "Comprar créditos"
- `cta_cancel` (mantém)

Strings da página checkout/credits:
- `checkout.credits.pack_3_label`, `pack_10_label`, `pack_25_label`, `pack_3_note`, `pack_10_note`, `pack_25_note`
- `checkout.credits.success_toast` = "Créditos adicionados com sucesso"

### 9. Admin observability

- `src/lib/admin/lead-credit-activity.ts`: bucket `pack_purchased` mostra `pack_id`, `credits_quantity`, `amount_eur` lidos de `credit_ledger.metadata` + `lead_payments.metadata`.
- Admin de pagamentos: coluna mostra `pack_id` quando `purchase_type === 'credits_pack'`.
- `product_events`: `credits_pack_checkout_started`, `credits_pack_granted` incluem `pack_id`, `credits_quantity`, `amount_eur`, `intended_action`.

### 10. Testes (vitest)

- `credit-pack.test.ts`:
  - `getCreditPackAmount` mapeia 3/10/25 correctamente.
  - `grantCreditPack` com amount=3, 10, 25 escreve linha única + idempotência por payment_id.
- `eupago-webhook` (novo ou estendido):
  - Pack `credits_10` → +10 no ledger, sem entitlement, sem enrichments.
  - Re-entrega do mesmo `payment_id` não duplica.
  - `report_full_9` mantém comportamento (entitlement + 3 créditos + enrichments) — regressão.
- `checkout.credits` (smoke): selector default `credits_3`, click muda payload submetido com `pack_id` / `credits_quantity` / `amount_eur` / `intended_action`.
- `consume-credit-dialog`: cada `intent` rende a frase correcta; CTA navega para `/checkout/credits` com o `intent` correcto.

## Ficheiros afectados

- `src/lib/payments/products.ts`, `products.server.ts`
- `src/lib/payments/eupago.functions.ts`, `eupago.server.ts`
- `src/routes/api/public/eupago-webhook.ts`
- `src/lib/credits/credits.server.ts` (apenas `getCreditPackAmount`; sem novo call site para launch bonus)
- `src/routes/checkout.credits.tsx` (selector + intent + sucesso com quantidade)
- `src/components/report-redesign/v2/consume-credit-dialog.tsx`
- `src/components/report-redesign/v2/report-block-nav.tsx` (passar `intent`)
- `src/i18n/locales/pt/report.json`, `en/report.json`
- `src/lib/admin/lead-credit-activity.ts`, `tracking.server.ts`
- Migração SQL para `lead_payments.product` CHECK
- Testes em `src/lib/credits/__tests__/`, `src/lib/payments/__tests__/`, componente de modal/checkout

## Riscos / mitigação

- **Coexistência com `credit_pack_1` antigo**: mantemos o código no enum + mapeamento, mas sem CTA público. Pagamentos pendentes desse SKU continuam a funcionar.
- **Webhook idempotente**: já existe verificação `(payment_id, kind)`; novos packs reaproveitam o mesmo kind `credit_pack_purchased`.
- **`return` URL stale**: validar `startsWith('/')` (já implementado).
- **`intent` malformado**: server fn aceita enum estrito; valores desconhecidos caem em `generic_pro_analysis`.
- **Migrar copy sem partir testes existentes**: actualizar fixtures que referenciam "Comprar 1 crédito".

## Fora de scopo (confirmado)

- Sem alteração ao Pro inicial (`report_full_9`).
- Sem alteração às regras de cache, 30d/90d, concorrente, force_refresh.
- Sem alteração a enrichments visuais/comentários.
- Sem subscrições.
- Sem re-disparo automático da acção pendente.
- Sem manter o bónus oculto de lançamento nos novos packs.
