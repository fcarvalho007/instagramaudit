# OpenAI Insights — camada cacheada, opcional e cost-logged

Modo: plano. Sem chamadas a OpenAI. Sem alterações a billing nem componentes locked.

---

## 1. Princípios não-negociáveis

| Princípio | Como é garantido |
|---|---|
| OpenAI **não cria métricas** | Prompt recebe só números já computados pelo snapshot |
| OpenAI **só interpreta** | Saída é texto/insights, nunca números recalculados |
| **Persistência única** por snapshot | Insights vivem em `normalized_payload.ai_insights_v1` |
| **Sem repetir chamadas** | Cache hit no snapshot bypassa OpenAI; lock por `snapshot_id` |
| **Logging completo** | Nova linha em `provider_call_logs` por chamada |
| **Kill-switch** | `OPENAI_ENABLED=false` desliga tudo, sem deploy |
| **Fallback sempre** | Falha OpenAI → recomendações determinísticas continuam |
| **Sem chamada no PDF** | PDF lê só do snapshot; nunca trigga geração |
| **Sem chamada por page load** | Geração só acontece no momento da análise fresca |

---

## 2. Arquitectura do endpoint

### 2.1 Onde injectar

Não é um endpoint próprio. É um **passo opcional** dentro do fluxo existente em `src/routes/api/analyze-public-v1.ts`, **depois** de `enrichPosts` + `computeBenchmarkPositioning` + `market_signals_free` ficarem prontos, e **antes** de `storeSnapshot`.

```text
[Apify run] → normalizeProfile + enrichPosts → benchmark engine
   → market_signals_free (DataForSEO) → ai_insights (OpenAI, opcional)
   → storeSnapshot
```

### 2.2 Helper isolado

Novo ficheiro `src/lib/insights/openai-insights.server.ts`:

```ts
export interface InsightsContext {
  handle: string;
  profile: PublicAnalysisProfile;
  enriched: EnrichedPosts;
  benchmark: BenchmarkPositioning | undefined;
  marketSignals?: MarketSignalsFree | null;
  competitorMedianEngagementPct: number | null;
}

export interface AiInsightsV1 {
  schema_version: "v1";
  generated_at: string;
  model: string;
  insights: Array<{
    number: 1 | 2 | 3 | 4 | 5;
    label: string;        // ex: "Cadência editorial"
    text: string;         // 2-3 frases pt-PT
    signal_ref: string;   // "engagement_pct=4.2; benchmark_p50=2.1"
    confidence: "baseado em dados observados" | "sinal parcial";
  }>;
  fallback_used: boolean;
  prompt_hash: string;    // sha256 do prompt para cache de versionamento
}

export async function generateInsights(ctx: InsightsContext): Promise<AiInsightsV1 | null>
```

Função:
1. Se `!isOpenAiEnabled() || !isAllowed(handle)` → return `null` (caller usa determinístico).
2. Constrói prompt determinístico a partir do `ctx`.
3. Calcula `prompt_hash` (sha256 do prompt).
4. Faz call OpenAI **com tool calling** para garantir output estruturado.
5. Loga em `provider_call_logs` (provider="openai") com tokens + cost.
6. Devolve `AiInsightsV1` ou `null` em caso de erro (caller continua com determinístico).

### 2.3 Kill-switch + allowlist

Novo ficheiro `src/lib/security/openai-allowlist.ts` (cópia adaptada de `apify-allowlist.ts`):

```ts
export function isOpenAiEnabled(): boolean {
  return process.env.OPENAI_ENABLED === "true";
}
export function isOpenAiTestingModeActive(): boolean {
  return process.env.OPENAI_TESTING_MODE !== "false";
}
export function getOpenAiAllowlist(): string[] { /* parse OPENAI_ALLOWLIST */ }
export function isOpenAiAllowed(handle: string): boolean { /* ... */ }
```

Defaults: `OPENAI_ENABLED` ausente → OFF. `OPENAI_TESTING_MODE` ausente → ON (restritivo).

---

## 3. Prompt template

### 3.1 Sistema (constante, versionada)

