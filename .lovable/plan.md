# PR1 Window Validation — Plan

Lead alvo: `7b946d45-ecb1-49dc-8702-68d85a860c47` (`fredericodigital@gmail.com`), saldo = 1 crédito, sem `report_full_9`.

Endpoint sob teste: `POST /api/analyze-public-v1` com body `{ instagram_username, window }`. O Pro-gate vive em `src/routes/api/analyze-public-v1.ts` linhas 559–577 (`isWideWindow` → `hasEntitlement('report_full_9')` → `WINDOW_REQUIRES_PRO` antes de `reserveCredit`).

Perfil de teste: `frederico.m.carvalho` (perfil do APIFY_ALLOWLIST).

## Pré-requisito (bloqueante)

O endpoint identifica o lead pelo cookie `lead_session`. Para invocar a partir do sandbox preciso do **valor actual do cookie `lead_session`** do browser onde fizeste a QA (DevTools → Application → Cookies → copia o valor completo).

Sem esse valor não posso executar PR1 a partir daqui (o sandbox não tem sessão do browser). Alternativa: corres tu os 4 fetches no DevTools e colas-me as respostas — eu faço o resto (snapshot do credit_ledger antes/depois, leitura dos events/logs, rollback).

## Passos

### 1. T0 — snapshot do estado base
Read-only no Supabase, registo em memória:
- `credit_balance(lead_id)` actual
- contagem actual em `analysis_events`, `provider_call_logs`, `analysis_snapshots` para o handle `frederico.m.carvalho`
- entitlements actuais do lead

### 2. Grant temporário `report_full_9`
Via `supabase--insert`:
```sql
INSERT INTO lead_entitlements (lead_id, product_code, metadata)
VALUES ('7b946d45-ecb1-49dc-8702-68d85a860c47', 'report_full_9',
        jsonb_build_object('source','manual_pr1_validation','granted_for','PR1_window_validation'));
```
Sem créditos adicionados. Sem `payment_id`.

### 3. Cenários (ordem rígida)

| # | Cenário | Body | Cookie | Esperado |
|---|---|---|---|---|
| A | Baseline (controlo) | `{ instagram_username:"frederico.m.carvalho" }` (sem `window`) | lead_session | sucesso, sem débito de crédito (ou débito normal Free se cache miss) |
| B | Pro 30d 1ª chamada | `{..., window:"30d"}` | lead_session | sucesso, **-1 crédito**, novo snapshot com cache_key sufixado |
| C | Pro 30d repeat | idem B | lead_session | cache hit, **0 créditos consumidos**, `alreadyAssociated=true` |
| D | Free 30d sem entitlement | idem B | lead_session | depois do rollback temporário da entitlement: `WINDOW_REQUIRES_PRO`, **0 créditos consumidos** |

Para D faço rollback **antes** da chamada e re-confirmo saldo. Não executo 90d. Não uso `INTERNAL_API_TOKEN`.

### 4. Rollback final
```sql
DELETE FROM lead_entitlements
WHERE lead_id='7b946d45-ecb1-49dc-8702-68d85a860c47'
  AND product_code='report_full_9'
  AND metadata->>'source'='manual_pr1_validation';
```
Garante 0 entitlements `report_full_9` no fim. Saldo de créditos final = saldo inicial − 1 (do cenário B).

### 5. Relatório
Tabela com, por cenário:
- HTTP status + `outcome`/`errorCode` da resposta
- delta em `credit_ledger` (linhas novas, `delta`, `reason`)
- `analysis_events` novas (`data_source`, `outcome`, `error_code`)
- `provider_call_logs` novos (`actor`, `posts_returned`, `actual_cost_usd`)
- `analysis_snapshots` (`cache_key`, `created_at`)
- veredicto PASS/FAIL por regra

PR2 fica bloqueado até 4/4 PASS.

## Fora de scope
Checkout, EuPago, preços, schema, UI, lógica de pagamento, 90d, qualquer write fora de `lead_entitlements` (insert + delete simétricos).

## Próximo passo
Cola o valor do cookie `lead_session` (ou diz-me se preferes correr tu os fetches). Em build mode executo passos 1→5 numa só rajada.
