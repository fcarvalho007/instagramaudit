## Diagnóstico — porque é que os números não batem

Confirmei o problema com queries diretas à BD. Hoje existem **três sítios** no /admin onde aparecem custos, e cada um lê de uma fonte/janela diferente:

| Local | Fonte | Janela | Apify | OpenAI | DFS |
|---|---|---|---|---|---|
| `/admin/sistema` › Custos detalhados | `provider_call_logs` (`actual ?? estimated`, **inclui falhas**) | últimas 24h | $0,000 | $0,035 | $0,045 |
| `/admin/visao-geral` › Despesa | `cost_daily` (agregado pelo cron de sync) | últimos 30 dias | $0,021 | $0,011 | $0,054 |
| `/admin/receita` › Faturas | `MOCK_INVOICES` (mock visível com banner "demo only") | — | — | — | — |

Causas concretas:

1. **Fontes diferentes**. `cost_daily` é alimentada por jobs de sync (`syncApifyCosts`, `syncOpenAiCosts`, `syncDataForSeoCosts`) e pode não ter corrido — daí Apify 24h em provider_call_logs ($0,022 nos últimos 30d) não aparecer no `cost_daily` para o dia de hoje.
2. **Janelas diferentes**. 24h vs 30d — comparação direta é impossível.
3. **Regras de fallback diferentes**. Sistema soma `actual_cost_usd ?? estimated_cost_usd ?? 0` para **todas** as linhas (success/cache/failure). O sync OpenAI/DFS só agrega `status='success'`. Apify cost_daily vem da própria API da Apify (monthly usage), que pode não ter ainda os runs de hoje.
4. **Receita › Faturas** não é discrepância — é mock declarado.

## Princípio de correção

Uma única fonte de verdade: **`provider_call_logs`** (é a única tabela escrita em runtime, no momento exato da chamada, com `actual_cost_usd` quando disponível). Tudo o resto deriva dela. `cost_daily` continua a existir, mas só como **cache materializado** alimentado por `provider_call_logs` — nunca como fonte primária.

Regras uniformes em todos os ecrãs:
- Custo por linha = `COALESCE(actual_cost_usd, estimated_cost_usd, 0)`
- Apenas `status IN ('success','cache')` conta como custo realizado (falhas com 0$ não inflam, falhas com custo cobrado pela API ficam de fora — ver nota abaixo).
- Janelas explícitas no UI (24h, 30d) e calculadas a partir do mesmo dataset.

Nota Apify: a Apify cobra por run mesmo em runs falhados que consumiram compute. Para não perder isso, mantemos o **sync da Apify monthly usage** apenas para **reconciliação mensal** (mostrado como "valor faturado pela Apify este mês" num KPI separado), mas o gráfico diário e o total 30d passam a vir de `provider_call_logs`. Quando a fatura da Apify chegar e divergir, vê-se a diferença num único KPI.

## Alterações

### 1. `src/lib/admin/system-queries.server.ts`

- **Nova função** `aggregateCostsFromLogs(sinceIso, untilIso?)` — agrega `provider_call_logs` por `provider` e por dia, aplicando as regras uniformes acima. Devolve `{ apify, openai, dataforseo, daily[] }`.
- `fetchCostMetrics24h()` — passa a usar `aggregateCostsFromLogs(now-24h)`. Mantém `cache_hits` e `cache_savings_usd` como já estão.
- `fetchExpense30d()` — reescrita para usar `aggregateCostsFromLogs(now-30d)` em vez de `cost_daily`. Mantém `dataforseo_balance` (continua a vir de `cost_daily.details.balance_at_snapshot` se existir; senão null).
- **Novo campo opcional** em `Expense30d`: `apify_billed_total_30d` (lido de `cost_daily` da Apify, para mostrar reconciliação com a fatura). Se ausente, UI esconde.

### 2. `src/components/admin/v2/visao-geral/expense-section.tsx`

- Adicionar nota pequena por baixo do KPI Apify quando `apify_billed_total_30d` existir e divergir >5% do `apify_total`: "Apify faturou $X · diferença Y" (em tom info, não alarme).
- Mantém UI/cores/grid intactos.

### 3. `src/components/admin/v2/sistema/costs-detail-section.tsx`

- Adicionar legenda explícita por baixo dos KPIs: "Janela: últimas 24h · fonte: provider_call_logs (success + cache)". Para o utilizador perceber porque é diferente do 30d da Visão Geral.
- Sem alterações de layout.

### 4. `src/lib/admin/cost-sync.server.ts`

- Mantém-se intacto. `cost_daily` continua a ser populado, mas agora apenas para:
  - reconciliação Apify (faturação mensal real)
  - registo de saldo DataForSEO
  - histórico que sobrevive a purge de logs antigos

### 5. Documentação

- Atualizar `mem://design/report-light-tokens`? Não — isto é regra de dados, não design. Criar `mem://features/cost-source-of-truth` com a regra: "provider_call_logs é a fonte única; cost_daily é cache de reconciliação".

### 6. Validação

- `bunx tsc --noEmit`
- `bunx vitest run`
- Query manual de verificação:
  ```sql
  SELECT provider, SUM(COALESCE(actual_cost_usd, estimated_cost_usd, 0))
  FROM provider_call_logs
  WHERE created_at >= now() - INTERVAL '24 hours'
    AND status IN ('success','cache')
  GROUP BY provider;
  ```
  Confirmar que bate exatamente com o que o `/admin/sistema` mostra.
- Mesma query com `30 days` deve bater com `/admin/visao-geral › Despesa`.

## O que NÃO muda

- Schema da BD (zero migrações).
- `provider_call_logs` continua a ser escrita pelo flow real de análise.
- Sem chamadas a Apify/OpenAI/DataForSEO/Supabase em runtime do refactor.
- `Receita › Faturas` continua mock (já declarado como demo).
- UI das secções não é redesenhada — só legenda/nota informativa.

## Resultado esperado

Os mesmos números agregados em todos os ecrãs, com janelas declaradas. Discrepância Apify (faturação real vs custo estimado por log) fica visível como **um único KPI de reconciliação**, não como divergência silenciosa entre páginas.
