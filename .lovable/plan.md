## Estado actual

Revi tudo o que estava no checkpoint do plano anterior e quase todos os itens já estão fechados:

- ✓ `/admin/perfis`: KPI "Conversão · 30d" removido, grid 3 colunas, "Perfis repetidos" usa snapshots na janela.
- ✓ Coluna "Cache" → "Cache hits" com legenda por baixo da tabela.
- ✓ `IntentOpportunitiesSection` reescrito + endpoint `profiles.intent-opportunities.ts` criado e ligado em `/admin/perfis`.
- ✓ `/admin/relatorios`: KPI "Entrega · sucesso" removido; KPIs reordenados (Pediram análise → Submeteram email → Custo médio).
- ✓ Tabela de Relatórios: coluna "Duração" removida, "Lead" → "Registo", botão "Ver" / "Ver análise" explícito.

Falta apenas **1 item do checkpoint**: validar e corrigir o **custo médio · análise** para bater com `/admin/receita`.

## Diagnóstico do custo

Query real (30d):

| apify_calls | all_calls | apify_cost | total_cost | snapshots |
|---|---|---|---|---|
| 49 | 157 | $0.52 | $1.20 | 7 |

O endpoint `report-requests.metrics` faz hoje:
```
avg_cost_usd = total_cost ($1.20, inclui Apify + OpenAI + outros) / total_analyses (7) = $0.172
```

Problema: a UI mostra "$0.172 · apify + openai" mas em `/admin/receita` a reconciliação Apify segue apenas custo Apify ($0.52). Os números não falam a mesma linguagem e o utilizador não consegue cruzar.

## Plano

### 1. `src/routes/api/admin/report-requests.metrics.ts`

Separar custos por provider e expor três campos em vez de um:

- `total_cost_usd` — soma de todos os `provider_call_logs` na janela (qualquer actor).
- `apify_cost_usd` — soma só dos logs cujo `actor LIKE 'apify%'` (bate com `/admin/receita`).
- `avg_cost_usd` — passa a ser `apify_cost_usd / total_analyses` (custo Apify por análise nova).

Restantes campos mantêm-se.

### 2. `src/components/admin/v2/relatorios/metrics-section.tsx`

- KPI principal "Custo médio · análise":
  - Valor: `avg_cost_usd` (agora Apify-only ÷ snapshots).
  - Sub-label: substituir "apify + openai" por **"Apify por análise nova"**.
  - Tooltip no eyebrow: "Custo Apify dividido pelas análises geradas. Alinha com a reconciliação em /admin/receita."
- Acrescentar pequena linha secundária por baixo do valor (não outro KPI): `Total na janela: $X.XX · Apify $Y.YY` para auditoria visual rápida.

### 3. Sem alterações em endpoints/components de `/admin/receita`

A fonte (`cost_daily` provider='apify' + `provider_call_logs`) já é a mesma; só preciso garantir que o número exposto em Relatórios usa o mesmo denominador conceptual (Apify-only).

## Checkpoint

- ☐ `report-requests.metrics` devolve `total_cost_usd`, `apify_cost_usd`, `avg_cost_usd` (Apify ÷ snapshots).
- ☐ KPI "Custo médio · análise" mostra valor Apify por análise + sub-linha com totais.
- ☐ Tooltip explicita ligação a `/admin/receita`.
- ☐ Build verde, valores batem com a reconciliação Apify exposta em /admin/receita.
