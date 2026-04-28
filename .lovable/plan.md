# Auditoria de atribuição de custos por provider

Modo: read-only + plano de implementação. Sem chamadas a Apify / DataForSEO / OpenAI. Sem alterações de UI, ficheiros locked ou `/report/example`.

---

## 1. Estado actual por provider

### Apify (`src/lib/analysis/apify-client.ts` + `src/routes/api/analyze-public-v1.ts`)

- Endpoint usado: `acts/{id}/run-sync-get-dataset-items`. Devolve **só os itens do dataset** — não devolve nem `runId`, nem `usageTotalUsd`, nem qualquer custo.
- `recordProviderCall` é chamado com `estimatedCostUsd` calculado por `estimateApifyCost` (heurística €/perfil + €/post).
- `apify_run_id` é sempre `null` (verificado em DB: 2 linhas Apify recentes, `apify_run_id IS NULL`, `actual_cost_usd IS NULL`).
- Conclusão: **custo Apify é apenas estimado**. O comentário em `src/lib/analysis/cost.ts:7` reconhece-o explicitamente ("reserved for a later pass that fetches Apify's real `usageTotalUsd` per run").

### DataForSEO (`src/lib/dataforseo/client.ts` + `src/lib/dataforseo/cost.ts`)

- `extractActualCost(envelope)` lê `envelope.cost` (ou soma `tasks[].cost`).
- `logCall` escreve **ambos**: `estimated_cost_usd` (tabela fixa por endpoint) e `actual_cost_usd` (do envelope).
- DB confirma: 5 linhas DataForSEO recentes têm `actual_cost_usd` populado (ex.: `0.00900`).
- Conclusão: **custo DataForSEO já é provider-reported**. Está correcto.

### PDF público (`src/routes/api/public/public-report-pdf.ts`)

- Não escreve em `provider_call_logs`. Só escreve em `analysis_events` com `estimated_cost_usd: 0`. Correcto — render local não tem custo de provider.

### OpenAI

- Sem fluxo activo. `report-cost-summary.server.ts` já tem a `branch` `provider === "openai" && totalEstimated > 0 → "calculated"` preparada (token-based). Aguarda escritor real.

### Classificador (`src/lib/admin/report-cost-summary.server.ts`)

- Já distingue: `provider_reported`, `estimated`, `calculated`, `cache_hit`, `not_used`.
- Lógica:
  - `totalActual > 0` → `provider_reported`
  - OpenAI com estimated > 0 → `calculated`
  - resto → `estimated`
  - sem rows → `cache_hit` (se esperado) ou `not_used`
  - tudo blocked/zero → `cache_hit`

---

## 2. Lacunas identificadas

| # | Lacuna | Severidade |
|---|---|---|
| L1 | Apify `actual_cost_usd` nunca é capturado | **Alta** — sem isto, todo o custo Apify é heurístico |
| L2 | `apify_run_id` nunca é persistido (impossível auditar runs no painel Apify) | Média |
| L3 | Fonte de custo (`provider_reported` vs `estimated` etc.) é **derivada** ad-hoc no classificador. Não existe coluna `cost_source` em `provider_call_logs` | Baixa — derivação funciona, mas torna queries diretas frágeis |
| L4 | `RecordProviderCallInput` não tem `actualCostUsd` nem `apifyRunId` na assinatura usada pelo fluxo Apify (DataForSEO contorna escrevendo direto na tabela) | Média |

---

## 3. Patch proposto (mínimo, seguro, sem providers)

Estratégia: capturar custo real **sem** mudar para o fluxo runs/datasets em duas etapas. Mantém-se `run-sync-get-dataset-items`, mas:

- Pede-se ao Apify para devolver headers extra. O endpoint sync-get-dataset-items **não** devolve custo no body, mas o header `x-apify-pay-per-event-pricing-info` e `x-apify-actor-run-id` (ou `x-apify-request-id`) estão disponíveis nas respostas de actors pay-per-event. Para actors clássicos, o run id volta no header `x-apify-actor-run-id`.
- Com o `runId` em mão, **opcionalmente** faz-se uma chamada GET `/v2/actor-runs/{runId}` (custo zero, contagem de leitura) **só quando o run termina**, para ler `usageTotalUsd`. Esta chamada é leve, não é "uso de Apify scraping" e é o método oficial documentado.
- Se o `runId` não vier no header (actor antigo), persistimos só o `estimated`.

Por ser potencialmente intrusivo, o plano divide-se em **duas fases**:

### Fase 3A — Capturar `apify_run_id` (custo zero, sem segunda chamada)

1. **`src/lib/analysis/apify-client.ts`**
   - Mudar a assinatura para devolver também os headers relevantes:
     ```ts
     return { items: data, runId, requestId };
     ```
   - Ler `res.headers.get("x-apify-actor-run-id")`.
   - Não muda o sucesso/erro.

2. **`src/routes/api/analyze-public-v1.ts` (`fetchProfileWithPostsLogged`)**
   - Receber o `runId` do client.
   - Passá-lo a `recordProviderCall({ apifyRunId: runId })`.

