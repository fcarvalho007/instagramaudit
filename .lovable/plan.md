## Backfill — `actual_cost_usd` da Apify a partir do run metadata

**Sem novas execuções de actor. Apenas leituras `GET /v2/actor-runs/{runId}` para `apify_run_id` já registados.**

---

### Estado actual (consulta real à DB)

| Tabela | Total | `actual_cost_usd` em 0/NULL | Com `apify_run_id` | Sem `apify_run_id` |
|---|---|---|---|---|
| `provider_call_logs` (apify) | 72 | **65** | 70 | 2 |
| `apify_lab_runs` | 36 | **21** | 34 | 2 |

- Soma estimada PCL apify: **$0.6485**
- Soma actual PCL apify: **$0.4991** (7 rows já com valor)
- 4 runs (2 PCL + 2 Lab) sem `apify_run_id` → não-backfillable, listados no relatório final.

### Arquitectura

Já existe wrapper que sabe ler `usageTotalUsd` do endpoint canónico em `src/lib/analysis/apify-client.ts:355-366`. Vamos reutilizar a mesma URL (`GET https://api.apify.com/v2/actor-runs/{runId}?token=…`) num helper de backfill dedicado, sem tocar nas chamadas live.

### Mudanças propostas (build mode)

#### 1) Novo helper `src/lib/admin/apify-actual-cost-backfill.server.ts`

Server-only. Função única `backfillApifyActualCost(options)`:

- `options.scope`: `"provider_call_logs" | "apify_lab_runs" | "both"` (default `both`)
- `options.limit`: cap defensivo (default 500)
- `options.since`: opcional, ISO timestamp; default `null` (todas as rows com `actual_cost_usd` NULL ou 0)
- `options.driftThresholdPct`: default `30` — abaixo flag `drift`

Fluxo por row:
1. SELECT batches de 50 com `apify_run_id IS NOT NULL` e `(actual_cost_usd IS NULL OR actual_cost_usd = 0)`.
2. Para cada `apify_run_id`: `GET /v2/actor-runs/{runId}` com `Authorization: Bearer ${APIFY_TOKEN}` (mesmo helper `apifyFetch`, timeout 10 s). Rate limit: `await sleep(120)` entre chamadas → ~8 req/s, muito abaixo dos limites Apify.
3. Leitura de `data.usageTotalUsd` (number). Se `null/undefined` → marca `missing_usage` no relatório, NÃO escreve.
4. `UPDATE` da row com `actual_cost_usd = usageTotalUsd`. Para PCL, se já houver `estimated_cost_usd` e `|actual − estimated| / max(estimated, 0.001) > driftThresholdPct/100`, regista alerta em `usage_alerts` (kind=`apify_cost_drift`, severity=`warning`, metric_name=`actual_vs_estimated_pct`, metric_value=`drift_pct`, threshold_value=`driftThresholdPct`, notes inclui `run_id` e ambos os valores).
5. Erros HTTP 404 (run apagada na Apify) → marca `missing_remote`, NÃO escreve, continua.
6. Erros 401/403 → aborta imediatamente (token inválido).

Devolve resumo estruturado:
```ts
{
  scope, scanned, updated, skipped_missing_usage, skipped_missing_remote,
  skipped_no_run_id, drift_flagged, errors,
  sum_estimated_before, sum_actual_before, sum_actual_after,
  missing_run_ids: string[]   // IDs do PCL/Lab que não tinham apify_run_id
}
```

#### 2) Registar batch em `provider_billing_import_batches`

No fim do run, inserir uma linha:
```
provider               = 'apify'
period_start/period_end = min/max created_at das rows tocadas
imported_total_raw_cost_usd     = sum_actual_after − sum_actual_before (delta importado neste run)
imported_total_displayed_cost_usd = sum_actual_after (snapshot)
dashboard_total_actual_cost_usd   = 0  -- não temos comparação directa neste batch
reconciliation_status  = 'partial' se sobraram missing_*, senão 'completed'
source_note            = 'backfill_run_metadata'
```
Não é o caso de uso "ideal" da tabela (que é para importar invoice mensal), mas é o slot canónico para audit-trail e batem com `/admin` Receita > Billing Import.

