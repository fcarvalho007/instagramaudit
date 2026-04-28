# Plano — Gerador isolado de insights OpenAI

Criar a camada que, no futuro, vai gerar `ai_insights_v1` via OpenAI directo. Nesta fase **nada é ligado** ao `analyze-public-v1`, **nenhuma chamada** é feita, **nenhum UI** muda.

Os tipos (`AiInsightsV1`, `InsightsContext`, `AiInsightItem`), o cálculo de custo (`calculateOpenAiCost`), os gates (`isOpenAiAllowed`) e o logging (`recordProviderCall` com tokens) já existem da fase A — vamos reutilizá-los.

## Ficheiros a criar

### 1. `src/lib/insights/prompt.ts` (puro)
- `INSIGHTS_SYSTEM_PROMPT` — string determinística em pt-PT (AO90, impessoal, sem pt-BR), com regras explícitas:
  - Português de Portugal, sem formas brasileiras (lista negativa: "você", "tela", "celular", "usuário", "arquivo", etc.).
  - Não inventar métricas nem benchmarks. Só usar números presentes no payload.
  - Produzir 3 a 5 insights.
  - Cada insight: `id` SCREAMING_SNAKE estável, `title` curto, `body` ≤ 280 chars, terminar com acção concreta.
  - Cada insight deve citar pelo menos um `evidence` que corresponde a um caminho do payload (ex: `content_summary.average_engagement_rate`, `benchmark.tier_label`, `top_posts[0].engagement_pct`).
  - `confidence` ∈ {`"baseado em dados observados"`, `"sinal parcial"`}. Usar "sinal parcial" quando algum sinal citado vier ausente/null.
  - Acção concreta no fim do `body` (verbo no infinitivo impessoal: "Publicar", "Testar", "Reduzir").
- `buildInsightsUserPayload(ctx: InsightsContext)` → objecto JSON-safe minimal: `profile` (handle, followers, posts), `content_summary` (engagement, formatos), `top_posts` (cap a 3, caption ≤ 240 chars), `benchmark` (tier label/range/position) ou null, `competitors_summary`, `market_signals` flags, e um array `available_signals: string[]` enumerando os caminhos não-null para o validator e o modelo saberem o que existe.
- `hashInsightsPrompt(systemPrompt, userPayload)` → SHA-256 hex (16 chars) sobre `systemPrompt + "\n" + JSON.stringify(userPayload)` usando `crypto` (Worker-safe). Determinístico — mesma entrada, mesmo hash. Usado em `source_signals.inputs_hash` para drift detection.

### 2. `src/lib/insights/validate.ts` (puro)
- Schema Zod `aiInsightItemSchema` + `aiInsightsResponseSchema` para o JSON cru do modelo (3–5 insights).
- `validateInsights(raw: unknown, ctx: InsightsContext): { ok: true, insights: AiInsightItem[] } | { ok: false, reason: string, detail: string }`:
  - Falha se array vazio, < 3, > 5.
  - Falha se algum `title` ou `body` vazio/whitespace.
  - Falha se `body.length > 280`.
  - Falha se `confidence` não está nos dois valores permitidos.
  - Falha se `evidence` vazio.
  - Falha se algum `evidence` citado não está em `available_signals` derivado do `ctx`.
  - Heurística anti-genérico: rejeita insight cujo `body` não contém pelo menos um marker numérico/quantitativo (regex `/\d/` OU menção a um campo de `evidence` por nome). Devolve `reason: "GENERIC_OUTPUT"`.
  - Detecta tokens pt-BR óbvios (lista curta) → `reason: "PTBR_LEAK"`.
  - Ordena por `priority` desc antes de devolver.

