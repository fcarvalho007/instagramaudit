## Orquestrador OpenAI · ganho de valor com benchmark dataset

### Diagnóstico

Hoje o `generateInsightsV2` injecta no system prompt **apenas** o contexto vindo da tabela `knowledge_benchmarks` + notas curtas (`getKnowledgeContext`). O dataset estruturado em `INSTAGRAM_BENCHMARK_CONTEXT` (Socialinsider por formato, Buffer por tier, Hootsuite por indústria) está **completo e testado** mas **nunca chega à IA**. Resultado: o modelo escreve insights sem âncoras numéricas externas e cai facilmente em generalidades.

A IA já tem dados do perfil (`InsightsContext`); o que falta é **a vara de medir**. Dar-lhe a vara (Buffer tier ER médio, Socialinsider ER por formato, Hootsuite ER da indústria quando aplicável) muda a qualidade de cada um dos 9 micro-insights — sobretudo `hero`, `benchmark`, `formats`, `topPosts`.

### Princípios

1. **Compacto** — bloco ≤ ~25 linhas, formato chave-valor curto. Custo extra por chamada estimado em <300 tokens (≈ +5-8% no input). Cap diário continua a proteger.
2. **Pré-filtrado** — entregar à IA **só o que é relevante para o perfil** (1 tier Buffer, 1 entrada Hootsuite se houver indústria, 4 linhas Socialinsider). Não despejar o dataset todo.
3. **Coerente com a política** — usa o mesmo `formatKnowledgeContextForPrompt` reescrito; sem citações de fonte; sem reach se `hasReachData=false`; passa pelo `sanitizeAiCopy` post-validate (já ligado).
4. **Cache-aware** — o snippet entra no `inputsHash` automaticamente (vai dentro do system prompt); `kbVersion` ganha um sufixo derivado do dataset estático para invalidar cache se o ficheiro `benchmark-context.ts` mudar.

### O que vai ser feito

#### 1. Novo serializer compacto em `benchmark-context.ts`

`formatBenchmarkContextForPrompt(input)` — recebe `BenchmarkContextForProfileInput` e devolve string pronta para colar no prompt. Formato:

```text
REFERÊNCIAS DIRECIONAIS (uso interno, não citar fontes):
- Tier por seguidores: 5K-10K · ER mediana ref.: 3.9% · cadência ref.: 20 posts/mês · crescimento ref.: +5.7%/mês
- ER por formato (orgânico, contexto geral): geral 0.48% · carrossel 0.55% · reel 0.52% · imagem 0.37%
- Indústria (se aplicável): n/a
- Formato dominante do perfil: reel · referência geral 0.52%
- Princípio: optimizar interacção, não apenas alcance.
- Princípio: carrosséis fortes para autoridade e conteúdo guardável.
```

Regras:
- Se `bufferTier=null` e perfis ≥1M → linha "Tier ≥1M, sem referência directa Buffer; usar Buffer 500K-1M apenas como direccional".
- Se `industry=null` → linha "Indústria: n/a (não fornecida pelo perfil)".
- Se `hasReachData=false` → omitir totalmente `medianReachPerPost`.

#### 2. Integrar no `buildSystemPromptV2`

Aceitar terceiro parâmetro `profileBenchmark?: BenchmarkContextForProfileInput`. Quando presente, juntar o snippet **depois** do bloco da KB, sob título próprio `REFERÊNCIAS DE BENCHMARK (perfil específico)`. A IA vê dois blocos distintos: KB validada (BD) + dataset estático curado (TS).

#### 3. Derivar input no `generateInsightsV2`

Logo após resolver `tier` e `format`, montar:

```ts
const profileBenchmark = {
  followers: ctx.profile.followers_count,
  dominantFormat: normalizeDominantFormat(ctx.content_summary.dominant_format),
  industry: null,                 // futuro: vem de selecção do utilizador
  hasReachData: false,            // mesmo flag já usado no sanitize
};
```

