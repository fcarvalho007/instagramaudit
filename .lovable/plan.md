
# Propagar analysis_event_id a todas as chamadas de provider

## Problema

Das 72 rows em `provider_call_logs` com status=success, apenas 10 (todas Apify) têm `analysis_event_id`. OpenAI (29) e DataForSEO (11) nunca recebem o ID porque:

1. O `analysisEventId` é criado na linha ~967 de `analyze-public-v1.ts`
2. As chamadas OpenAI (insights v1, v2, visual cover, caption semantic) acontecem **depois** (linhas ~988-1140)
3. O `linkProviderCallsToEvent` corre logo após o `logEvent`, antes das chamadas OpenAI
4. DataForSEO usa `supabaseAdmin.from("provider_call_logs").insert(...)` directamente, sem campo `analysis_event_id`
5. Os 4 módulos OpenAI (`logCall` em `openai-insights.server.ts`, `visual-cover-analysis.server.ts`, `caption-semantic-analysis.server.ts`) não aceitam nem passam `analysisEventId`

## Solução

### Task 1 — Adicionar `analysisEventId` aos 4 módulos OpenAI

**`src/lib/insights/openai-insights.server.ts`**
- Adicionar `analysisEventId?: string | null` ao interface `LogCallInput` e à assinatura de `generateInsights` / `generateInsightsV2` (via options object)
- Passar para `recordProviderCall` no `logCall`

**`src/lib/report/visual-cover-analysis.server.ts`**
- Adicionar `analysisEventId?: string | null` a `VisualCoverInput`
- Passar para `recordProviderCall` no `logCall` interno

**`src/lib/report/caption-semantic-analysis.server.ts`**
- Adicionar `analysisEventId?: string | null` ao input
- Passar para `recordProviderCall`

### Task 2 — Adicionar `analysis_event_id` ao DataForSEO client

**`src/lib/dataforseo/client.ts`**
- Adicionar `analysisEventId?: string | null` a `LogInput` e à opção de `callDataForSeo`
- Incluir `analysis_event_id` no `.insert()`

### Task 3 — Propagar o ID no `analyze-public-v1.ts`

O `analysisEventId` é criado na linha ~967. Todas as chamadas que acontecem depois devem recebê-lo:

- `generateInsights(ctx)` → `generateInsights(ctx, { analysisEventId })`
- `generateInsightsV2(ctxV2, { previous })` → adicionar `analysisEventId` ao options
- `generateVisualCoverAnalysis({ handle, ... })` → adicionar `analysisEventId`
- `generateCaptionSemanticAnalysis({ handle, ... })` → adicionar `analysisEventId`
- Para DataForSEO: já corre ANTES do event, mas o `linkProviderCallsToEvent` final resolve isso

Mover o `linkProviderCallsToEvent` para DEPOIS de todas as chamadas (após a snapshot enrichment, ~linha 1193), para capturar também as chamadas DFS e OpenAI que não têm `analysisEventId` passado directamente.

### Task 4 — Warning defensivo

Se `recordProviderCall` recebe `analysisEventId` como undefined/null, emitir `console.warn("[analytics] provider call without analysis_event_id", { actor, handle })` — nunca throw.

### Task 5 — Actualizar lógica de confiança

Na `fetchReportCounts` em `system-queries.server.ts`, melhorar a confiança:
- Verificar que os events ligados têm chamadas dos 3 provider groups esperados (apify, openai, dataforseo)
- Alta: ≥20 fresh reports com os 3 groups presentes
- Média: 5-19 fresh reports ligados
- Baixa: <5 ou grupos em falta
- Adicionar `fresh_linked_provider_groups: number` ao retorno (count de events que têm ≥2 providers distintos)
- Actualizar sub-text no Card 4 para mostrar `X/Y chamadas com analysis_event_id`

### Ficheiros a editar

1. `src/lib/insights/openai-insights.server.ts` — aceitar e propagar `analysisEventId`
2. `src/lib/report/visual-cover-analysis.server.ts` — aceitar e propagar `analysisEventId`
3. `src/lib/report/caption-semantic-analysis.server.ts` — aceitar e propagar `analysisEventId`
4. `src/lib/dataforseo/client.ts` — aceitar e propagar `analysis_event_id`
5. `src/routes/api/analyze-public-v1.ts` — passar `analysisEventId` + mover `linkProviderCallsToEvent` para o fim
6. `src/lib/analysis/events.ts` — warning defensivo em `recordProviderCall`
7. `src/lib/admin/system-queries.server.ts` — melhorar confiança
8. `src/components/admin/v2/visao-geral/expense-section.tsx` — sub-text actualizado

### Ficheiros que NÃO mudam

P01–P07 UI, report shell, PDF pipeline, tokens, locked files, Supabase schema (a coluna `analysis_event_id` já existe).

### Validação

- `bunx tsc --noEmit`
- `bunx vitest run`
- Query para verificar que a estrutura suporta linkage
