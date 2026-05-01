# Plano · Pergunta 04 — Leitura das legendas (Caption Intelligence)

## Objetivo

Substituir o atual "Temas das legendas" por uma secção editorial com cinco blocos que provam que as captions foram **lidas e interpretadas**, e não apenas tokenizadas. Hashtags ficam separadas (continuam na Pergunta 03 / cartão dedicado).

## Conceito visual e copy

- Renomear secção: `Pergunta 04 · Leitura das legendas` / `O que as legendas revelam sobre a estratégia de conteúdo?`
- Microcopy: `Baseado na leitura das legendas dos posts analisados — não apenas em hashtags.`
- Sample hint determinístico: `Baseado em N posts` (N = posts com caption não vazia).
- Footer: `As hashtags são analisadas separadamente. Esta leitura considera o texto das legendas, CTAs, temas recorrentes e padrões editoriais dos posts analisados.`

## Arquitetura de informação (1 card editorial, 5 blocos internos)

```text
┌─ Pergunta 04 · Leitura das legendas ────────────────────┐
│ Header (badge IA / amostra)                             │
├──────────────────────────────────────────────────────────┤
│ Coluna esq. (md:col-span-3)   │ Coluna dir. (col-span-2)│
│  1. TEMAS DOMINANTES [LEITURA IA]   │ 4. CHAMADAS À AÇÃO│
│     3-5 temas + snippet evidência   │    [LEITURA AUTO] │
│  2. TIPO DE CONTEÚDO [LEITURA AUTO] │ 5. LEITURA        │
│     dominante + mini distribuição   │    EDITORIAL [IA] │
│  3. EXPRESSÕES RECORRENTES [DADOS]  │                   │
│     bigramas/expressões             │                   │
├──────────────────────────────────────────────────────────┤
│ Footer separação hashtags                               │
└──────────────────────────────────────────────────────────┘
Mobile: stack vertical 1→2→3→4→5.
```

Badges (component novo `<SourceBadge variant="extracted|auto|ai">`):
- `DADOS EXTRAÍDOS` — slate
- `LEITURA AUTOMÁTICA` — slate/azul-claro
- `LEITURA IA` — azul

Cores: branco como surface, azul para IA/interpretação, slate para extracted, âmbar só quando há `whatIsMissing`. Sem rosa/vermelho.

## Pipeline de dados

### 1. Nova chamada IA estruturada (reutiliza pipeline existente)

Adicionar uma secção `captionIntelligence` ao gerador v2 ou criar um pequeno gerador dedicado. Decisão: **estender o gerador v2** (`openai-insights.server.ts` + `prompt-v2.ts` + `validate-v2.ts` + `types.ts`) para devolver um campo opcional `captionIntelligence` no `AiInsightsV2`, em paralelo com `priorities`.

Razões: já tem cache, drift hash, custo, validação Zod, `LOVABLE_API_KEY` e fallback em `analyze-public-v1.ts`. Não introduzimos nova edge function nem nova rota.

#### Tool calling JSON shape (validado por Zod em `validate-v2.ts`)

```ts
captionIntelligence: {
  captionThemes: Array<{
    label: string,                       // ≤ 40 chars
    confidence: "low"|"medium"|"high",
    evidencePostIndexes: number[],       // 1-based, dentro do range enviado
    summary: string,                     // ≤ 140 chars
  }>,                                    // 3..5 itens
  contentTypeMix: Array<{
    type: "Educativo"|"Opinião / análise"|"Promocional"
        |"Institucional"|"Bastidores / pessoal"|"Convite / CTA",
    sharePct: number,                    // 0..100, soma ≤ 100
    reason: string,                      // ≤ 120 chars
  }>,                                    // 1..6 itens
  recurringExpressions: Array<{
    expression: string,                  // ≤ 32 chars
    count: number,                       // ≥ 1
    type: "topic"|"cta"|"brand"|"product"|"community"|"other",
  }>,                                    // 0..8 itens
  ctaPatterns: {
    hasCtaPct: number,
    hasQuestionPct: number,
    dominantCtaType: "newsletter"|"comment"|"link"|"message"|"save"|"share"|"none"|"other",
    summary: string,                     // ≤ 160 chars
  },
  editorialReading: {
    whatItCommunicates: string,          // ≤ 200 chars
    whatWorks: string,                   // ≤ 200 chars
    whatIsMissing: string,               // ≤ 200 chars
    recommendedImprovement: string,      // ≤ 120 chars, infinitivo
  },
  safeSummary: string,                   // ≤ 240 chars
}
```

Inputs enviados ao modelo (subset de `InsightsContext` + novo bloco):
- Por cada post analisado: `index, caption_excerpt (≤ 280 chars), format, captionLength, likes, comments, hasQuestion, hasCta, hashtags[], mentions[], detectedLinkTerms[]`.
- `sampleSize` real e nota cautelar quando < 6.
- Restrições: analisar **apenas as captions enviadas**; nunca classificar hashtags como tema; pt-PT AO90; sem jargão técnico; não inventar métricas.

### 2. Fallback determinístico