```
És analista de marketing digital sénior em Portugal. Escreves em português europeu (Acordo 1990, sem brasileirismos, sem "você"). Tom: pragmático, editorial, sem exageros.

Recebes métricas JÁ CALCULADAS de um perfil de Instagram. NUNCA inventes números. NUNCA cites benchmarks que não estejam no input. NUNCA uses palavras como "viral", "explosivo", "incrível".

Devolves 3 a 5 insights ESTRATÉGICOS. Cada insight DEVE:
- referenciar UM signal específico do input (ex: "engagement_pct=4.2 vs benchmark_p50=2.1")
- ter 2-3 frases, máximo 280 caracteres
- terminar com acção concreta
- marcar confidence="sinal parcial" se basear-se em <5 posts ou métricas null

Devolves via tool call `submit_insights`.
```

### 3.2 User (gerado por handle)

JSON compacto com **só** os campos necessários:

```json
{
  "handle": "frederico.m.carvalho",
  "profile": { "followers": 9457, "is_verified": true, "posts_count": 2616 },
  "engagement": { "avg_pct": 4.2, "avg_likes": 380, "avg_comments": 5 },
  "format_mix": { "Reels": { "share_pct": 75, "avg_eng_pct": 5.1 }, ... },
  "cadence": { "posts_per_week": 3.2 },
  "benchmark": { "tier": "10k", "p50": 2.1, "p75": 3.8, "user_position": "p90" },
  "competitor_median_eng_pct": 1.8,
  "top_post": { "format": "Reels", "engagement_pct": 8.4, "weekday": 1, "hour": 14 },
  "market_signals": { "top_keyword": "marketing digital", "top_volume": 14800 } | null
}
```

### 3.3 Tool schema (forçar estrutura)

```json
{
  "type": "function",
  "function": {
    "name": "submit_insights",
    "parameters": {
      "type": "object",
      "properties": {
        "insights": {
          "type": "array", "minItems": 3, "maxItems": 5,
          "items": {
            "type": "object",
            "properties": {
              "label": { "type": "string", "maxLength": 40 },
              "text": { "type": "string", "maxLength": 280 },
              "signal_ref": { "type": "string", "maxLength": 120 },
              "confidence": { "type": "string", "enum": ["baseado em dados observados", "sinal parcial"] }
            },
            "required": ["label", "text", "signal_ref", "confidence"],
            "additionalProperties": false
          }
        }
      },
      "required": ["insights"], "additionalProperties": false
    }
  }
}
```

### 3.4 Modelo

`google/gemini-3-flash-preview` via Lovable AI Gateway (default workspace, mais barato; já temos `LOVABLE_API_KEY`). Mantemos o nome `OPENAI_*` nas env vars por consistência com o pedido do utilizador, mas o gateway é Lovable AI. **Decisão pendente** — ver questões no fim.

---

## 4. Estratégia de cache

### 4.1 Camadas

```text
1. Snapshot cache hit  → ai_insights_v1 já lá → ZERO calls
2. Snapshot fresh      → tenta gerar → persiste no payload
3. Geração falhou      → fallback determinístico, NÃO persiste insights
4. Re-geração manual   → admin action (botão "regenerar insights")
```

### 4.2 Versionamento

- `schema_version: "v1"` no payload.
- `prompt_hash` permite invalidar quando o prompt sistema mudar (re-deploy).
- Quando `lookupSnapshot` devolve hit mas `ai_insights_v1.prompt_hash !== currentPromptHash`, **não** regenera automaticamente (custo). Marca como stale e admin decide.

### 4.3 Concorrência

Risco: dois pedidos fresh para o mesmo handle ao mesmo tempo → 2 calls OpenAI.

Mitigação: o `analyze-public-v1` já tem cache lookup pré-Apify. A janela de race é estreita (1 análise/handle/segundo na prática). Aceitamos o risco no MVP. Se virar problema, adicionar advisory lock `pg_try_advisory_xact_lock(handle_hash)`.

---

## 5. Provider cost logging

Reutilizar `recordProviderCall` com extensão mínima ao tipo:

```ts
// src/lib/analysis/events.ts
export interface RecordProviderCallInput {
  // ... existente ...
  provider?: "apify" | "dataforseo" | "openai";
  model?: string | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
  actualCostUsd?: number | null;  // já vai entrar pelo plano Apify cost
}
```