#### 3) Rota admin TanStack `src/routes/api/admin/apify-backfill-actual-cost.ts`

`POST /api/admin/apify-backfill-actual-cost` com `requireAdminAuth` (mesmo padrão de `apify-lab.ts`). Body:
```json
{ "scope": "both", "limit": 500, "driftThresholdPct": 30, "dryRun": false }
```
- `dryRun: true` → faz as chamadas, calcula deltas e drift, mas NÃO escreve em DB nem cria `usage_alerts` nem `provider_billing_import_batches`. Permite preview no admin.
- Resposta = resumo do helper.

#### 4) Botão no admin

Em `src/components/admin/v2/sistema/` (ou `system-jobs-card.tsx` se existir, senão card novo "Backfill Apify actual cost"):
- Botão "Pré-visualizar" → `dryRun: true`.
- Botão "Aplicar backfill" → `dryRun: false`, com confirmação.
- Mostra a resposta: scanned, updated, drift_flagged, missing_run_ids (collapsible), sum antes/depois.

#### 5) Sem mudanças nos KPIs `/admin`

Hoje os KPIs já chamam `resolveCallCost(row)` (`src/lib/admin/cost-resolution.ts`) que prefere `actual_cost_usd` quando > 0 e cai para `estimated`. Backfill simplesmente fará as KPIs passarem a usar valores reais sem alterações de código.

### O que NÃO se altera

- Sem novas execuções de actor.
- Sem alterar wrapper `runActorWithMetadata` (já lê `usageTotalUsd`).
- Sem alterar contabilização Lab vs Produção (issue separado da auditoria anterior).
- Sem alterar `cost_daily` directamente — fica para o próximo `syncApifyCosts` reagregar a partir de PCL agora que as rows têm `actual_cost_usd`.

### Checkpoint ☐

- ☐ `src/lib/admin/apify-actual-cost-backfill.server.ts` criado, sem efeitos colaterais em `dryRun`.
- ☐ `src/routes/api/admin/apify-backfill-actual-cost.ts` com `requireAdminAuth`.
- ☐ Card admin com pré-visualização + aplicar (sem regressões noutros cards).
- ☐ `usage_alerts` gerados só para drift ≥30% e apenas em modo aplicar.
- ☐ Linha em `provider_billing_import_batches` com `source_note='backfill_run_metadata'` por cada run aplicado.
- ☐ Não há novos `provider_call_logs` criados, nem actor runs novos.
- ☐ Resposta da rota inclui: scanned, updated, drift_flagged, sum_estimated_before, sum_actual_before, sum_actual_after, missing_run_ids.

### Riscos e mitigações

- **Rate limit Apify**: 120 ms entre chamadas, batches de 50, cap 500 → ~60 s por run no pior caso. Aceitável para chamada admin manual.
- **Runs antigas purgadas pela Apify** (retenção de dataset ≠ retenção do run record; runs costumam ficar): tratadas como `missing_remote`, registadas e ignoradas.
- **`usageTotalUsd` ainda não finalizado**: para runs antigas (>1h) é sempre final; não há risco.
- **Token inválido**: aborta imediatamente, sem rows escritas.
- **Dupla escrita do batch em retries**: `dryRun` para verificar; em modo aplicar, batch é criado uma vez por chamada — não usar onConflict.

### Próximo prompt sugerido (depois deste)

> "Plano: actualizar `syncApifyCosts` para reagregar `cost_daily` a partir do PCL agora que `actual_cost_usd` está preenchido (mesmo padrão do OpenAI/DataForSEO em `cost-sync.server.ts`), em vez de depender só do endpoint mensal `/users/me/usage/monthly`."
