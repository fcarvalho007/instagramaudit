
# AUDITORIA DE CONVERGÊNCIA — POST R1/R2/R3 + PROMPTS 15–19

> Read-only. Nada foi alterado. Nenhuma chamada a Apify / DataForSEO / OpenAI. Nenhum snapshot invalidado.

---

## A. EXECUTIVE SUMMARY

A arquitetura está **coerente e funcional**, com **uma única redundância cosmética** que vale a pena limpar antes de avançar. O snapshot fresco de `frederico.m.carvalho` traz simultaneamente:

- `schema_version: 2`
- campos R4-A (`video_duration`, `coauthors`, `tagged_users`, `location_name`, `music_title`, `caption_length`, `is_pinned`, `product_type`)
- `ai_insights_v1` (bloco "Leitura estratégica")
- `ai_insights_v2` (caixas inline por secção, KB-aware)

Os dois pipelines (`v1` e `v2`) **coexistem por design** — não são duplicação. O v1 alimenta o bloco longo; o v2 alimenta as 9 caixas inline. Ambos partilham gates (kill-switch, allowlist, daily cap) e logging. O cache do v2 por `inputs_hash + kb_version` evita pagar duas vezes por inputs idênticos.

`/report/example` continua **isolado** com mocks; `/analyze/$username` usa **dados reais** via `ReportShell`.

`bunx tsc --noEmit` passa sem erros.

**Verdicto final:** **SAFE TO CONTINUE** com um único fix cosmético opcional (ver §I).

---

## B. ARQUITETURA ATUAL

```text
                         ┌───────────────────────────────┐
   /analyze/$username  → │  fetchPublicAnalysis (POST)   │
                         │  /api/analyze-public-v1       │
                         └──────────────┬────────────────┘
                                        │ Apify + DataForSEO (free)
                                        │ persist BASE snapshot
                                        │   schema_version: 2
                                        │   posts[] com R4-A fields
                                        ▼
                         ┌───────────────────────────────┐
                         │  generateInsights (v1)        │ ── ai_insights_v1
                         │  generateInsightsV2 (KB+EP)   │ ── ai_insights_v2
                         └──────────────┬────────────────┘
                                        │ enrich snapshot
                                        ▼
                         ┌───────────────────────────────┐
   GET                   │  /api/public/analysis-snapshot│
                         └──────────────┬────────────────┘
                                        │ payload + meta + benchmark
                                        ▼
                         ┌───────────────────────────────┐
                         │  snapshotToReportData         │ pure adapter
                         │   ├─ data.aiInsights (v1)     │
                         │   ├─ enriched.aiInsightsV2    │
                         │   └─ enriched.editorialPatts  │ R4-B
                         └──────────────┬────────────────┘
                                        ▼
                         ┌───────────────────────────────┐
                         │  ReportShell                  │
                         │   1. Hero + AIInsightBox(hero)│
                         │   2. KPI grid                 │
                         │   3. ReportAiReading (v1) OR  │
                         │      ReportPendingAiNotice    │
                         │   4. Market Signals + AIInsB. │
                         │   4b. ReportEditorialPatterns │ ← Prompt 18
                         │   5–10. secções + AIInsightBox│
                         │   11. Methodology (KB-aware)  │
                         └───────────────────────────────┘

   /report/example     →  ReportPage  +  AI_INSIGHTS_MOCK   (isolado, intacto)
```

---

## C. ROTAS DO RELATÓRIO

| Rota | Componente top-level | Fonte de dados | Mock? | Wrapper |
|------|----------------------|----------------|-------|---------|
| `/report/example` | `ReportPage` | `report-mock-data` + `AI_INSIGHTS_MOCK` | **Sim — só mock** | `ReportThemeWrapper` |
| `/analyze/$username` | `ReportShell` | snapshot real via `fetchPublicAnalysis` + `/api/public/analysis-snapshot` | **Não** | `ReportThemeWrapper` + `ReportDataProvider` |
| `/admin/report-preview/$username` | `ReportPage` | snapshot real (vista admin) | Não | locked admin shell |
| `/admin/report-preview/snapshot/$snapshotId` | `ReportPage` | snapshot real por id | Não | locked admin shell |