E passar a `buildSystemPromptV2(kb, { hasReachData, profileBenchmark })`.

#### 4. Reforço editorial mínimo no prompt base

Acrescentar **uma** regra a `SYSTEM_PROMPT_BASE` (não reescreve nada existente):

> *"Quando comparar valores do perfil com referências, use linguagem direccional ('aproxima-se de', 'fica abaixo de', 'em linha com'). Não atribua números a fontes externas, mesmo que apareçam no contexto. Não escreva nomes de empresas (Socialinsider, Buffer, Hootsuite, Databox)."*

Isto fecha o ciclo: o `sanitizeAiCopy` já apanha violações, mas vale a pena pedir directamente para não acontecerem.

#### 5. `kbVersion` reflecte o dataset estático

Hoje `computeKbVersion` só considera linhas da BD. Adicionar `BENCHMARK_DATASET_VERSION` exportado do `benchmark-context.ts` (string curta, ex: `"2026-04-01"`) e incorporar no seed. Permite invalidar cache quando o dataset for actualizado.

#### 6. Testes (vitest)

- `formatBenchmarkContextForPrompt` (4 testes):
  - Perfil micro com Reels: contém tier `5K-10K`, ER 3.9%, formato dominante
  - Perfil ≥1M: contém marcador "≥1M"
  - `industry: "education"`: inclui linha de indústria 5.4%
  - `hasReachData=false`: **não** contém a palavra "reach" nem "alcance"
- Snapshot do output completo (1 teste) para detectar drift acidental
- `computeKbVersion` muda quando `BENCHMARK_DATASET_VERSION` muda (1 teste em `prompt-v2.test.ts` se existir, senão criar mínimo)

Total esperado: **37 → 43 testes**.

### Não-objectivos

- ❌ Não tocar no `userPayload` — o dataset é **contexto**, não dados do perfil
- ❌ Não introduzir indústria seleccionável pelo utilizador (fica para prompt dedicado quando o UI tiver o seletor)
- ❌ Não persistir o snippet em BD nem em `provider_call_logs.metadata`
- ❌ Não tocar em `analyze-public-v1` nem em ficheiros UI
- ❌ Não tocar em ficheiros locked

### Ficheiros tocados

```text
src/lib/knowledge/benchmark-context.ts                       (+ formatter, + DATASET_VERSION)
src/lib/insights/prompt-v2.ts                                (assinatura buildSystemPromptV2, regra extra)
src/lib/insights/openai-insights.server.ts                   (montar profileBenchmark e passar)
src/lib/knowledge/context.server.ts                          (nada — já reescrito)
src/lib/knowledge/__tests__/benchmark-context.test.ts        (+ ~5 testes)
```

### Observabilidade

Sem schema novo. Adicionar **um** `console.info("[insights.v2] benchmark-context attached", { tier, format, hasIndustry, hasReachData })` antes da chamada à OpenAI para confirmar nos logs que o snippet foi anexado.

### Validação final

- `tsc --noEmit` verde
- `vitest run` verde com 43 testes
- Smoke real: gerar insights v2 para `frederico.m.carvalho` e confirmar que (a) o `system prompt` agora contém o bloco "REFERÊNCIAS DE BENCHMARK (perfil específico)", (b) o output não cita marcas, (c) `console.warn [knowledge.sanitize]` continua a 0 violações

### Checkpoint

- ☐ Adicionar `formatBenchmarkContextForPrompt` + `BENCHMARK_DATASET_VERSION` em `benchmark-context.ts`
- ☐ Estender `buildSystemPromptV2` para aceitar `profileBenchmark` e juntar bloco
- ☐ Reforço editorial (1 parágrafo) em `SYSTEM_PROMPT_BASE`
- ☐ Montar `profileBenchmark` em `generateInsightsV2` + `console.info` de telemetria
- ☐ Incorporar `BENCHMARK_DATASET_VERSION` no `computeKbVersion`
- ☐ Testes (~5 novos) verdes
- ☐ `tsc` + `vitest` verdes