### 5.1 Migração `provider_call_logs`

```sql
ALTER TABLE provider_call_logs
  ADD COLUMN model text,
  ADD COLUMN prompt_tokens integer,
  ADD COLUMN completion_tokens integer,
  ADD COLUMN total_tokens integer;
-- actual_cost_usd já existe
```

### 5.2 Cost calculator

```ts
// src/lib/insights/cost.ts
const PRICING = {
  "google/gemini-3-flash-preview": { input: 0.0000003, output: 0.0000025 }, // $/token
  "openai/gpt-5-mini": { input: 0.000001, output: 0.000004 },
};
export function calcOpenAiCost(model: string, p: number, c: number): number {
  const r = PRICING[model] ?? PRICING["google/gemini-3-flash-preview"];
  return Number((p * r.input + c * r.output).toFixed(6));
}
```

`estimated_cost_usd` é o cálculo acima (sempre presente). `actual_cost_usd` é o mesmo (Lovable AI gateway não devolve cost discreto por chamada, é "calculated"). No admin marca-se como `cost_source: "calculated"`.

---

## 6. Visibilidade no admin

`/admin` já mostra cost breakdown por provider via `report-cost-summary.server.ts`. Adicionar:

- Card novo: **"AI Insights · OpenAI"** com `analyses_with_insights`, `total_tokens_30d`, `total_cost_30d`, `failure_rate`.
- Filtro no log table por `provider=openai`.
- Por snapshot, mostrar `ai_insights_v1.fallback_used` para perceber quando determinístico foi usado.
- Botão "Regenerar insights" (Prompt H opcional) — admin-only, com confirmação de custo.

---

## 7. Estratégia de rendering

### 7.1 Web report (`/analyze/$username`)

- `snapshotToReportData` lê `payload.ai_insights_v1.insights` e mapeia para `reportData.aiInsights`.
- Quando `ai_insights_v1` não existe ou `insights.length === 0` → `reportData.aiInsights = []` → componente `ReportAiInsights` retorna `null` (já é o comportamento actual, linha 13-15).
- Adicionar pequeno chip de confidence dentro do componente:
  - "baseado em dados observados" → chip cyan
  - "sinal parcial" → chip amber
- **Não** mexer em mais nada do `ReportAiInsights` (não está locked, mas fica intacto editorialmente).

### 7.2 Recomendações determinísticas vs IA

| Estado | Web report | PDF |
|---|---|---|
| `ai_insights_v1` presente | Mostra IA + esconde determinísticas | PDF mostra IA |
| `ai_insights_v1` ausente | Mostra determinísticas (já hoje) | PDF mostra determinísticas |
| `ai_insights_v1.fallback_used: true` | (caso edge) Mostra determinísticas | PDF mostra determinísticas |

### 7.3 PDF strategy

- `src/lib/pdf/render.ts` lê `payload.ai_insights_v1` se presente.
- Se presente: nova secção "Leitura estratégica" no PDF (após benchmarks, antes das recomendações). Recomendações determinísticas continuam **escondidas** ou viram secção secundária "Sugestões adicionais".
- Se ausente: comportamento actual (recomendações determinísticas).
- **PDF nunca trigga geração**. Nunca chama OpenAI. Lê só do JSON.

---

## 8. Plano de implementação em prompts pequenos

### Prompt A — Foundation (kill-switch + cost columns)
- Criar `src/lib/security/openai-allowlist.ts`.
- Migração SQL: `ALTER TABLE provider_call_logs ADD COLUMN model, prompt_tokens, completion_tokens, total_tokens`.
- Pedir secrets `OPENAI_ENABLED=false`, `OPENAI_TESTING_MODE=true`, `OPENAI_ALLOWLIST=frederico.m.carvalho`.
- Estender `RecordProviderCallInput` (events.ts) com novos campos opcionais.
- ☐ `bunx tsc --noEmit`