`/report/example` permanece **isolado e seguro**: usa exclusivamente `ReportPage` + mocks. **Nenhuma alteração de R1/R2/R3/15-19 toca este ficheiro.**

---

## D. SISTEMAS DE INSIGHT IA

| Sistema | Gerado em | Persistido em | Adapter lê? | UI renderiza? | Usa KB? | Usa editorialPatterns? | Estado |
|---------|-----------|---------------|-------------|---------------|---------|------------------------|--------|
| `ai_insights_v1` | `generateInsights()` | `normalized_payload.ai_insights_v1` | Sim → `data.aiInsights[]` | `ReportAiReading` (bloco "Leitura estratégica") | Não (apenas evidência numérica) | **Sim** (R5) | **Activo** |
| `ai_insights_v2` | `generateInsightsV2()` | `normalized_payload.ai_insights_v2` | Sim → `enriched.aiInsightsV2` | `<AIInsightBox>` em 9 secções via `ReportShell` | **Sim** (`getKnowledgeContext` + `kb_version`) | **Sim** | **Activo** |
| `editorialPatterns` | `buildEditorialPatterns()` no adapter | derivado em runtime (não persistido) | Sim → `enriched.editorialPatterns` | `ReportEditorialPatterns` (cards) | Não | n/a (é a fonte) | **Activo** |
| `AI_INSIGHTS_MOCK` | constante TS | n/a | Não | `ReportPage` apenas (ou seja, **só `/report/example` + admin previews**) | Não | Não | **Mock — isolado** |
| `ReportPendingAiNotice` | UI fallback | n/a | Lê `analyzedAtIso` | Mostrado quando `data.aiInsights.length === 0` | Não | Não | **Activo (fallback)** |

**Confirmações explícitas:**
- ✅ Estamos a **render** ambos os pagos: v1 no bloco longo + v2 nas 9 caixas inline. **Não há gasto invisível.**
- ✅ O v1 **continua a ser a única fonte do bloco "Leitura estratégica"**.
- ✅ Mocks do `AI_INSIGHTS_MOCK` **só aparecem em `/report/example`** e nas duas previews admin do `ReportPage`. **Não vazam para `/analyze/$username`.**
- ⚠️ **Não existe** uma cadeia de fallback "v2 → v1 → pending notice" para as caixas inline; cada caixa renderiza **apenas se v2 a tiver**. Em snapshots fresh isto está OK; em snapshots antigos sem v2 as caixas inline simplesmente desaparecem (graceful). É comportamento aceitável, mas vale documentar.
- ✅ Insights de secção (v2) renderizam **junto à secção certa** (hero, marketSignals, evolutionChart, benchmark, formats, topPosts, heatmap, daysOfWeek, language) — confirmado em `report-shell.tsx`.

---

## E. KNOWLEDGE BASE

| Feature | Implementado? | UI | Server query | Usado por OpenAI? | Usado por report? | Notas |
|---------|--------------|----|--------------|-------------------|-------------------|-------|
| Tabelas `knowledge_*` | ✅ 5 tabelas | — | — | — | — | benchmarks/notes/sources/history/suggestions |
| RPC `get_knowledge_context(tier, format, vertical)` | ✅ SECURITY DEFINER | — | ✅ | ✅ | Indirecto | retorna `{benchmarks, notes, metadata}` |
| `/admin/conhecimento` | ✅ | ✅ real (5 secções: KPIs, suggestions, benchmarks, sources, notes) | via `/api/admin/knowledge.*` | — | — | RLS denyall + adminFetch JWT |
| Endpoints `/api/admin/knowledge/*` | ✅ | — | ✅ | — | — | export JSON funcional |
| Injecção de contexto KB no prompt | ✅ | — | — | **Sim — só `generateInsightsV2`** (`buildSystemPromptV2(kb)`) | — | v1 não usa KB |
| `kb_version` em snapshots | ✅ | — | — | Sim, em `ai_insights_v2.source_signals.kb_version` | — | usado para cache hit |
| Dados reais na KB | ✅ 12 benchmarks · 6 notas · 4 fontes | — | — | — | — | confirmado por SQL |

