
# Multi-Report Purchase no Checkout — Diagnóstico e Plano

## 1. Mapa do estado atual

### O que `report_full_9` concede hoje (verificado em código)

Definido em `src/lib/payments/products.server.ts` (900 cents, EUR) e processado em `src/routes/api/public/eupago-webhook.ts` quando o status normaliza para `paid`:

1. **Entitlement** — `grantEntitlement(lead_id, "report_full_9", payment_id)` insere em `lead_entitlements`. Idempotente via unique `(lead_id, product_code)`.
2. **+1 crédito "incluído na compra"** — `grantPurchaseIncludedCredit` (`reason='admin_adjust'`, `metadata.kind='purchase_included_credit'`).
3. **+2 créditos bónus beta** — `grantPostPurchaseBetaCredits` (`metadata.kind='post_purchase_beta_bonus'`). Total pós-compra = **3 créditos**.
4. **Enrichments pagos** — `enqueuePaidEnrichmentsForPayment({ reportCacheKey })` corre DataForSEO + OpenAI insights + visual_cover + caption_semantic no snapshot daquele `report_cache_key`.
5. **Comment scraping** — `enqueueCommentScrapingForPayment({ reportCacheKey })`.
6. **Email transacional** `sendPaymentConfirmedEmail` (idempotente por `payment_id`).

### Âmbito do entitlement (crítico)

`getMyReportEntitlement` (`entitlements.functions.ts`) chama `hasEntitlement(leadId, "report_full_9")` — **booleano global ao lead**, não por handle/cache_key. Resultado: comprar `report_full_9` desbloqueia o flag premium para **qualquer** relatório que o lead gere. O "10 relatórios" não está modelado em lado nenhum — o ledger atual conta análises/períodos/concorrentes, não desbloqueios de relatório.

A única dimensão por-perfil é os enrichments e comment scraping, que correm uma vez sobre o `report_cache_key` que vem no payment row. Para perfis novos eles correm via os mesmos triggers da geração normal.

### Validação server-side (EuPago)

`createEupagoCheckout` (`eupago.functions.ts`):
- Zod `inputSchema` aceita só `PRODUCT_CODES` (enum estrito).
- Cliente NUNCA passa preço — `getServerProduct(code).amountCents` é a fonte autoritária.
- Cupão é re-validado server-side via `validateCouponForProduct`.
- Insere `lead_payments` com `provider='eupago'`, `status='pending'`, depois cria Pay By Link.

### Idempotência do webhook

- Match por `provider_payment_id` ou `identifier` (UUID interno).
- `if (row.status === "paid" && row.paid_at) return "ok"` — short-circuit.
- Cada grant tem chave única por `(lead_id, payment_id, metadata.kind)` (créditos) ou `(lead_id, product_code)` (entitlement).

## 2. Análise das opções

### O `credit_ledger` actual pode representar "10 relatórios Pro"?
**Não com a semântica actual.** Os créditos no ledger são **créditos de análise** (gerar período / concorrente / handle novo) — `reserveCredit` → `confirmReservation` consome 1 por análise. Misturar "desbloqueios de relatório Pro" no mesmo balance:
- quebra a contagem que o utilizador vê em "Créditos disponíveis";
- faz com que um pack de 10 relatórios pague 10 análises adicionais por engano;
- impossibilita a regra "1 desbloqueio = 1 relatório completo de 1 perfil específico".

### O `lead_entitlements` actual pode representar 10?
**Não.** É booleano por `(lead_id, product_code)`. Comprar `report_pack_10` daria entitlement único e os outros 9 ficavam sem suporte.

### Conflitos com o bónus oculto actual
O bónus pós-compra de `report_full_9` (+1 incluído +2 beta) está calibrado para **uma** compra. Aplicar a um pack de 10 daria +30 créditos por engano — economicamente quebrado e potencialmente abusável.

## 3. Recomendação

**Introduzir um conceito novo: "Pro Report Unlocks"** — separado tanto do entitlement booleano como dos créditos de análise.

- **Produtos finais sugeridos**:
  - `report_full_9` (manter como está — sem mexer, conforme regra do projecto)
  - **Novo**: `report_pack_10` — 72€, concede 10 "report unlocks"
- **NÃO usar** `credit_ledger` para isto. **NÃO reutilizar** `lead_entitlements` para 10x.
- **Não** alterar `credit_pack_1` nem `credits_3/10/25` nem o flow de créditos.

### Modelo de dados proposto (decisão a confirmar)

Opção A — **Wallet de unlocks** (recomendado):
- Nova tabela `lead_report_unlocks` (append-only, à imagem do `credit_ledger`):
  `lead_id`, `delta` (int), `reason` (`pack_grant` | `unlock` | `admin_adjust`), `payment_id`, `report_cache_key`, `instagram_username`, `metadata`, `created_at`.
