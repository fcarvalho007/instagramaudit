# Pack de créditos — 1 crédito · 9€ (com bónus interno de lançamento)

## Regra de negócio

- Produto público: **"Comprar 1 crédito adicional — 9€"**.
- Interno, após pagamento confirmado: **+1 crédito pago + 2 créditos bónus = 3 créditos totais**.
- Nunca anunciar os +2 antes do pagamento. Nunca usar a palavra "beta" no UI público.
- Após pagamento, mostrar: *"Créditos adicionados com sucesso. Oferta de lançamento aplicada: recebeste 2 créditos extra."*
- Pós-pagamento: **regresso à página, sem re-disparo automático** da ação pendente.

1 crédito = 1 ação Pro (relatório novo dos últimos 12 posts · 1 concorrente · 30d · 90d · fresh sem cache).

---

## Fluxo alvo

```text
Pro sem saldo clica 30d/90d/concorrente/fresh
        │
        ▼
Modal "Sem créditos" → botão "Comprar 1 crédito · 9€"
        │
        ▼
/checkout/credits?return=<rota_atual>&product=credit_1_launch_bonus
        │
        ▼
EuPago (purchase_type=credit_pack, pack_id=credit_1_launch_bonus, amount=9)
        │
        ▼
Webhook valida assinatura → grantCreditPack(payment_id):
  • +1 credit_ledger.source = 'purchase'           (kind: credit_pack_purchased)
  • +2 credit_ledger.source = 'controlled_launch_bonus' (kind: launch_bonus)
  ambos com payment_id, idempotente por (payment_id, kind)
        │
        ▼
/checkout/credits/success?return=<rota>  → CTA "Voltar ao relatório"
        │
        ▼
Relatório recarrega → saldo atualizado + toast:
  "Créditos adicionados com sucesso."
  "Oferta de lançamento aplicada: recebeste 2 créditos extra."
        │
        ▼
Utilizador clica de novo no chip/botão manualmente
```

---

## Passos de implementação

1. **Catálogo** (`src/lib/payments/products.ts` + `products.server.ts`)
   - Adicionar SKU único `credit_1_launch_bonus`: label público "1 crédito adicional", `price_eur = 9`, `paid_credits = 1`, `bonus_credits = 2` (campos internos, não expostos no checkout UI).
   - Flag `purchase_type = 'credit_pack'`.

2. **Migração DB**
   - `lead_payments.product` CHECK aceita `credit_1_launch_bonus`.
   - `credit_ledger.source` aceita `controlled_launch_bonus` (ou reutiliza enum existente com novo `metadata.kind = 'launch_bonus'` — verificar schema actual antes).

3. **`grantCreditPack`** em `src/lib/credits/credits.server.ts`
   - Idempotente por `(payment_id, kind)`.
   - Insere 2 linhas em `credit_ledger`:
     - `+1` · `source='purchase'` · `metadata.kind='credit_pack_purchased'`
     - `+2` · `source='controlled_launch_bonus'` · `metadata.kind='launch_bonus'`
   - Ambas com mesmo `payment_id` para auditoria.

4. **Webhook EuPago** (`src/lib/payments/eupago-webhook.ts`)
   - Novo branch: `product === 'credit_1_launch_bonus'` → valida `amount === 9` → chama `grantCreditPack(payment)`.
   - Sem enrichments, sem brindes adicionais, sem alterar `lead_entitlements` Pro.

5. **Rota de checkout** `src/routes/checkout.credits.tsx`
   - Versão minimalista: só dados de facturação + resumo "1 crédito adicional · 9€".
   - Sem upsell, sem prioridade, sem goals, sem menção ao bónus.
   - Cria sessão EuPago com `product=credit_1_launch_bonus` e `return_url` carrega `?return=` original.

6. **Rota sucesso** `src/routes/checkout.credits.success.tsx`
   - Mostra confirmação com as duas linhas de copy aprovadas.
   - CTA único "Voltar ao relatório" → navega para `return` recebido.

7. **Modal sem créditos** (`src/components/report/consume-credit-dialog.tsx` + `report-block-nav.tsx`)
   - Ligar `onEmptyFeedback` aos dois call sites (chip período / botão concorrente).
   - Handler: `navigate('/checkout/credits?return=' + currentPath + '&product=credit_1_launch_bonus')`.
   - Atualizar copy do botão: "Comprar 1 crédito · 9€" (substitui "Pedir mais créditos").

8. **Toast pós-pagamento** no relatório
   - Detectar `?credits_added=success` no return URL → `toast.success` com as duas linhas.
   - Invalidar query de saldo de créditos.

9. **Admin / tracking** (`src/lib/admin/lead-credit-activity.ts`, `tracking.server.ts`)
   - Novos buckets: `initial_pro`, `pack_purchased`, `launch_bonus`, `consumed`.
   - Eventos `product_events`: `credit_pack_checkout_started`, `credit_pack_purchased`.
   - Painel admin mostra ledger separado entre pago e bónus.

10. **i18n / copy**
    - Remover texto "Pedir mais créditos" dos pontos identificados.
    - Adicionar strings: botão modal, página checkout, sucesso, toast.

11. **Testes**
    - `grantCreditPack`: idempotência por `(payment_id, kind)`, soma de 3 créditos.
    - Webhook: validação de `amount`, rejeição de assinatura inválida, double-call não duplica.
    - Modal: clique em "Comprar" navega com `return` correcto.
    - Sucesso: CTA volta à rota original, toast renderiza ambas as linhas.

---

## Ficheiros afectados

- `src/lib/payments/products.ts`, `products.server.ts`
- `src/lib/payments/eupago.functions.ts`, `eupago-webhook.ts`
- `src/lib/credits/credits.server.ts` (novo `grantCreditPack`)
- `src/routes/checkout.credits.tsx` (novo)
- `src/routes/checkout.credits.success.tsx` (novo)
- `src/components/report/consume-credit-dialog.tsx`
- `src/components/report-redesign/v2/report-block-nav.tsx`
- `src/lib/admin/lead-credit-activity.ts`, `tracking.server.ts`
- Migração SQL para `lead_payments.product` CHECK e (se necessário) `credit_ledger.source`
- i18n e testes correspondentes

## Riscos

- **Duplicação de bónus** se webhook re-tentar → mitigado por idempotência `(payment_id, kind)`.
- **Confusão de fonte de verdade**: `credit_ledger` continua a ser única; `cost_daily` não toca (regra de memória).
- **Stale return URL**: validar que `return` é caminho interno (`startsWith('/')`) antes de navegar.
- **Mistura com Pro inicial**: webhook do `report_full_9` mantém-se inalterado; só novo branch trata `credit_1_launch_bonus`.

## Fora de scopo (confirmado)

- Sem múltiplos tiers, sem seletor de quantidade.
- Sem re-disparo automático da ação pendente.
- Sem alteração aos gates Free/Pro, 30d/90d, lógica de cache ou `force_refresh`.
- Sem subscrições, sem alteração de preços existentes.