3. **`src/lib/analysis/events.ts`**
   - Já aceita `apifyRunId` — não muda a assinatura.

### Fase 3B — Capturar `actual_cost_usd` via Apify Run API

1. **Novo helper `fetchApifyRunCost(runId)`** em `src/lib/analysis/apify-client.ts`:
   - GET `https://api.apify.com/v2/actor-runs/{runId}` com `Authorization: Bearer ${APIFY_TOKEN}`.
   - Lê `data.usageTotalUsd` (campo oficial).
   - Timeout curto (3 s). Em erro → devolve `null`. Nunca lança.

2. **`fetchProfileWithPostsLogged`**:
   - Após sucesso e ter `runId`, chamar `fetchApifyRunCost(runId)` com `await`.
   - Passar a `recordProviderCall({ estimatedCostUsd, actualCostUsd })`.
   - `estimated` continua a ser persistido como fallback/sanity check.

3. **`RecordProviderCallInput`** (`src/lib/analysis/events.ts`)
   - Acrescentar `actualCostUsd?: number | null`.
   - No insert: `actual_cost_usd: input.actualCostUsd ?? null`.

### O que NÃO muda

- Schema de `provider_call_logs` — colunas `actual_cost_usd`, `estimated_cost_usd`, `apify_run_id` já existem.
- Classificador `report-cost-summary.server.ts` — já lida com `actual > 0` → `provider_reported`. Vai automaticamente "subir" a confiança do Apify de `estimated` para `provider_reported` assim que houver dados.
- DataForSEO — já correcto.
- UI admin — sem mudanças. Os labels `provider_reported / estimated / calculated / cache_hit / not_used` já existem em `src/lib/admin/cost-source-labels.ts`.
- Fluxo PDF — sem mudanças.

---

## 4. Ficheiros a editar

Fase 3A (mínimo):
- `src/lib/analysis/apify-client.ts` — devolver `{ items, runId }`.
- `src/routes/api/analyze-public-v1.ts` — propagar `runId` para `recordProviderCall`.

Fase 3B (custo real):
- `src/lib/analysis/apify-client.ts` — adicionar `fetchApifyRunCost(runId)`.
- `src/routes/api/analyze-public-v1.ts` — chamar fetcher e passar `actualCostUsd`.
- `src/lib/analysis/events.ts` — adicionar `actualCostUsd` à interface e ao insert.

Total: 3 ficheiros, mudanças cirúrgicas. Zero migrações de DB.

---

## 5. Riscos

| Risco | Mitigação |
|---|---|
| Header `x-apify-actor-run-id` ausente em actors legados | Se faltar, persiste só o estimated — comportamento actual. Sem regressão. |
| `fetchApifyRunCost` falha ou demora | Timeout 3s, try/catch a devolver `null`, `actual_cost_usd` fica `NULL` e classificador cai em `estimated`. |
| Race: run ainda não fechou quando consultamos `usageTotalUsd` | Como usamos `run-sync-get-dataset-items`, o run **já terminou** quando a resposta chega. Não há race. |
| Custo da chamada extra ao Apify Run API | A API de leitura de runs não conta como uso de scraping (não consome compute units). Custo efectivo: zero. |
| Mudança de assinatura do `apify-client.runActor` partir outros call-sites | Verificar com `rg "runActor\("` antes de implementar. Provavelmente único call-site é `fetchProfileWithPosts`. |

---

## 6. Checklist de validação

- ☐ Fase 3A: novo run em `/analyze/<allowlisted>` cria linha em `provider_call_logs` com `apify_run_id NOT NULL`.
- ☐ Fase 3B: mesma linha tem `actual_cost_usd > 0` e bate com o run no painel Apify (tolerância ±10% por arredondamentos).
- ☐ `estimated_cost_usd` continua presente como sanity check.
- ☐ `report-cost-summary` mostra `provider_reported` em vez de `estimated` para o Apify.
- ☐ Cache hit (segunda chamada) continua a não criar nova linha em `provider_call_logs`.
- ☐ DataForSEO inalterado: `actual_cost_usd` continua igual a `envelope.cost`.
- ☐ PDF público inalterado: sem novas linhas em `provider_call_logs`.
- ☐ `bunx tsc --noEmit` passa.
- ☐ Sem chamadas a Apify durante validação inicial — usar dados existentes em DB para confirmar classificador. Validação real só com 1 run autorizado a `frederico.m.carvalho`.

---

## Decisões que preciso de ti

1. Aprovas implementar **3A + 3B juntos** ou só **3A** primeiro (capturar `runId` sem ainda buscar custo real)?
2. Aprovas que a Fase 3B faça uma chamada extra GET `/v2/actor-runs/{runId}` ao Apify por análise fresca? (custo zero, latência +200–600ms)
3. Mantemos `estimated_cost_usd` para sempre como fallback ou eventualmente removemos quando `actual` ficar estável?

## Checkpoint

- ☐ Decisão sobre escopo (3A / 3A+3B)
- ☐ Aprovação da chamada extra à Apify Run API
- ☐ Confirmação de que sem mudanças de schema, sem migrações, sem alterações de UI
