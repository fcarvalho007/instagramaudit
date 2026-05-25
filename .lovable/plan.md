
# Ligar cadência corrigida à OpenAI (v2)

## Diagnóstico

- `computeCadence()` em `src/lib/report/cadence.ts` produz `{ method, weekly, sampleSize, windowDays, sufficient, excludedPinned, reliability, warnings, notePt }`.
- Hoje é usado em `snapshot-to-report-data.ts` (UI) mas **não chega à OpenAI**.
- `buildInsightsUserPayload()` em `src/lib/insights/prompt.ts` envia apenas `content_summary.estimated_posts_per_week` (round2 do valor cru do scraping). É este número que o `hero` cita na linha 70 do `prompt-v2.ts`.
- `buildCtxForInsights()` em `run-enrichment.server.ts` chama `buildInsightsCtx()` com `posts` cruas — temos acesso aos posts para calcular cadência aqui.
- O schema v2 (`RESPONSE_JSON_SCHEMA_V2`) é apenas o output do modelo; **cadence entra no user payload, não no schema de resposta**.

## Mudanças

### 1. Tipos (`src/lib/insights/types.ts`)
Adicionar à `InsightsContext`:
```ts
cadence: {
  weekly: number | null;        // null quando insufficient
  method: "window_30d" | "window_90d" | "sample_span" | "insufficient";
  sampleSize: number;
  windowDays: number | null;    // null quando insufficient
  sufficient: boolean;
  pinnedExcluded: number;
  reliability: "high" | "medium" | "low";
  note: string | null;          // notePt (pt-PT)
};
```
E ao tipo do `InsightsUserPayload` em `prompt.ts` (mesma shape, sem `reliability` interno — ver ponto 3).

### 2. Construção do contexto (`src/lib/insights/build-context.ts`)
- Importar `computeCadence` de `@/lib/report/cadence`.
- Mapear `posts` (já tem `taken_at_iso`/`is_pinned`) para `CadenceInputPost[]` e calcular `cadence`.
- Adicionar `cadence` ao `InsightsContext` retornado.

### 3. Payload OpenAI (`src/lib/insights/prompt.ts`)
- Em `buildInsightsUserPayload`, serializar `cadence` no objeto raiz:
  - `weekly`: `round2(c.weekly)` se `c.sufficient`, senão `null`.
  - `windowDays`: `c.windowDays` se `c.sufficient`, senão `null`.
  - `pinnedExcluded`: omitir quando `=== 0` (mantém payload enxuto e hash estável quando não há pinned).
  - `note`: incluir só quando `!c.sufficient` ou `c.reliability === "low"`.
- **Não remover** `content_summary.estimated_posts_per_week` (compat com v1 e com `previous.inputs_hash` de snapshots antigos é quebrada de qualquer forma pelo novo campo — o cache vai naturalmente invalidar uma vez e reestabilizar).

### 4. Prompt v2 (`src/lib/insights/prompt-v2.ts` → `SYSTEM_PROMPT_BASE` + secção `hero`)
Adicionar bloco "Cadência (regras obrigatórias)" antes das secções:
- Usar **apenas** `cadence.weekly` e `cadence.method`. Ignorar `content_summary.estimated_posts_per_week`.
- Se `cadence.sufficient === false`: **proibido** afirmar cadência fraca/forte, "publica pouco", "ritmo irregular". Usar "amostra recente insuficiente para concluir sobre o ritmo".
- Se `cadence.method === "window_30d"`: pode referir "nos últimos 30 dias".
- Se `cadence.method === "window_90d"`: pode referir "nos últimos 90 dias".
- Se `cadence.method === "sample_span"`: descrever como "ritmo observado na amostra recente", **nunca** "por semana" sem qualificador.
- Se `cadence.pinnedExcluded > 0`: não mencionar pinned no copy público a menos que essencial; o número de cadência já os exclui.
- Não repetir o número se já estiver no KPI strip — só citar se sustentar o diagnóstico (regra atual mantém-se).
- Não dizer "low cadence" se `cadence.sufficient === true` e `weekly >= 1`.

Actualizar a frase do `hero` na linha 70 para citar **`cadence.weekly` (não `estimated_posts_per_week`)** e remover o exemplo "5 publicações por semana dominadas por Reels" pelo equivalente com `cadence.weekly`.

### 5. Testes novos

**`src/lib/insights/__tests__/cadence-payload.test.ts`** (novo):
- `buildInsightsUserPayload` inclui `cadence` com a shape esperada.
- Fixture robs.cortez (2 pinned antigos + 10 recentes em ~13 dias) → `cadence.method === "window_30d"`, `sampleSize === 10`, `sufficient === true`, `pinnedExcluded === 2`.
- Fixture cadência insuficiente (3 posts) → `weekly: null`, `windowDays: null`, `sufficient: false`, `note` presente.
- Fixture `sample_span` (8 posts ao longo de 120 dias) → `method === "sample_span"`, `weekly` numérico.
- `pinnedExcluded` omitido quando `=== 0`.

**`src/lib/insights/__tests__/validate-v2-verdict.test.ts`** (existente): manter — não afecta o schema de resposta.

### 6. Não mexer
- Sem nova chamada OpenAI (mesma `generateInsightsV2`).
- Sem alterações ao `RESPONSE_JSON_SCHEMA_V2` (cadência é input, não output).
- Sem alterações de UI (já feitas em iteração anterior).
- Sem regenerar snapshots; `previous.inputs_hash` invalida naturalmente uma vez por perfil afectado quando o cache for verificado.

## Ficheiros tocados

- `src/lib/insights/types.ts` — adicionar `cadence` ao `InsightsContext`.
- `src/lib/insights/build-context.ts` — calcular e injectar cadence.
- `src/lib/insights/prompt.ts` — serializar cadence no payload + tipo `InsightsUserPayload`.
- `src/lib/insights/prompt-v2.ts` — bloco de regras de cadência no system prompt + hero.
- `src/lib/insights/__tests__/cadence-payload.test.ts` — novo.

## Validação

```
bunx tsc --noEmit
bunx vitest run
```

## Garantias

- **Zero novas chamadas OpenAI**: mesma função `generateInsightsV2`, mesmo endpoint, mesmo número de tokens (payload cresce ~6 chaves, irrelevante em custo).
- **Custo provider estável**: input payload aumenta ~80 bytes; <0,01% de variação de custo por chamada.
- **Snapshots antigos**: continuam a renderizar (mudança é só no input para gerações futuras; output schema inalterado).
- **Cache**: primeira chamada por perfil invalida `inputs_hash`; depois reestabiliza.
