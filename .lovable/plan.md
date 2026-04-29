## Diagnóstico (sem chamar OpenAI / Apify / DataForSEO)

Inspeccionei a camada de configuração de OpenAI Insights. Estado actual:

### Resolução do modelo
**`src/lib/insights/openai-insights.server.ts:134-138`**
```ts
function resolveModel(): string {
  const fromEnv = process.env.OPENAI_INSIGHTS_MODEL;
  if (fromEnv && fromEnv.trim().length > 0) return fromEnv.trim();
  return DEFAULT_OPENAI_MODEL;
}
```
- Se `OPENAI_INSIGHTS_MODEL` estiver definido → runtime usa o valor exacto. ✅
- Se ausente → cai em `DEFAULT_OPENAI_MODEL`.

### Defaults / fallback
**`src/lib/insights/cost.ts:13-16`**
```ts
export const DEFAULT_OPENAI_MODEL = "gpt-5.4-mini";
export const FALLBACK_MODEL = "gpt-5.4-mini";
```
Ambos já apontam para `gpt-5.4-mini`. ✅

### Secret no projecto
`fetch_secrets` confirma que **`OPENAI_INSIGHTS_MODEL`** está configurado no Lovable Cloud (valor encriptado, não inspeccionável daqui — utilizador confirmou que vale `gpt-5.4-mini`).

### Tabela de custos
**`src/lib/insights/cost.ts:30-35`**
```ts
const PRICING = {
  "gpt-4.1-mini": { inputPerMillion: 0.4,  outputPerMillion: 1.6 },
  "gpt-5-mini":   { inputPerMillion: 0.25, outputPerMillion: 2.0 },
  "gpt-5.4-mini": { inputPerMillion: 0.75, outputPerMillion: 4.5 },  // ✅ valores correctos
  "gpt-5.4-nano": { inputPerMillion: 0.2,  outputPerMillion: 1.25 }, // ⚠️ entrada residual
};
```
- Input/output de `gpt-5.4-mini` correspondem ao pedido ($0.75 / $4.50). ✅
- **Falta cached input** ($0.075/1M). A interface `ModelPrice` não tem campo para tarifa cached, e o calculador não recebe `cachedTokens`. ❌
- **`gpt-5.4-nano` continua na tabela** — não é default nem fallback, mas se um caller passar esse model id, recebe pricing. Pedido explícito: remover dependência de `gpt-5.4-nano`. ❌

### Outras referências a `nano` no fluxo
**`src/lib/insights/openai-insights.server.ts:203`** — comentário:
```ts
// GPT-5 family (incl. gpt-5.4-nano) only accepts max_completion_tokens.
```
Apenas comentário, sem efeito runtime, mas deve ser removido para zero menções de `nano` no fluxo de OpenAI Insights. ❌

(As ocorrências em `src/lib/benchmark/*` referem-se ao tier de seguidores "nano/micro/mid/macro/mega" — não tem relação com modelos OpenAI; ignorar.)

### Captura de cached tokens
A resposta da OpenAI inclui `usage.prompt_tokens_details.cached_tokens`, mas o tipo `OpenAiChatResponse` (linha 331) não declara o campo e o handler (linha 236-238) só lê `prompt_tokens` e `completion_tokens`. Para a tarifa cached funcionar é preciso ler este campo e passá-lo a `calculateOpenAiCost`.

---

## Plano de edits (mínimos, isolados à camada de configuração OpenAI Insights)

### 1. `src/lib/insights/cost.ts`
- Estender `ModelPrice` com `cachedInputPerMillion?: number`.
- Adicionar `cachedInputPerMillion: 0.075` à entrada `gpt-5.4-mini`.
- **Remover entrada `gpt-5.4-nano`** da `PRICING`. Calls que passem esse id passam a cair no `FALLBACK_MODEL` (= `gpt-5.4-mini`).
- Estender `CostInput` com `cachedTokens?: number` (clamp a `≤ promptTokens`).
- Estender `CostBreakdown` com `cachedTokens: number`.
- Alterar `calculateOpenAiCost` para facturar `cachedTokens × cachedInputPerMillion` e o resto a `inputPerMillion`.
- Exportar `getPricingTable()` (read-only) para o script diagnóstico imprimir preços sem reexpor a constante mutável.

### 2. `src/lib/insights/openai-insights.server.ts`
- Linha 203: substituir comentário por `"GPT-5 family only accepts max_completion_tokens."` (sem `nano`).
- Tipo `OpenAiChatResponse` (linha 331-339): adicionar `prompt_tokens_details?: { cached_tokens?: number }` em `usage`.
- Linha 236-238: ler `cachedTokens = json.usage?.prompt_tokens_details?.cached_tokens ?? 0` e passar a `calculateOpenAiCost`.

### 3. Script diagnóstico reusável (não toca em OpenAI)
Criar **`scripts/check-openai-insights-config.ts`**:
```ts
import { DEFAULT_OPENAI_MODEL, FALLBACK_MODEL, getPricingTable, calculateOpenAiCost }
  from "../src/lib/insights/cost";

const fromEnv = process.env.OPENAI_INSIGHTS_MODEL;
const resolved = fromEnv?.trim() || DEFAULT_OPENAI_MODEL;
const pricing = getPricingTable();
const sample = calculateOpenAiCost({
  model: resolved,
  promptTokens: 1_000_000, completionTokens: 1_000_000, cachedTokens: 0,
});

console.log(JSON.stringify({
  env_present: !!fromEnv,
  resolved_model: resolved,
  default_model: DEFAULT_OPENAI_MODEL,
  fallback_model: FALLBACK_MODEL,
  known_models: Object.keys(pricing),
  pricing_for_resolved: pricing[resolved] ?? null,
  sample_cost_1M_in_1M_out_usd: sample.estimatedCostUsd,
}, null, 2));
console.log("[diagnostic] no provider call performed.");
```
Este script é executado localmente com `bun run scripts/check-openai-insights-config.ts` para validar a resolução **sem** atingir nenhum endpoint. Fica versionado como ferramenta reusável.

### 4. Validação
- `bunx tsc --noEmit` deve passar (tipos coerentes em `cost.ts` + `openai-insights.server.ts`).
- Correr o script diagnóstico e verificar:
  - `resolved_model = "gpt-5.4-mini"`
  - `default_model = "gpt-5.4-mini"`
  - `fallback_model = "gpt-5.4-mini"`
  - `pricing_for_resolved.cachedInputPerMillion = 0.075`
  - `known_models` não contém `gpt-5.4-nano`.
- Confirmar via `rg "gpt-5\.4-nano" src/lib/insights/` que não restam referências.

---

## Ficheiros tocados
- `src/lib/insights/cost.ts` (edits)
- `src/lib/insights/openai-insights.server.ts` (edits — apenas comentário, tipo de resposta e captura de cached_tokens)
- `scripts/check-openai-insights-config.ts` (novo, reusável)

## Nada disto faz
- Sem chamadas a OpenAI / Apify / DataForSEO.
- Sem invalidar snapshots.
- Sem tocar em UI, PDF, admin, schema, `/report/example` ou ficheiros locked (`__root.tsx`, `styles.css`, `tokens.css`, etc.).
- Sem subir scripts temporários — o único script criado é diagnóstico reusável.
