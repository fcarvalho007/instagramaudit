
## Auditoria Read-Only: Admin Custos `/admin/receita`

### Valores reais da base de dados (últimos 30 dias)

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                    provider_call_logs (success)                         │
├────────────┬──────────┬───────────┬───────────┬─────────┬──────────────┤
│ Provider   │ Calls    │ estimated │ actual    │ Linked  │ Unlinked     │
├────────────┼──────────┼───────────┼───────────┼─────────┼──────────────┤
│ Apify      │ 42       │ $0.3605   │ $0.4991   │ 20      │ 22           │
│ OpenAI     │ 45       │ $0.2679   │ $0.0000   │ 16      │ 29           │
│ DataForSEO │ 12       │ $0.0996   │ $0.1080   │ 1       │ 11           │
├────────────┼──────────┼───────────┼───────────┼─────────┼──────────────┤
│ TOTAL      │ 99       │ $0.7280   │ $0.6071   │ 37      │ 62           │
└────────────┴──────────┴───────────┴───────────┴─────────┴──────────────┘
```

### O que o UI mostra vs o que deveria mostrar

```text
┌────────────────────────────────────────────────────────────────────────────────┐
│                           ZONA 1 — Custo Interno Atribuído                    │
│ Fórmula actual: COALESCE(actual_cost_usd, estimated_cost_usd, 0)             │
├────────────┬──────────────────┬──────────────────────────────────────────────┤
│ Provider   │ Valor no UI      │ Fonte                                        │
├────────────┼──────────────────┼──────────────────────────────────────────────┤
│ Apify      │ ~$0.52           │ actual($0.4991) para comment-scraper,        │
│            │                  │ estimated($0.3605) para scraper              │
│ OpenAI     │ ~$0.27           │ estimated only (actual=0 everywhere)         │
│ DataForSEO │ ~$0.11           │ actual($0.108) mostly                        │
│ TOTAL      │ ~$0.90           │ Mistura de actual + estimated                │
└────────────┴──────────────────┴──────────────────────────────────────────────┘
```

```text
┌────────────────────────────────────────────────────────────────────────────────┐
│                    ZONA 3 — Reconciliação (interno vs externo)                 │
│ Fórmula internal: SUM(estimated_cost_usd) APENAS                             │
├────────────┬──────────────┬──────────────┬───────────────────────────────────┤
│ Provider   │ Interno recon│ Externo imp. │ Nota                              │
├────────────┼──────────────┼──────────────┼───────────────────────────────────┤
│ Apify      │ $0.36        │ $0.66        │ Batch importado correctamente     │
│ OpenAI     │ $0.27        │ —            │ Sem importação externa            │
│ DataForSEO │ $0.10        │ —            │ Sem importação externa            │
└────────────┴──────────────┴──────────────┴───────────────────────────────────┘
```

### PASS/FAIL por item

| # | Verificação | Resultado | Detalhe |
|---|-------------|-----------|---------|
| 1 | Valores Apify/OpenAI/DFS visíveis | **PASS** | 3 provider cards + total renderizam correctamente |
| 2 | Apify external billing match | **PASS** | Batch `92ec4b06` tem `dashboard_total=0.66`, `raw=0.6601`, `displayed=0.67`, `rounding_delta=-0.01` — tudo correcto |
| 3 | Apify UI $0.52 = que valor? | **WARN** | Mistura: `actual_cost_usd` (comment-scraper $0.497) + `estimated_cost_usd` (scraper $0.361). Label diz "interno atribuído" mas usa actual quando disponível |
| 4 | "Apify faturou $0.36" | **BUG** | A coluna "Interno atribuído" na reconciliação usa **SUM(estimated_cost_usd)** = $0.36, mas Zona 1 usa **COALESCE(actual, estimated)** = $0.52. Inconsistência de $0.16 |
| 5 | `provider_billing_imports` correcto | **PASS** | 2 rows: scraper ($0.0851 raw, $0.09 displayed) + comments ($0.575 raw, $0.58 displayed) — match exact |
| 6 | `provider_call_logs` vs external | **WARN** | Internal estimated = $0.36, Internal actual = $0.50, External dashboard = $0.66. Delta expectável: estimated subestima (usa preço fixo $0.0023/event por scraper), actual mais próximo mas comment-scraper não tem estimated |
| 7 | OpenAI e DFS | **PASS** | Mostrados como estimativas internas. Sem importação externa — status "PENDENTE" na reconciliação |
| 8 | Daily charts | **PASS** | Usa `aggregateCostsFromLogs` = COALESCE(actual, estimated). Consistente com Zona 1 |
| 9 | Cost per report | **PASS** | Usa fresh events linked — correctamente filtrado |
| 10 | Attribution confidence | **PASS** | Card mostra %, total e breakdown por provider. Suficientemente claro |

### Apify reconciliation detalhada

```text
┌─────────────────────────────────────────────────────────────────────┐
│                     Apify Billing Reconciliation                     │
├─────────────────────────────────────┬───────────────────────────────┤
│ Dashboard total (user screenshot)   │ $0.66                         │
│ Batch dashboard_total_actual_cost   │ $0.66 ✓                       │
│ imported_total_raw_cost_usd         │ $0.6601 ✓                     │
│ imported_total_displayed_cost_usd   │ $0.67 ✓                       │
│ rounding_delta_usd                  │ -$0.01 ✓                      │
│ raw_delta_usd                       │ -$0.0001 ✓                    │
│ reconciliation_status               │ "Rounding difference" ✓       │
├─────────────────────────────────────┼───────────────────────────────┤
│ Internal ESTIMATED (recon formula)  │ $0.3605                       │
│ Internal COALESCE (expense formula) │ $0.5211                       │
│ Internal ACTUAL only                │ $0.4991                       │
│ cost_daily Apify 30d                │ $0.3592                       │
├─────────────────────────────────────┼───────────────────────────────┤
│ MISMATCH                            │ Zona 1 diz $0.52,            │
│                                     │ Zona 3 interno diz $0.36     │
│                                     │ Diferença: $0.16             │
│                                     │ Causa: fórmulas diferentes   │
└─────────────────────────────────────┴───────────────────────────────┘
```

### Root causes identificadas

**BUG 1 — Fórmula inconsistente entre Zona 1 e Zona 3**

- `aggregateCostsFromLogs()` (Zona 1, Zona 6): `COALESCE(actual_cost_usd, estimated_cost_usd, 0)`
- `getReconciliationData()` (Zona 3): `SUM(estimated_cost_usd)` only
- O mesmo provider mostra $0.52 num sítio e $0.36 noutro

**BUG 2 — buildReconRows usa Zona 1 totals MAS reconciliation API usa fórmula diferente**

- A tabela de reconciliação no UI chama `buildReconRows(data, reconByProvider)` que usa `data.apify_total` (COALESCE) para "interno" mas `reconByProvider.external` para externo
- Mas `reconByProvider.internal` (da API) usa estimated_only
- Resultado: a coluna "Interno atribuído" mostra o valor da Zona 1 ($0.52), mas se fosse da API mostraria $0.36

**BUG 3 — Batch Apify tem período parcial**

- `period_start: 2026-05-01`, `period_end: 2026-05-06` mas o batch cobre **todo** o dashboard billing cycle
- Não é grave agora, mas quando houver mais importações pode causar sobreposição

### Recomendações (não implementar ainda)

1. **Unificar fórmula interna**: Decidir se "interno" é `estimated_cost_usd` ou `COALESCE(actual, estimated)`. Recomendo usar sempre COALESCE para consistência — é a mesma lógica que alimenta totais e gráficos.

2. **Corrigir reconciliation server**: `billing-reconciliation.server.ts` L82-84 deve seleccionar `actual_cost_usd` além de `estimated_cost_usd` e usar a mesma fórmula COALESCE.

3. **Clarificar labels no UI**: Na Zona 3, a coluna "Interno atribuído" deveria ter nota "(actual quando disponível, estimado quando não)". Na Zona 1, manter "Custo interno atribuído" que já é claro.

4. **Importar OpenAI e DataForSEO**: Criar batches para estes providers quando houver dados do dashboard. Status "PENDENTE" é correcto por agora.

5. **Corrigir período do batch Apify**: Quando re-importar, usar o ciclo completo de faturação (mês inteiro ou o período real do dashboard).
