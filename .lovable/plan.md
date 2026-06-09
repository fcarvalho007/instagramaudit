# Modal "Sem créditos" + sucesso pós-pagamento — copy clarificada e saldo visível

## Backend (sem alterações necessárias)

O ledger **já regista duas linhas separadas** para cada compra de pack — confirmado:

- `+1 credit_ledger` · `reason='admin_adjust'` · `metadata.kind='credit_pack_purchased'` (via `grantCreditPack`)
- `+2 credit_ledger` · `reason='admin_adjust'` · `metadata.kind='credit_pack_launch_bonus'` (via `grantCreditPackLaunchBonus`)

Ambos partilham o mesmo `payment_id` mas são linhas distintas, permitindo ao admin distinguir receita (kind=`credit_pack_purchased`) de oferta (kind=`credit_pack_launch_bonus`). Quando a oferta de lançamento terminar, basta deixar de chamar `grantCreditPackLaunchBonus` — o histórico mantém-se intacto e auditável.

Único polimento sugerido: adicionar a `source` semântica `'launch_bonus'` ao metadata da linha de bónus (já existe `launch_bonus: true`, mas adicionar campo `source: 'launch_bonus'` em paralelo a `source: 'payment_confirmed'` ajuda queries de admin futuras). Opcional — confirmar com utilizador se quer.

## Frontend — alterações de copy

### 1. Modal "Sem créditos" (`consume-credit-dialog.tsx` + i18n)

Substituir o atual `empty_body` curto por copy estruturada com lista de usos. Renderizar como bloco com título + parágrafo + bullet list dentro do dialog quando `!hasCredit`.

Strings i18n novas (`pt/report.json` → `consume_dialog`):

```json
"empty_title": "Sem créditos disponíveis",
"empty_body_intro": "O teu relatório Pro está activo, mas esta acção exige uma nova análise e consome 1 crédito.",
"empty_body_usage_intro": "Cada crédito permite gerar uma nova análise Pro, como:",
"empty_body_usage_refresh": "actualizar o relatório com as últimas publicações;",
"empty_body_usage_window": "analisar 30 ou 90 dias;",
"empty_body_usage_competitor": "adicionar um concorrente;",
"empty_body_usage_fresh": "forçar uma nova análise quando não existe cache.",
"empty_cta": "Comprar 1 crédito · 9€",
"cta_cancel": "Cancelar"
```

Render no dialog (substitui o parágrafo único):
- `<p>` intro
- `<p>` usage_intro
- `<ul>` com 4 bullets (semantic tokens, `text-sm text-content-secondary`)

Espelhar no `en/report.json`.

### 2. Página de sucesso (`/checkout/credits?status=success`)

Adicionar **terceira linha** com saldo actualizado, lida via `getMyCreditBalance` (server fn já existente).

Como o webhook EuPago corre assíncrono ao redirect, o saldo pode ainda não estar actualizado quando o utilizador chega. Estratégia:

- `useQuery({ queryKey: ['my-credit-balance', 'post-purchase'], queryFn: getMyCreditBalance, refetchInterval: balance < 3 ? 1500 : false, refetchIntervalInBackground: false })` durante ~10s.
- Enquanto `balance < 3`, mostrar "A actualizar saldo…".
- Quando `balance >= 3`, mostrar `"Saldo actualizado: {balance} créditos."`.
- Após 10s, parar polling — mostrar saldo qualquer que seja.

Copy final:

```
Créditos adicionados com sucesso.

Oferta de lançamento aplicada: recebeste 2 créditos extra.
Saldo actualizado: 3 créditos.
```

CTA mantém-se "Voltar ao relatório".

## Ficheiros afectados

- `src/components/report-redesign/v2/consume-credit-dialog.tsx` — render estruturado do estado sem créditos.
- `src/i18n/locales/pt/report.json` e `en/report.json` — novas chaves de copy.
- `src/routes/checkout.credits.tsx` — `PostPurchaseSuccessPanel` lê saldo com polling curto e mostra terceira linha.
- (opcional) `src/lib/credits/credits.server.ts` — acrescentar `source: 'launch_bonus'` ao metadata da linha de bónus.

## Riscos / decisões

- **Polling do saldo**: limita a 10s para não criar requests infinitos. Se o webhook falhar/atrasar acima disso, mostra o saldo atual sem prometer 3 (evita inconsistência).
- **Sem alteração ao backend**: a separação em duas linhas de ledger já está implementada e testada — apenas a UI melhora.

## Fora de scopo

- Não mexer no fluxo Pro inicial (`report_full_9`) — esses créditos continuam com os kinds `purchase_included_credit` e `post_purchase_beta_bonus`.
- Não introduzir múltiplos packs nem seletor de quantidade.
- Não auto-disparar a acção pendente após pagamento.
