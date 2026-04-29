## Diagnóstico

Verifiquei a base de dados e o código real. A tab **Despesa** (em `/admin/visao-geral`) lê de `cost_daily` — e essa tabela está mesmo a zero para Apify e DataForSEO, apesar de já existir despesa real:

- `provider_call_logs` mostra **9 chamadas Apify com sucesso** ($0,099 estimado), **6 DataForSEO com sucesso** ($0,054 reais), 3 OpenAI ($0,010).
- `cost_daily` para Apify e DataForSEO tem `amount_usd = 0` em todos os dias, embora os `details` JSON contenham os valores reais.

Encontrei três bugs e uma omissão de UI. Não é preciso pedir ao utilizador para clicar em nada — a sincronização tem de ficar automática e correta. Após o fix, o próximo cron (ou o primeiro `Forçar sync`) preenche tudo retroactivamente.

### Bug 1 — Apify: campos errados na resposta da API

`syncApifyCosts` lê `usageUsd`/`totalUsd`/`runCount`, mas a API real devolve `totalUsageCreditsUsd` e não traz contagem de runs no item diário. Resultado: 0 USD e 0 calls em todos os dias, embora o JSON guardado em `details` mostre `totalUsageCreditsUsd: 0.00925` etc.

**Fix:** ler `totalUsageCreditsUsd` (com fallback para `usageUsd`/`totalUsd`) e contar Apify runs do dia a partir de `provider_call_logs` em vez do `runCount` (que vem vazio).

### Bug 2 — DataForSEO: `money.spent` vem 0

`appendix/user_data` devolve `money.spent = 0` na conta atual ($50,95 saldo). O delta diário é sempre 0. Os custos reais que pagamos estão em `provider_call_logs.actual_cost_usd` (gravado no momento de cada chamada DataForSEO — fonte de verdade).

**Fix:** mudar `syncDataForSeoCosts` para o mesmo padrão do OpenAI (agregar `provider_call_logs` por dia, com `provider='dataforseo'`). Manter a chamada `appendix/user_data` apenas para guardar o `balance_at_snapshot` no `details` da linha de hoje (mostra "saldo $X" no cartão).

### Bug 3 — KPI DataForSEO em falta no `Custos detalhados`

`fetchCostMetrics24h` já calcula `dataforseo: { amount_usd, calls }` mas o componente `CostsDetailSection` só renderiza 4 cartões: Apify · OpenAI · Cache hits · Poupança. Falta o cartão DataForSEO — daí a percepção de "caixa em falta".

**Fix:** ajustar a grid para 5 colunas em `xl` (4 em `lg`, 2 em `sm`) e inserir KPI DataForSEO entre OpenAI e Cache hits.

### Melhoria — Tooltip do botão "Forçar sync provedores"

O texto atual está bem ("Os custos atualizam-se automaticamente a cada 60 segundos. Este botão força a sincronização imediata"), mas a frase "primeira sincronização decorre à meia-noite UTC" no `ExpenseSection` é falsa quando o cron já passou e a tabela ainda não recebe Apify/DFS por causa dos bugs acima. Após o fix, esta mensagem deixa de ser frequente.

## Alterações

1. `src/lib/admin/cost-sync.server.ts`
   - **Apify:** ler `totalUsageCreditsUsd`; depois do upsert, fazer uma query a `provider_call_logs` (provider=apify, status=success) agrupada por dia para preencher `call_count` real.
   - **DataForSEO:** substituir lógica de delta por agregação de `provider_call_logs.actual_cost_usd ?? estimated_cost_usd` por dia (últimos 30d). Continuar a fazer 1 chamada a `appendix/user_data` apenas para gravar `balance_at_snapshot` no `details` do dia de hoje.
   - **OpenAI:** sem alterações funcionais (já correcto). Acrescentar fallback de `actual_cost_usd → estimated_cost_usd` (já existe).

2. `src/components/admin/v2/sistema/costs-detail-section.tsx`
   - Mudar grid de KPIs para `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5`.
   - Inserir `KPICard` para DataForSEO com `metrics.data!.dataforseo.amount_usd` e `calls`.

3. (Opcional, baixo risco) `src/components/admin/v2/visao-geral/expense-section.tsx`
   - Tornar o texto de empty-state menos alarmista quando `chartData` estiver vazio mas o cron já tiver corrido. Ler `data.dataforseo_balance` ou `daily.length` para decidir a frase.

## Validação

Depois das mudanças (build automático):

1. `psql` para invocar manualmente o sync:
   ```
   POST /api/admin/sistema/sync-now
   ```
   Confirmar `cost_daily` para `apify` e `dataforseo` passa a ter `amount_usd > 0` nos dias com `provider_call_logs` reais.

2. Abrir `/admin/visao-geral` → secção **Despesa** deve mostrar:
   - Apify > $0
   - OpenAI > $0
   - DataForSEO > $0 (com saldo $50,95 em "saldo")
   - Total > $0 e gráfico empilhado preenchido

3. Abrir `/admin/sistema` → secção **Custos detalhados** deve mostrar **5 KPIs** (Apify · OpenAI · DataForSEO · Cache hits · Poupança).

4. Sem chamadas a OpenAI, Apify ou DataForSEO durante a validação visual (apenas o `sync-now` que já é seguro — só lê custos, não consome tokens).

## Fora de alcance

- Não tocar em `/report.example`, `/api/analyze-public-v1`, snapshots, prompts, ou esquema da BD.
- Não mexer no botão "Forçar sync provedores" (continua a funcionar e a ser útil para forçar refresh manual).
