
# Avaliação — OpenAI Insights (Prompts 1 → 4)

## Resumo

A implementação está sólida e segura. **Há 1 item por concluir do Prompt 1** (migração SQL nunca foi criada) e 2 melhorias menores opcionais. Tudo o resto está conforme o spec.

---

## Estado por Prompt

### Prompt 1 — Foundation
| Item | Estado |
|---|---|
| `src/lib/insights/cost.ts` | OK |
| `src/lib/insights/types.ts` | OK |
| `src/lib/security/openai-allowlist.ts` (3 gates) | OK |
| Edição `src/lib/analysis/events.ts` (campos `model`, `prompt_tokens`, `completion_tokens`, `total_tokens`) | OK no TS |
| **Migração para adicionar as 4 colunas em `provider_call_logs`** | **EM FALTA** |

Verificado via `\d provider_call_logs`: a tabela só tem `estimated_cost_usd`, `actual_cost_usd`, `posts_returned`. Não existem `model`, `prompt_tokens`, `completion_tokens`, `total_tokens`.

O writer em `events.ts` foi escrito defensivamente (só envia esses campos quando não nulos), por isso **não rebenta nada hoje**. Mas significa que **todas as métricas de tokens e modelo estão a ser silenciosamente descartadas** quando uma chamada OpenAI for feita. O admin nunca vai conseguir mostrar custo real, nem auditar tokens.

### Prompt 2 — Isolated Generator
| Item | Estado |
|---|---|
| `prompt.ts` (system + payload + hash) | OK |
| `validate.ts` (Zod, anti-pt-BR, evidence guard) | OK |
| `openai-insights.server.ts` (fetch direto, json_schema strict, timeout 25s) | OK |
| Triple gate aplicado | OK |
| Modelo configurável `OPENAI_INSIGHTS_MODEL`, default `gpt-4.1-mini` | OK |
| Logging via `recordProviderCall` | OK (ver Prompt 1 — colunas em falta) |

### Prompt 3 — Wiring no analyze-public-v1
| Item | Estado |
|---|---|
| Chamado só em fresh, nunca em cache hit | OK |
| Persistido em `normalized_payload.ai_insights_v1` | OK |
| `try/catch` isola falhas do fluxo Apify/DataForSEO | OK |
| Pre-check `isOpenAiAllowed` para evitar trabalho desnecessário | OK |
| Sem regeneração automática de snapshots antigos | OK |

### Prompt 4 — Render no Web Report
| Item | Estado |
|---|---|
| Map para `ReportData.aiInsights` `{number,label,text}` | OK |
| Ordenação por `priority` desc | OK |
| `number` zero-padded ("01", "02", ...) | OK |
| Hide quando `ai_insights_v1` ausente | OK |
| Sem placeholders | OK |
| Ficheiros locked não tocados | OK |
| `confidence` + `evidence` preservados em `ReportEnriched.aiInsights` | OK (companion, ainda não renderizado em UI) |
| `/report/example` intacto | OK |

---

## Itens por Concluir

### 1. CRÍTICO — Criar migração para colunas de tokens em `provider_call_logs`

```sql
ALTER TABLE public.provider_call_logs
  ADD COLUMN IF NOT EXISTS model text,
  ADD COLUMN IF NOT EXISTS prompt_tokens integer,
  ADD COLUMN IF NOT EXISTS completion_tokens integer,
  ADD COLUMN IF NOT EXISTS total_tokens integer;

CREATE INDEX IF NOT EXISTS idx_provider_call_logs_openai
  ON public.provider_call_logs (created_at DESC)
  WHERE provider = 'openai';
```

Sem isto, qualquer chamada OpenAI bem-sucedida grava a linha mas **perde model + tokens silenciosamente**, impedindo cost tracking real e auditoria.

### 2. Menor — Substituição AI vs determinísticas no report

Decisão #10 do spec: *"Quando ai_insights_v1 existir, os insights AI substituem as recomendações determinísticas no report principal; as determinísticas ficam como fallback."*

Atualmente ambos podem coexistir consoante o componente locked. Convém confirmar no `snapshot-to-report-data.ts` se as recomendações determinísticas (`recommendations` / `priorityActions` / equivalente) são limpas/substituídas quando `aiInsights.length > 0`. Não verifiquei esta secção em detalhe — vale uma passagem.

### 3. Opcional — Companion section para `confidence` + `evidence`

`ReportEnriched.aiInsights` já carrega `confidence` e `evidenceSummary` mas nada os renderiza. Como os componentes principais estão locked, faz sentido (no futuro) um pequeno bloco em `/analyze/$username` (não em locked) a mostrar essa transparência. Não é bloqueante para MVP.

---

## Próximo Passo Recomendado

Aprovar este plano para eu:
1. Criar a migração SQL acima (item 1).
2. Verificar e, se necessário, ajustar a substituição AI/determinístico (item 2).

Depois, num prompt separado, podemos:
- Definir secrets reais (`OPENAI_ENABLED=true`, `OPENAI_ALLOWLIST=frederico.m.carvalho`) e correr o smoke test controlado.
- (Mais tarde) Adicionar o companion de confidence/evidence e o painel admin de custos OpenAI.