**Observação:** A KB **é injectada apenas no v2**. O v1 continua a usar evidência numérica do contexto (com R5 a juntar `editorial_patterns`). É consistente com o desenho — v2 = "voz editorial curta com referências"; v1 = "interpretação longa fundamentada em evidência observada".

---

## F. ENRIQUECIMENTO DO `normalized_payload`

### Per-profile

| Campo | Extraído de raw? | Persistido? | Usado no adapter? | Usado na UI? | Usado em OpenAI ctx? | Compatível com snapshots antigos? |
|-------|------------------|-------------|-------------------|--------------|----------------------|------------------------------------|
| `category` / `business_category` | ⚠️ não confirmado em normalize | n/a | — | — | — | n/a |
| `external_url` | ✅ | ✅ (`external_urls[]`) | ✅ enriched.externalLinks | ✅ `ReportEnrichedTopLinks` | — | sim (defensivo) |
| `is_verified` | ✅ | ✅ | ✅ | ✅ hero | — | sim |
| `signal_coverage` | ❌ não implementado | — | — | — | — | — |
| `normalization_version` | ❌ não como tal — usado **`schema_version: 2`** no payload | ✅ no payload | implícito (defensivo) | — | — | sim (ausência = legacy) |

### Per-post (R4-A — confirmado em `normalize.ts`)

| Campo | Extraído? | Persistido? | Adapter? | UI? | OpenAI ctx? | Backward-compat? |
|-------|-----------|-------------|----------|-----|-------------|------------------|
| `video_duration` | ✅ | ✅ (snapshot real confirma) | ✅ | ⚠️ via `videoDurationPattern` (cards) | ✅ via editorial_patterns | sim (null se ausente) |
| `product_type` | ✅ | ✅ | ✅ | — | — | sim |
| `coauthors` | ✅ | ✅ | ✅ | ✅ via mentions/lift | ✅ via collaboration_lift | sim ([] se ausente) |
| `tagged_users` | ✅ | ✅ | ✅ | indirecto | indirecto | sim |
| `location_name` | ✅ | ✅ | ✅ | — | — | sim |
| `music_title` | ✅ | ✅ | ✅ | — | — | sim |
| `caption_length` | ✅ (ou derivado) | ✅ | ✅ | ✅ via captionLengthBuckets | ✅ via editorial_patterns | sim (deriva de `caption.length`) |
| `is_pinned` | ✅ | ✅ | ✅ | — | — | sim (false default) |
| `is_sponsored` | ❌ **NÃO mapeado** em `normalize.ts` (apesar do prompt R4-A.2 mencionar) | — | — | — | — | n/a |
| `dimensions` / `aspect_ratio` | ❌ não mapeado | — | — | — | — | — |
| `carousel_slide_count` | ⚠️ não confirmado | — | — | — | — | — |
| `first_comment_excerpt` | ❌ não mapeado | — | — | — | — | — |
| `alt_text` | ❌ não mapeado | — | — | — | — | — |

**Gaps menores** (sem impacto em produção): `is_sponsored`, `dimensions`, `first_comment_excerpt`, `alt_text`, `signal_coverage`. Nenhum bloqueia o pipeline atual.

---

## G. EDITORIAL PATTERNS

| Pattern | Computado defensivamente? | Sample-size / confidence? | Renderizado? | OpenAI? | Labels pt-PT? | Snapshots antigos? |
|---------|--------------------------|---------------------------|--------------|---------|----------------|--------------------|
| `engagementTrend` | ✅ (≥4 posts) | sample + confidence | ✅ | ✅ | ✅ | sim |
| `captionLengthBuckets` | ✅ (≥6 posts) | counts/bucket | ✅ | ✅ (best_bucket) | ✅ | sim (deriva caption.length) |
| `hashtagSweetSpot` | ✅ (≥6) | counts/bucket | ✅ | ✅ | ✅ | sim |
| `hashtagFormatMatrix` | ❌ não implementado | — | — | — | — | — |
| `mentionsCollabsLift` | ✅ (≥2 com / ≥2 sem) | with/without count | ✅ | ✅ (collaboration_lift) | ✅ | sim |
| `videoDurationPattern` | ✅ (≥3 reels com duração) | counts/bucket | ✅ | — (não enviado ao modelo no `editorial_patterns`) | ✅ | sim (skipa em legacy) |
| `carouselDepthPattern` | ❌ não implementado | — | — | — | — | — |
| `commentsToLikesRatio` | ⚠️ derivado em `buildEditorialPatternsForInsights` mas não exposto em `EditorialPatterns` da UI | — | ❌ não na UI | ✅ | ✅ | sim |
| `formatVsCompetitors` | ⚠️ derivado em `buildEditorialPatternsForInsights` apenas | — | ❌ não na UI | ✅ | ✅ | sim |
| `marketDemandContentFit` | ✅ (≥1 keyword) | matched/total + missingTop | ✅ | ✅ | ✅ | sim |

