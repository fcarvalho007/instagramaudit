## Validation report — credit purchase flow

Pedido: validar o flow MVP `1 crédito · 9€` + bónus interno `+2 lançamento`, sem implementar 3/10/25. Antes de validar, preciso de sinalizar uma divergência crítica: **o código já está no estado pós-pack, não no estado MVP que descreves**. Esta validação assume que vais querer fazer rollback (ver Bloqueio crítico).

---

### Bloqueio crítico (precisa de decisão antes de validar)

O estado actual do repositório **já implementou** o que pedes para NÃO fazer:

- `src/lib/payments/products.ts` — `credit_pack_1.exposed = false` ("DEPRECATED: substituído pelos packs credits_3 / credits_10 / credits_25"). Existem `credits_3` (9€/3), `credits_10` (25€/10), `credits_25` (49€/25) no enum e no `SERVER_PRODUCTS`.
- `src/routes/checkout.credits.tsx` — já é um seletor de 3 packs (`PACKS = [credits_3, credits_10, credits_25]`), com `DEFAULT_PACK = "credits_3"` e schema `?pack=` validado.
- `src/components/report-redesign/v2/report-block-nav.tsx:953-970` — modal "sem créditos" navega para `/checkout/credits?...&pack=credits_3` (não para `credit_pack_1`).
- `src/routes/api/public/eupago-webhook.ts` — o branch credit-pack já só aplica `grantCreditPackLaunchBonus` quando `row.product === "credit_pack_1"`. Para `credits_3/10/25` **não** concede bónus de lançamento.
- `credits.server.ts` mantém `getCreditPackAmount` a aceitar 3/10/25 e a função `grantCreditPackLaunchBonus` continua exportada mas só é chamada para o SKU legado.

Consequência: hoje, quem clica "Comprar créditos" no modal cai em `credits_3` (3 créditos por 9€, **sem +2 bónus**), não em `credit_pack_1` (1 + 2 bónus = 3). Para utilizadores finais o saldo final é o mesmo (3 créditos por 9€), mas:
- A copy de sucesso "Oferta de lançamento aplicada: recebeste 2 créditos extra" **não aparece** (porque o branch só corre para `credit_pack_1`).
- O ledger regista `+3` num único movimento `credit_pack_purchased` em vez de `+1 purchase` e `+2 launch_bonus` separados.
- O admin perde a separação receita vs. oferta que justificava o bónus.

### Caminho recomendado

Não consigo fazer uma "validação focada do MVP" sobre código que já não é o MVP. Tens duas opções; escolhe uma antes de eu validar/auditar:

1. **Rollback ao MVP `credit_pack_1`** (alinhado com a tua mensagem):
   - `PACKS` no checkout passa a `[credit_pack_1]` (ou substituir por um único card `1 crédito · 9€`).
   - Modal aponta `?pack=credit_pack_1` (ou remove o query param).
   - `credit_pack_1.exposed = true`; manter `credits_3/10/25` no enum como inactivos (back-compat) ou removê-los do `PUBLIC_PRODUCTS`.
   - Webhook fica como está (já trata `credit_pack_1` + bónus correctamente).
   - Página de sucesso volta a mostrar a frase do bónus de lançamento.
   - Adicionar comentário `// TEMPORARY LAUNCH OFFER` em `CREDIT_PACK_LAUNCH_BONUS_AMOUNT` e no branch do webhook, com data prevista de remoção.
2. **Manter `credits_3` como nova MVP pública** (`3 créditos · 9€`, sem bónus oculto, transparente). Neste caso a tua mensagem precisa de ser actualizada (deixa de existir bónus interno) e eu valido o flow actual em vez do que descreves.

Sugiro **opção 1** porque é o que a mensagem pede explicitamente e mantém a separação ledger receita/oferta que tu próprio defendeste antes.

---

### Auditoria do que JÁ está correcto (não precisa de mexer)

Independentemente da decisão acima, estes pontos estão sólidos e não exigem alteração:

- **Assinatura HMAC**: `verifyWebhookSignature` valida `EUPAGO_WEBHOOK_SECRET` sobre o raw body antes de qualquer escrita. 401 em falha.
- **Idempotência de pagamento**: `if (row.status === "paid" && row.paid_at) return ok` antes de qualquer grant.
- **Idempotência do crédito pago**: `grantCreditPack` faz `select ... where payment_id = ? and metadata->>kind = 'credit_pack_purchased'` e só insere se vazio.
- **Idempotência do bónus**: `grantCreditPackLaunchBonus` usa a mesma técnica com `kind = 'credit_pack_launch_bonus'`. Ledger fica com **duas linhas distintas** (`source: purchase` vs `launch_bonus`) — exactamente o que pediste.
- **Isolamento dos packs**: branch credit-pack faz `return` antes de chegar a `grantEntitlement`, `enqueuePaidEnrichmentsForPayment` e `enqueueCommentScrapingForPayment`. Confirmado: pack **não** dá Pro entitlement nem re-corre enrichments/comments.
- **Sem mudanças a 30d/90d, competitor, force_refresh, cache, snapshots** — nenhuma referência tocada no webhook.
- **`report_full_9` intacto**: cai no caminho "default" (entitlement + enrichments) sem qualquer interferência da lógica de pack.
- **Retorno manual ao relatório**: o success panel mostra o saldo via polling de `getMyCreditBalance` mas **não** redirecciona automaticamente nem re-executa a acção pendente. Botão "Voltar ao relatório" usa `search.return`.
- **Modal copy actual**: já está sentence case, sem "beta", com CTA "Comprar créditos".

### Riscos / pontos a confirmar manualmente

1. **Migration check**: confirmar que `lead_payments.product` CHECK constraint aceita `credits_3/10/25` em produção (a migração pode não ter corrido ainda em ambientes onde só `credit_pack_1` estava válido). Posso correr `supabase--read_query` à constraint se autorizares.
2. **Copy do bónus**: em PT e EN, `report.json` provavelmente já não tem a string "Oferta de lançamento aplicada…" se foi removida no passo anterior. Validar antes do rollback.
3. **Testes**: `credit-pack.test.ts` actualmente testa packs 3/10/25 (11 testes). Se fizermos rollback, os testes precisam de cobrir `credit_pack_1` + bónus em vez disso.
4. **Pagamentos em flight**: se houver `lead_payments` com `product = credits_3` já criados em testes anteriores, ficam órfãos se removermos o produto do enum. Solução: manter no enum mas `exposed: false`, não remover.

### Próximo passo

Confirma se queres **opção 1 (rollback ao MVP `credit_pack_1` + bónus)** ou **opção 2 (manter `credits_3` como nova MVP, sem bónus, e actualizar a tua spec)**. Assim que decidires, abro Edit Mode e:

- Opção 1: rollback minimal (4 ficheiros: `products.ts`, `checkout.credits.tsx`, `report-block-nav.tsx`, copy de sucesso + comentário "TEMPORARY LAUNCH OFFER") + actualizar testes.
- Opção 2: apenas auditoria final do flow actual + ajuste de copy, sem código novo.

Sem essa decisão, qualquer "validação do MVP" seria sobre código que já não está em execução.
