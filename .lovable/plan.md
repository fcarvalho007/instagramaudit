## Estado atual (auditoria)

Tarefas 1–4 já implementadas em turnos anteriores:

| Tarefa | Ficheiro | Estado |
|---|---|---|
| 1. Helper budget OpenAI | `src/lib/security/openai-budget.server.ts` | ✅ existe — cap default 5 USD, lê `OPENAI_DAILY_CAP_USD`, soma `actual ?? estimated` de `provider_call_logs` (provider='openai') desde 00:00 UTC, cache 60s, fail-open em erro de query |
| 2. Gate antes de cada job | `src/lib/enrichment/run-enrichment.server.ts` L335/383/432/501 | ✅ `assertOpenAiDailyBudgetAvailable()` no início dos 4 jobs (insights_v1, insights_v2, visual_cover, caption_semantic) |
| 3. Skip sem quebrar relatório | mesmo ficheiro | ✅ `catch (err instanceof OpenAiBudgetExceededError)` → `console.warn` + `return { ok: true, payloadPatch: null }` (mesma forma que `DISABLED`/`NOT_ALLOWED`); relatório fica com fallback determinístico, sem erro técnico ao público |
| 4. Sanitização erros públicos | `src/routes/api/analyze-public-v1.ts` | ✅ `failure(code, extra?)` passa por `sanitizeExtra()` (allowlist: só `retry_after_seconds`). As 3 `failure(...)` críticas (`UPSTREAM_UNAVAILABLE`/`PROFILE_NOT_FOUND`/`UPSTREAM_FAILED`) já não passam `extra`. `provider_message`/`provider_status`/`run_id`/`err.message` ficam só em `console.error` e em `provider_call_logs.error_excerpt` |
| 5a. Testes budget OpenAI | `src/lib/security/__tests__/openai-budget.test.ts` | ✅ 6 testes (cap default, env override, soma, abaixo do cap, ao atingir cap, fail-open) |

## O que falta — Tarefa 5 (apenas testes adicionais)

Faltam 3 testes pedidos no brief que não existem ainda:

### 5b. Test: skipped OpenAI job não quebra o relatório

Novo ficheiro `src/lib/enrichment/__tests__/run-enrichment-budget.test.ts`:

- Mock `assertOpenAiDailyBudgetAvailable` para lançar `OpenAiBudgetExceededError`
- Mock mínimo de `supabaseAdmin` e do gate `isOpenAiAllowed` (true)
- Chamar `runInsightsV1` (e um dos restantes) e asserir:
  - resolve com `{ ok: true, payloadPatch: null }`
  - `console.warn` foi invocado
  - `OpenAI` SDK NUNCA é chamado (spy a `@/lib/insights/openai-insights.server`)

### 5c. Test: resposta pública não expõe internos de provider

Novo ficheiro `src/routes/api/__tests__/analyze-public-v1-sanitize.test.ts` (apenas testa `sanitizeExtra`, sem subir o handler):

- Importar `sanitizeExtra` (já exportado L158)
- Casos:
  - `{ provider_message: "...", provider_status: 500, run_id: "abc", details: "raw" }` → `undefined`
  - `{ retry_after_seconds: 30, provider_message: "x" }` → `{ retry_after_seconds: 30 }`
  - `{}` e `undefined` → `undefined`

### 5d. Test: comportamento Apify inalterado

Garantir que a suite existente `src/lib/security/__tests__/apify-budget.test.ts` continua verde (já existe, é regressão).

## Validação

- `bunx tsc --noEmit`
- `bunx vitest run` — esperado: suite atual (6 OpenAI + Apify + restantes) + 2 novos ficheiros, todos verdes.

## Constraints respeitadas

- Sem alterações à UI do relatório ✓
- Sem mudanças no Block 1/2 ✓
- Sem chamadas OpenAI/Apify/DataForSEO ✓ (testes usam mocks)
- Sem regeneração de relatórios, sem emails, sem Brevo/Resend ✓
- Sem alteração ao schema de snapshots ✓

## Entregáveis pós-build

- Lista de ficheiros tocados (2 novos testes)
- Confirmação do comportamento budget (cap default 5 USD, skip silencioso)
- Confirmação da sanitização (allowlist `retry_after_seconds` apenas)
- Output de `tsc` e `vitest`