### 3. `src/lib/insights/openai-insights.server.ts` (server-only)
- `export async function generateInsights(ctx: InsightsContext): Promise<InsightsGenerationResult>`.
- Fluxo:
  1. `isOpenAiAllowed(ctx.profile.handle)` → se não, devolver `{ ok: false, reason: "DISABLED" | "NOT_ALLOWED" }` sem chamar nada.
  2. `process.env.OPENAI_API_KEY` em falta → `{ ok: false, reason: "CONFIG_ERROR" }`.
  3. Resolver modelo: `process.env.OPENAI_INSIGHTS_MODEL ?? "gpt-4.1-mini"`.
  4. Construir `userPayload = buildInsightsUserPayload(ctx)` e `inputsHash = hashInsightsPrompt(SYSTEM, userPayload)`.
  5. `fetch("https://api.openai.com/v1/chat/completions", …)` com:
     - `Authorization: Bearer ${OPENAI_API_KEY}`,
     - `model`,
     - `messages: [{role:"system", …}, {role:"user", content: JSON.stringify(userPayload)}]`,
     - `response_format: { type: "json_schema", json_schema: { name: "ai_insights_v1", strict: true, schema: { … } } }`,
     - `temperature: 0.4`,
     - `max_tokens: 1200`,
     - `AbortController` com timeout 25s.
  6. `await res.json()`, extrair `choices[0].message.content`, `JSON.parse`.
  7. `validateInsights(parsed, ctx)` → se falhar, `recordProviderCall({ provider:"openai", actor:"insights", status:"http_error" or "config_error", model, promptTokens, completionTokens, totalTokens, estimatedCostUsd })` mesmo assim e devolver `{ ok: false, reason }`.
  8. `calculateOpenAiCost({ model, promptTokens, completionTokens })` a partir de `response.usage`.
  9. `recordProviderCall({ provider:"openai", actor:"insights:" + model, handle: ctx.profile.handle, status:"success", durationMs, model, promptTokens, completionTokens, totalTokens, estimatedCostUsd })`.
  10. Devolver `AiInsightsV1` completo:
      - `schema_version: 1`, `generated_at: new Date().toISOString()`, `model`, `source_signals: { inputs_hash, has_market_signals, has_dataforseo_paid }`, `insights`, `cost`.
- Tudo dentro de `try/catch` — qualquer erro vira `{ ok: false, reason: "OPENAI_ERROR" | "TIMEOUT" | "SCHEMA_INVALID", detail }` e nunca propaga. Mensagens de erro são sanitizadas (sem token).
- **Importante:** este ficheiro **não é importado** em lado nenhum nesta fase. Existe pronto para o Prompt B.

## Restrições de segurança
- Server-only (`*.server.ts`); proibido importar de cliente.
- Triple gate (`OPENAI_ENABLED` + `OPENAI_TESTING_MODE` + `OPENAI_ALLOWLIST`) verificado antes do `fetch`.
- Sem `OPENAI_API_KEY` → falha silenciosa, sem chamada.
- Timeout 25s + `AbortController`.
- `recordProviderCall` em todos os caminhos (success, falha de schema, falha HTTP) para a ledger nunca perder uma chamada paga.
- Validator rejeita output genérico, pt-BR, evidence inventado, body > 280, confidence inválido.

## Cálculo de custo
Reutiliza `calculateOpenAiCost` (já existe). Lê `usage.prompt_tokens` e `usage.completion_tokens` da resposta OpenAI; tabela em `cost.ts` cobre `gpt-4.1-mini` (0.4/1.6 USD/M) e `gpt-5-mini`. Modelo desconhecido → fallback conservador. Persistido em `cost.estimated_cost_usd` no `AiInsightsV1` e em `provider_call_logs.estimated_cost_usd` + tokens.

## Validação
- `bunx tsc --noEmit`
- `bun run build`
- Sem testes (o projecto não tem framework de testes instalado — não introduzir).
- Confirmar via `rg "openai-insights"` que nenhum outro ficheiro o importa.

## Fora de âmbito
- `analyze-public-v1.ts` — não tocar.
- `report.example.tsx` e qualquer UI — não tocar.
- PDF — não tocar.
- LOCKED_FILES — nenhum dos ficheiros a criar é locked.

## Checkpoint final
- ☐ `src/lib/insights/prompt.ts` criado (system prompt pt-PT + builder + hash)
- ☐ `src/lib/insights/validate.ts` criado (Zod + regras editoriais)
- ☐ `src/lib/insights/openai-insights.server.ts` criado (gates + fetch + log)
- ☐ `tsc --noEmit` ok
- ☐ build ok
- ☐ Zero chamadas OpenAI/Apify/DataForSEO durante a implementação
- ☐ Zero alterações a UI ou `/report/example`
- ☐ Próximo passo proposto: **Prompt C — wiring controlado em `analyze-public-v1` apenas para `frederico.m.carvalho` em runs fresh**