**Inconsistência leve:** `commentsToLikesRatio` e `formatVsCompetitors` existem **só na slice enviada à OpenAI**, não no objecto `EditorialPatterns` que a UI vê. **Não é bug** — é decisão consciente (a UI já tem a Comparação com concorrentes; o comments/likes ratio entra como evidência interpretativa). Documentar.

---

## H. UI DO PROMPT 18

- `report-editorial-patterns.tsx` ✅ existe (298 linhas)
- Posicionamento: ✅ **após Market Signals, antes de Performance over time** (linha 117 de `report-shell.tsx`)
- Empty-state ✅ implementado (esconde cards individualmente; se todos `available:false`, mostra fallback subtil)
- Mobile-first ✅ (Tailwind responsive + sem horizontal overflow declarado)
- **Sem duplicação** com secções existentes: cobre ângulos novos (caption length, hashtag sweet spot, lift, duração, fit). Nada que já apareça em outro card.

---

## I. CONTEXTO OPENAI DO PROMPT 19

- ✅ Modelo continua `gpt-5.4-mini` (configurável via `OPENAI_INSIGHTS_MODEL`; default `DEFAULT_OPENAI_MODEL`).
- ✅ **Não foi criado um segundo pipeline** — `generateInsights` (v1) e `generateInsightsV2` (v2) já existiam; apenas alimentamos `editorial_patterns` em ambos.
- ✅ `editorial_patterns.*` declarado como caminhos válidos só em `evidence`.
- ✅ Caminhos novos só passam pelo `buildInsightsUserPayload`.
- ✅ Validador **NÃO foi enfraquecido**; foi **reforçado** — `TECHNICAL_LEAK_PATTERNS` ganhou tokens snake_case do v2 + bloqueio de "generic recommendation without numbers".
- ✅ Testes presentes: `validate-editorial.test.ts` (positivo + 2 negativos).

---

## J. CONFLITOS E DUPLICAÇÃO

**Sem conflitos arquitecturais.** Identificadas as seguintes redundâncias controladas:

1. **Bloco quase-duplicado em `analyze-public-v1.ts`** (linhas 916–1099): a construção de `editorialPatternsForAi` para v1 e `editorialPatternsForAiV2` para v2 são **quase idênticas** (~80 linhas duplicadas). Refactor opcional para um helper `buildInsightsCtx(...)`.
2. **`AI_INSIGHTS_MOCK`** ainda existe mas só é usado por `ReportPage` (que só renderiza em `/report/example` e nas 2 previews admin). **Comportamento esperado e seguro.**
3. **`ReportPage` vs `ReportShell`** coexistem por desenho: `ReportPage` é a versão locked legacy/mock; `ReportShell` é a nova orquestração premium. Sem leakage cruzado.

**Nenhum ficheiro órfão detectado** em insights/report.

---

## K. SEGURANÇA DE LOCKED FILES

`LOCKED_FILES.md` lista: tokens, atomic UI, layout/landing, legal. **Nenhum desses ficheiros foi modificado** pelos prompts 15–19. O lock do bloco do report foi explicitamente levantado para R1 (e ainda não reposto — ver §L).

---

## L. VALIDAÇÃO LOCAL

- ✅ `bunx tsc --noEmit` — **passa sem erros**.
- DB confirma: snapshot fresco de `frederico.m.carvalho` tem `schema_version=2`, `video_duration` presente, **`ai_insights_v1` presente**, **`ai_insights_v2` presente**.
- KB: 12 benchmarks · 6 notas · 4 fontes (real, não mock).

