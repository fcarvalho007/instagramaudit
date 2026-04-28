
# Refinamentos OpenAI Insights — pós-MVP

Avaliação completa após Prompts 1-4 + migração de tokens. Implementação está sólida; estes são os refinamentos com **impacto real**, ordenados por prioridade.

---

## Tier 1 — Antes do primeiro smoke test (recomendado)

### R1. Persistir `inputs_hash` separado para detecção de drift

`AiInsightsV1.source_signals.inputs_hash` já é calculado mas serve só como metadata. Para **decidir quando regenerar**, precisamos compará-lo com o hash do snapshot atual. Adicionar um helper no adapter:

```ts
// snapshot-to-report-data.ts
hasStaleAiInsights(payload): boolean // compara hash atual vs persistido
```

Sem isto, o admin nunca sabe se um `ai_insights_v1` antigo ainda corresponde aos dados base. Útil quando o botão de regeneração admin chegar.

### R2. Cap de custo total diário (kill-switch dinâmico)

Atualmente só temos `OPENAI_ENABLED` (binário). Falta um teto operacional. Adicionar em `openai-insights.server.ts`, antes de chamar OpenAI:

- Query `provider_call_logs` últimas 24h, `provider='openai'`, `status='success'`
- Soma `estimated_cost_usd`
- Se > `OPENAI_DAILY_CAP_USD` (default $5), retorna `failResult("DAILY_CAP_REACHED")`

Uma query rápida (< 50ms) que evita um runaway de custos por bug ou loop. Cap pode ser env var.

### R3. `safeText` para erros HTTP devolve mais sinal

Em `openai-insights.server.ts:152` quando OpenAI devolve erro, gravamos só os primeiros 500 chars do texto. Para erros típicos (429 rate limit, 401 invalid key, 400 schema rejection) é suficiente, mas convém **parsear o JSON de erro** quando vier para extrair `error.code` e `error.type` em vez de truncar texto bruto. Melhora muito o debugging no admin.

---

## Tier 2 — Admin observability (depois do primeiro smoke test)

### R4. Card OpenAI no cost-breakdown-panel já está mockado

`src/components/admin/cockpit/parts/cost-breakdown-panel.tsx:228` já tem `<ProviderCard provider="openai" bucket={summary.openai} />`, e a query em `diagnostics.ts` já lista `provider_call_logs`. **Falta verificar** que a agregação por provider inclui `openai` no bucket — possivelmente já filtra, possivelmente está hard-coded para Apify/DataForSEO. Inspecionar e ajustar.

### R5. Coluna `model` + tokens visíveis na tabela de chamadas

A migração adicionou as colunas mas a query `diagnostics.ts:292` seleciona só `id, created_at, actor, handle, status, http_status, duration_ms, posts_returned, estimated_cost_usd`. Adicionar `model, prompt_tokens, completion_tokens, total_tokens` ao select e mostrar na tabela admin.

### R6. Painel V2 de despesa (`expense-section.tsx`) usa MOCK

Os componentes em `src/components/admin/v2/` mostram custos OpenAI **mock**. Quando o smoke test correr, ligar à query real (similar à existente) ou marcar claramente como "mock" no UI até estar wired.

---

## Tier 3 — Qualidade dos insights (após observar primeiras gerações)

### R7. Glossário pt-PT mais defensivo

`PTBR_TOKENS` em `validate.ts:45` tem 9 tokens. Faltam alguns frequentes que o GPT pode escapar:

- `gerenciar` → "gerir"
- `acessar` → "aceder"
- `cadastr[oa]` → "registo"
- `relatório de mídia` → "relatório editorial"
- `time` (já listado mas comentado como "ambíguo") → manter, vale a regra

Adicionar quando vir leaks reais nas primeiras execuções, não preventivamente.

### R8. Limite de `body` (280 chars) pode ser apertado

280 chars é compatível com tweet-length mas o `ReportAiInsights` locked usa cards verticais. Ver no preview se 280 quebra o layout — se sim, baixar para 220.

### R9. Fallback para evidence cross-check com paths "similares"

Em `validate.ts:135`, se o modelo escrever `content_summary.engagement_rate` em vez de `content_summary.average_engagement_rate`, falhamos com `EVIDENCE_INVALID`. Para reduzir rejeições legítimas, fazer match por sufixo ou Levenshtein distance ≤ 3. Trade-off: relaxa o guard. **Só fazer se virmos rejeições falsas em produção.**

---

## Tier 4 — Não fazer agora (anti-scope creep)

- ❌ Botão admin de regeneração — combinado fica para depois do MVP
- ❌ Companion section visual com `confidence` + `evidence` — após validação editorial humana
- ❌ Re-geração automática de snapshots antigos — política definida: nunca
- ❌ Suporte a múltiplos modelos em A/B — prematuro
- ❌ Streaming de tokens — não traz valor a um job batch de 25s

---

## Próximo Passo Recomendado

Começar por **R1, R2 e R3** (Tier 1) — todos baixo-risco, todos protegem custo ou debugging antes de a primeira chamada real correr.

Depois, **smoke test controlado** com `frederico.m.carvalho`:
1. Setar `OPENAI_ENABLED=true` e `OPENAI_ALLOWLIST=frederico.m.carvalho`
2. POST a `analyze-public-v1` com `?refresh=1`
3. Verificar `provider_call_logs` para a linha OpenAI com `model`, tokens e custo
4. Verificar `analysis_snapshots.normalized_payload.ai_insights_v1`
5. Ver `/analyze/frederico.m.carvalho` — secção "Insights estratégicos" deve renderizar

Só **depois** do smoke test, atacar Tier 2 (admin) com dados reais para olhar.

Aprovas avançar com **R1 + R2 + R3** num único prompt?