- Balance = `SUM(delta)`.
- Quando o lead abre um relatório que ainda não está desbloqueado e tem `balance > 0`, consome `-1` com `report_cache_key`/`username` registado → equivalente funcional ao `report_full_9` entitlement, mas por-perfil.
- `getMyReportEntitlement` passa a devolver `premiumUnlocked: true` se: (a) tem `report_full_9` entitlement (compatibilidade), **OU** (b) existe linha de `unlock` para o `report_cache_key` actual, **OU** (c) tem `balance > 0` E o caller invoca o consumo explícito.

Opção B — Counter simples em `lead_entitlements` (descartada): adicionar `remaining_uses` quebra a unicidade actual e a idempotência limpa.

### Pós-compra do pack
- Sem `purchase_included_credit` e sem `post_purchase_beta_bonus` no `report_pack_10` (caso contrário, conflito documentado em §1.5). O webhook deve continuar a aplicar esses bónus **só** quando `row.product === "report_full_9"` (já é o caso — está dentro do `if`).
- Sem `enqueuePaidEnrichmentsForPayment` no momento da compra do pack (não há `report_cache_key` específico). Os enrichments correm no momento em que cada unlock é consumido sobre um perfil concreto.

## 4. Riscos

| Risco | Mitigação |
|---|---|
| Confundir wallet de análises com wallet de unlocks na UI | Componentes distintos: "Créditos de análise" vs "Relatórios disponíveis" |
| Reembolso parcial de um pack já parcialmente consumido | Política: pack é não-reembolsável após primeiro unlock; documentado nos T&C |
| Webhook receber pack duas vezes | Já protegido por `row.status === "paid"` + insert único em wallet por `payment_id` |
| Utilizador comprar pack achando que dá +30 créditos de análise | Copy explícita: "10 desbloqueios de relatório Pro · não inclui créditos de análise" |
| `report_full_9` comprado depois do pack | Entitlement booleano "ganha" — comportamento ok; admin precisa marcar o pack como "ainda com saldo" |
| Migração: leads que já compraram `report_full_9` | Não afecta — flow legacy intacto, novo flow é opt-in |
| Preço autoritativo | Apenas server-side em `SERVER_PRODUCTS`; sem regressão se cliente mandar `amount` |

## 5. Plano de implementação mínimo (apenas após aprovação)

1. **Decisão de produto** (bloqueante — ver §6).
2. Migração: nova tabela `lead_report_unlocks` + RPC `report_unlocks_balance(p_lead_id)` + GRANTs + RLS service-role-only + índice único parcial para idempotência do `pack_grant` por `payment_id`.
3. `products.ts` / `products.server.ts`: adicionar `report_pack_10` (7200 cents). `report_full_9` intocável.
4. `eupago-webhook.ts`: novo branch antes do branch `report_full_9` — se `row.product === "report_pack_10"`, chamar `grantReportUnlockPack({ leadId, paymentId, amount: 10 })` (idempotente). **Não** disparar `enqueuePaidEnrichmentsForPayment`, **não** somar créditos de análise, **não** somar bónus beta.
5. `entitlements.functions.ts`: estender `getMyReportEntitlement` para também ler unlock por `report_cache_key`. Manter compatibilidade com `report_full_9` global.
6. Helper de consumo `consumeReportUnlock({ leadId, reportCacheKey, username })` chamado no momento de abrir relatório Pro quando o lead não tem entitlement global mas tem `balance > 0` — corre os enrichments pagos para esse `report_cache_key` (mesma função do webhook).
7. Admin: secção "Relatórios Pro" em `payments-section.tsx` distinguindo `report_full_9` (entitlement global), `report_pack_10` (saldo de unlocks restantes), bónus de créditos, créditos consumidos.
8. UI checkout: card lado-a-lado em `checkout.report-full.tsx` step 1 — "1 relatório · 9€" vs "Pack 10 · 72€ (poupa 18€)". Default = 1 relatório para não baixar conversão; pack é upsell visual com badge "Melhor valor".
9. Testes: `eupago-webhook.test`, `report-unlocks.test`, `products.test` (preço, idempotência, sem cross-bleed para `credit_ledger`).

## 6. Decisões de produto pendentes (responder antes do build)

1. **Pack 10 ou também 3/5?** Lançar só 10 ou também ter tier intermédio (ex. 3 por 24€)?
2. **Validade do pack**: unlocks expiram? Sugestão: 12 meses desde a compra (registar `expires_at` em metadata).
3. **Unlock consome ao abrir ou ao gerar?** Recomendado: ao abrir o relatório Pro pela primeira vez para esse `report_cache_key` (alinha com o report_full_9 actual).
4. **Mesmo perfil várias vezes**: reabrir o mesmo `report_cache_key` consome de novo? Recomendado: **não** — unlock fica registado por `report_cache_key`.
5. **Pack ganha o bónus beta de créditos de análise?** Recomendação: **não**, para não confundir economias. Confirmar.
6. **Cupões aplicam-se ao pack?** Recomendação: tabela `payment_coupons` já valida por produto — opt-in explícito por código.
7. **Copy do pack em PT-PT**: nome do produto ("Pack 10 relatórios Pro"?), descrição EuPago, descrição da página de sucesso.