---

## M. PLANO DE RECONCILIAÇÃO

### O que está LIVE e VISÍVEL
- `/analyze/$username` com hero + KPI + ReportAiReading (v1) + Market Signals + **EditorialPatterns** + 9 AIInsightBox (v2) + restantes secções + methodology KB-aware.
- `/admin/conhecimento` real e operacional.
- `/report/example` intacto com mocks.

### O que está IMPLEMENTADO mas INVISÍVEL
- `commentsToLikesRatio` e `formatVsCompetitors` — só vão ao OpenAI, não à UI. **Aceitável**, mas pode justificar 2 mini-cards extra em prompt futuro.
- Campos `is_sponsored`, `dimensions`, `alt_text`, `first_comment_excerpt`, `signal_coverage` — não mapeados; baixa prioridade.

### O que está DUPLICADO
- Bloco de construção de ctx OpenAI para v1 e v2 (~80 linhas espelhadas).

### O que é UNSAFE ou INCONSISTENTE
- **Nada bloqueante.** Único atrito leve: o lock do report (LOCKED_FILES.md §"Report Components") ainda não foi reposto após R2 — registar decisão.

### Caminho canónico
- **Render real:** `/analyze/$username` via `ReportShell` + `snapshotToReportData`.
- **Mock visual:** `/report/example` via `ReportPage` + `AI_INSIGHTS_MOCK` (não tocar).
- **Insights pagos:** v1 (longos) + v2 (inline KB-aware), gates partilhados.
- **Padrões editoriais:** `editorial-patterns.ts` é a única fonte; serve UI E OpenAI.

### Ficheiros a manter (canónicos)
- `src/lib/report/editorial-patterns.ts`
- `src/lib/report/snapshot-to-report-data.ts`
- `src/lib/insights/openai-insights.server.ts`
- `src/lib/insights/{prompt,prompt-v2,validate,validate-v2,types,cost,drift}.ts`
- `src/lib/knowledge/*`
- `src/components/report-redesign/*` (todos)
- `src/components/report/ai-insight-box.tsx`
- `src/lib/report/ai-insights-mock.ts` (só `/report/example`)

### Ficheiros a remover ou deprecar
- **Nenhum agora.** Tudo está em uso ativo ou intencionalmente isolado.

### Próximo prompt recomendado (reconciliação)

> **Goal:** Refactor cosmético + lock + documentação — preparar terreno para R5/R6.
>
> 1. Em `src/routes/api/analyze-public-v1.ts`, extrair um helper local `buildInsightsCtx({ profile, summary, posts, formatStats, marketSignalsFree, competitorResults, benchmark })` que devolve `{ ctx, editorialPatternsForAi }`. Usar o mesmo helper para v1 e v2 (passar a chamar `generateInsights(ctx)` e `generateInsightsV2(ctx, { previous })`).
> 2. Adicionar nota em `LOCKED_FILES.md` re-bloqueando os componentes do report-redesign e do report-shell (excepto `report-editorial-patterns.tsx`, que ainda pode crescer).
> 3. Documentar em comentário no topo de `editorial-patterns.ts` que `commentsToLikesRatio` e `formatVsCompetitors` existem apenas em `EditorialPatternsForInsights` e não em `EditorialPatterns` da UI (decisão consciente).
> 4. **Não tocar** em `/report/example`, mocks, providers, PDF, prompts da OpenAI.
> 5. Validação: `bunx tsc --noEmit` + abrir `/analyze/frederico.m.carvalho` para confirmar que tudo continua a renderizar.
>
> **Acceptance:** zero alteração visual, zero alteração no payload persistido, ficheiro `analyze-public-v1.ts` reduz ~80 linhas, lock reposto.

---

## VEREDICTO FINAL

**SAFE TO CONTINUE.**

A convergência R1+R2+R3+15+16+17+18+19 está coerente, sem sistemas paralelos a correr em vão, sem mocks a vazar para produção, e com o pipeline pago (v1 + v2) totalmente renderizado. O próximo passo recomendado é o refactor cosmético acima — opcional, mas higiénico antes de avançar para R5/R6.
