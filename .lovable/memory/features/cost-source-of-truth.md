---
name: cost-source-of-truth
description: Regra única para custos no /admin — provider_call_logs é a fonte primária; cost_daily só reconciliação
type: feature
---
**Fonte única de verdade para custos**: `provider_call_logs`.

Regras uniformes em todos os ecrãs do `/admin`:
- custo por linha = `COALESCE(actual_cost_usd, estimated_cost_usd, 0)`
- apenas linhas com `status IN ('success','cache')` contam como custo realizado
- janelas declaradas no UI (24h em /sistema, 30d em /visao-geral)
- ambos os ecrãs chamam `aggregateCostsFromLogs()` em `src/lib/admin/system-queries.server.ts` para garantir paridade

`cost_daily` deixou de ser fonte primária. Continua a existir só para:
- reconciliação Apify (faturação real da monthly usage API) — exposta em `Expense30d.apify_billed_total_30d`, mostrada como Δ no card Apify quando diverge >5% do total agregado
- saldo DataForSEO (`details.balance_at_snapshot`)
- histórico que sobrevive a purge de logs

Receita › Faturas é mock declarado (DemoOnlySection); não é discrepância.

Nunca calcular custo a partir de cost_daily como fonte primária. Nunca mostrar custos sem janela declarada no UI.