### Prompt B — Helper isolado (sem wire-up ainda)
- Criar `src/lib/insights/types.ts` (`AiInsightsV1`, `InsightsContext`).
- Criar `src/lib/insights/cost.ts` (calculator).
- Criar `src/lib/insights/prompt.ts` (system prompt + builder de user payload, puro).
- Criar `src/lib/insights/openai-insights.server.ts` (fetch + tool call + log).
- Tests deterministicos para `prompt.ts` e `cost.ts`.

### Prompt C — Wire-up no analyze flow
- Em `analyze-public-v1.ts`, após `marketSignalsFree` ficar pronto e antes de `storeSnapshot`:
  ```ts
  const aiInsights = await generateInsights({ handle, profile, enriched: primaryEnriched, benchmark, marketSignals, competitorMedianEngagementPct });
  storeSnapshot({ ...payload, ai_insights_v1: aiInsights ?? undefined });
  ```
- Try/catch silencioso — falha nunca quebra o fluxo.

### Prompt D — Web rendering
- Estender `snapshot-to-report-data.ts` para mapear `payload.ai_insights_v1.insights` → `reportData.aiInsights`.
- Adicionar campo `confidence` ao tipo `AiInsight` consumido pelo componente.
- Pequeno chip de confidence no `ReportAiInsights`.

### Prompt E — PDF rendering
- `src/lib/pdf/render.ts` lê `ai_insights_v1`.
- Se presente: nova secção; recomendações determinísticas viram colapsadas ou removidas.
- Se ausente: nada muda.

### Prompt F — Admin visibility
- Card "AI Insights" no `/admin/v2/visao-geral`.
- Filtro provider="openai" no log table.

### Prompt G — Run controlada (após aprovação explícita)
- Activar `OPENAI_ENABLED=true` por 1 análise.
- Forçar refresh de `frederico.m.carvalho`.
- Validar payload, custo, latência.
- Decidir se mantém activo no allowlist.

### Prompt H — Opcional: regeneração admin-only
- Botão "Regenerar insights" no admin.
- Endpoint `POST /api/admin/regenerate-insights` com auth admin.

---

## 9. Custos esperados

Por análise: ~1.500 prompt tokens + ~600 completion tokens.

| Modelo | Custo/análise | Mensal (100 análises) |
|---|---|---|
| google/gemini-3-flash-preview | ~$0.0020 | $0.20 |
| openai/gpt-5-mini | ~$0.0040 | $0.40 |
| openai/gpt-5 | ~$0.0240 | $2.40 |

Comparar com Apify (~$0.011/análise): IA é **5× mais barata** com Flash, similar com mini. Decisão obvia: **Flash** para v1.

---

## 10. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Hallucination de números | Tool schema sem campos numéricos; só strings |
| Insight genérico ("aposta em Reels") | Validador pós-resposta: rejeita se `signal_ref` não contém `=` ou `:` |
| Drift de tom (brasileirismos) | System prompt explícito; spot-check no Prompt G |
| Custo inesperado | `OPENAI_TESTING_MODE=true` + allowlist por defeito |
| Latência (+1-3s) | Acontece só em análises fresh, que já levam 8-15s. Aceitável |
| Rate limit Lovable AI | Try/catch silencioso → fallback determinístico |

---

## Decisões que preciso de ti

1. **Modelo**: `google/gemini-3-flash-preview` via Lovable AI (mais barato, sem secret extra) ou `openai/gpt-5-mini` (necessita `OPENAI_API_KEY`, que já existe nos secrets)? Recomendação: **Flash via Lovable AI**.
2. **Quando o snapshot tem `ai_insights_v1`**, escondemos as recomendações determinísticas no web report ou mantemos ambas como secções distintas?
3. **Prompt mudou**: regeneração automática de todos os snapshots stale (caro) ou só on-demand via admin (barato)? Recomendação: **on-demand**.
4. **Regenerar via admin** (Prompt H) entra no MVP ou fica para depois?

## Checkpoint

- ☐ Decisão modelo (Flash Lovable AI vs OpenAI direto)
- ☐ Decisão coexistência determinísticas vs IA
- ☐ Decisão regeneração on-demand vs auto
- ☐ Decisão Prompt H (admin regen) entra ou não no MVP
- ☐ Aprovação para Prompt A começar