Quando IA falha, é desligada, devolve schema inválido ou amostra é demasiado pequena:
- `captionThemes` ← `extractTopThemes` filtrado (já existe).
- `contentTypeMix` ← derivado de `classifyContentType.distribution` (já existe).
- `recurringExpressions` ← `KNOWN_BIGRAMS` matched + top tokens não-stopword com `count ≥ 2`.
- `ctaPatterns` ← `classifyCaptionPattern` + `classifyQuestionShare` + heurística `dominantCtaType` por matching de termos (`newsletter|subscreve`, `comenta`, `link na bio`, `dm|mensagem`, `guarda`, `partilha`).
- `editorialReading` ← regras determinísticas curtas (templates condicionais).
- Badge muda de `LEITURA IA` para `LEITURA AUTOMÁTICA`.

Fica encapsulado em `src/lib/report/caption-intelligence.ts` (novo, puro).

### 3. Separação hashtags vs temas

- Temas continuam derivados **só do texto das captions** (URLs, hashtags, menções já são removidos em `text-extract.ts`).
- A função `inferThemesFromCaptions` deixa de ser usada pela Pergunta 04 — o cartão de hashtags (`classifyHashtags`) continua tal como está em `groupB`. O cartão antigo `ReportThemesFeature` é substituído pelo novo `ReportCaptionIntelligence`.
- Validação extra no novo módulo: rejeitar `captionThemes[i].label` que comece por `#` ou que seja igual (case-insensitive) a uma das top hashtags — força o modelo a propor temas semânticos.

### 4. Ligação ao plano de ação

- `recommendedImprovement` é exposto em `AdapterResult` como `result.enriched.aiInsightsV2?.captionIntelligence?.editorialReading.recommendedImprovement`.
- Em `report-diagnostic-block.tsx`, antes de chamar `<ReportDiagnosticPriorities>`, se a improvement existir e ainda não houver prioridade equivalente, é injectada como prioridade adicional `level: "oportunidade"` (ou substitui a primeira oportunidade determinística). Sem mudar o componente Priorities.

## Ficheiros a tocar

- `src/lib/insights/types.ts` — adicionar `AiCaptionIntelligence` + campo opcional em `AiInsightsV2`.
- `src/lib/insights/prompt-v2.ts` — bloco de instruções para `captionIntelligence` + payload `posts_for_caption_reading[]`.
- `src/lib/insights/validate-v2.ts` — schema Zod do bloco + sanitização (clamp, dedupe, drop labels iguais a hashtags).
- `src/lib/insights/openai-insights.server.ts` — incluir o tool/JSON schema novo no request.
- `src/lib/report/snapshot-to-report-data.ts` — mapear o bloco para `result.enriched.aiInsightsV2.captionIntelligence`.
- `src/lib/report/caption-intelligence.ts` (novo) — `buildCaptionIntelligence({ posts, aiBlock })` que devolve sempre uma estrutura uniforme `{ source: "ai"|"deterministic", ...blocos }` aplicando fallback parcial campo-a-campo.
- `src/components/report-redesign/v2/report-caption-intelligence.tsx` (novo) — substitui `ReportThemesFeature`, render dos 5 blocos com `SourceBadge` reutilizando tokens do tema light.
- `src/components/report-redesign/v2/source-badge.tsx` (novo) — pequena badge com 3 variantes.
- `src/components/report-redesign/v2/report-diagnostic-block.tsx` — trocar `ReportThemesFeature` por `ReportCaptionIntelligence`; injectar `recommendedImprovement` na lista de prioridades quando disponível.
- `src/components/report-redesign/v2/report-themes-feature.tsx` — deprecar (manter ficheiro com export que redirige para o novo componente, para evitar imports orfãos noutros pontos não detectados; remover se não houver outras referências).
- `src/lib/report/__tests__/caption-intelligence.test.ts` (novo) — cobre fallback determinístico, dedupe contra hashtags, clamp de `sharePct`, sample-size mínimo.
- `src/lib/insights/__tests__/validate-caption-intelligence.test.ts` (novo) — schema accept/reject.

Locked files: nenhum dos ficheiros acima está em `LOCKED_FILES.md` (verificado a olhar para `src/integrations/supabase/*` e `report-mock-data.ts` não-locked listados). Confirmar antes de editar.

## Edge cases

- `sampleSize < 4`: bloquear bloco IA, fallback determinístico com label `LEITURA AUTOMÁTICA` em todos os blocos; `editorialReading.recommendedImprovement` = null e nada é injectado nas prioridades.
- Captions vazias: ignoradas no sample count; se `>50%` vazias, mostrar empty state explícito ("Captions são curtas demais para uma leitura semântica fiável.").
- IA devolve label = hashtag → drop + reordenar; se ficar < 3 temas, complementar com fallback determinístico.
- IA falha ou 402/429 → fallback total, sem mensagem de erro ao utilizador (badge automática).
- `sharePct` total > 100 → normalizar proporcionalmente.

## Critérios de aceitação

- Pergunta 04 mostra 5 blocos com badges `DADOS EXTRAÍDOS` / `LEITURA AUTOMÁTICA` / `LEITURA IA`.
- Hashtags nunca aparecem como tema.
- `recommendedImprovement` chega ao componente de prioridades quando IA disponível.
- Card é responsive a 375px (stack vertical, padding reduzido).
- `bunx tsc --noEmit` e `bunx vitest run` passam.
- Sem mudanças em `/report/example`, no PDF, no admin ou no schema da DB.

## Out of scope

- Re-render do PDF.
- Alterações ao gerador v1, ao Apify, ao admin, ao /report/example.
- Novos providers ou novas rotas.