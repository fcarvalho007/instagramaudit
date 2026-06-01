## 1. Implementation summary (auditado)

Foi consolidado um **modelo único de amostra para o Bloco 1**, com loader puro e sem I/O, alimentando todas as métricas (engagement, cadência, formato, médias, score). O sub-score de "interação" foi removido. Os testes para o sample, pinned filter, observed period e score 60/40 passam todos.

## 2. Final canonical sample definition

| Campo | Valor verificado |
|---|---|
| Ficheiro | `src/lib/report/block01-sample.ts` |
| Função | `buildBlock01Sample(posts)` |
| Interface | `Block01Sample` + summary serializável `Block01SampleSummary` via `toSampleSummary` |
| Fields | `totalReturnedPosts`, `analyzedPosts`, `performancePosts`, `cadencePosts` (alias de `performancePosts`), `formatPosts` (=`analyzedPosts`), `pinnedPostsExcluded`, `dateOutliersExcluded`, `observedPeriodDays`, `newestPostDateIso`, `oldestPostDateIso`, `sampleLabel` |
| Base sample | últimos posts retornados, **capped a 12** em `normalize.ts` via `PUBLIC_INSTAGRAM_POSTS_LIMIT` (`src/lib/analysis/constants.ts:22`) — Apify limit inalterado |
| Janela temporal premium | **não introduzida** (lab Apify já existe em `/admin/apify-lab` mas isolado, não toca no free) |
| Filtro pinned | `is_pinned === true` removido com fallback "todos pinned → mantém tudo" |
| Date outliers | > 180 dias mais antigos que a mediana das 10 datas mais recentes |
| Fonte de verdade | usada por `snapshot-to-report-data.ts:1154–1224` para sobrepor `engagementRate`, `postsAnalyzed`, `dominantFormat`, `dominantFormatShare`, e ressincronizar `formatBreakdown` |

`enriched.block01Sample` é serializado e viaja para o cliente (`snapshot-to-report-data.ts:1624`), mas **a UI ainda não renderiza explicitamente uma legenda "Análise baseada nas últimas N publicações · Período observado: X dias"** usando este summary. A caption equivalente vive no `cadence` (`kpiSubtitle`, `sampleCaption`) — ver P2 #1.

## 3. Block 1 — table by card

| Card | Componente | Métrica | Fonte / fórmula | Pinned excl. | Outliers excl. | content_summary cache | Risco |
|---|---|---|---|---|---|---|---|
| Score global | `editorial-identity-card.tsx` (`IndexBlock`) | índice 0–100 | `computeGlobalScore(env, freq)` = `0.6·env + 0.4·freq` | herdado | herdado | não | OK |
| Sub-score envolvimento | `overview/score-utils.ts:computeEnvolvimento` | `min(100, round(ER/benchmark · 100))` | `keyMetrics.engagementRate` (já recalculado do `performancePosts`) | sim | sim | não | OK |
| Sub-score frequência | `score-utils.ts:computeFrequencia` | curva piecewise em torno de 3–5 pub/sem | `keyMetrics.postingFrequencyWeekly` = `cadence.weekly` (de `cadencePosts`) | sim | sim | não | OK |
| ~~Sub-score interação~~ | — | **REMOVIDO** | `computeInteraccao` apagado (comentário em `score-utils.ts:66`) | n/a | n/a | n/a | OK |
| EditorialIdentityCard | `overview/editorial-identity-card.tsx` | título/parágrafo + bullets | `editorial_verdict` IA + fallback determinístico `deriveSignals` | sim | sim | não | OK |
| Avg likes / comments | `report-overview-block.tsx:54` → `computePostAverages` | `Σlikes / nonPinned.length` | **só pinned excluded** (`excludePinned: true` por defeito), **não exclui date outliers** | sim | **NÃO** | fallback | **P1** — divergência potencial de denominador vs ER |
| Engagement card | `report-overview-engagement.tsx` | `k.engagementRate`, `k.engagementBenchmark`, `engagementDeltaPct` | recalculado em `snapshot-to-report-data.ts:1170` a partir de `performancePosts` | sim | sim | não | OK |
| Frequência (FrequencyCard) | `overview/frequency-card.tsx` | `computeFrequencia(postingFrequencyWeekly)` + cadence cascade | `cadence.weekly`, `cadence.windowDays`, `cadence.sufficient` | sim | sim | não | OK |
| Formato (FormatCard) | `overview/format-card.tsx` | `dominantFormat`, `dominantFormatShare`, contagens | `payload.format_stats` (autoritativo) → `analysedPostFormats` → round-trip; shares re-sincronizados de `sample.formatPosts` | sim | (formatPosts = analyzed, sem outlier prune) | autoritativo + fallback | OK |
| Best/Worst (PostComparisonBlock) | `report-post-comparison.tsx` | `topPosts[0]` / `bottomPosts[0]` | `buildTopPosts(posts)` — **usa `posts` raw, não `sample.performancePosts`** | **NÃO** | **NÃO** | não | **P1** — best/worst pode pegar num post pinned ou outlier |
| Benchmark | `overview/score-card.tsx`, `report-overview-engagement.tsx` | benchmark externo (Socialinsider/tier) | `keyMetrics.engagementBenchmark` (do `benchmark.positioning`) | n/a | n/a | n/a | OK (separação clara) |
| Methodology note | i18n `engagement.methodology` + `sample_title` | label estático | i18n estático — não usa `block01Sample.observedPeriodDays` | n/a | n/a | n/a | **P2** — caption "X publicações · Y dias observados" só vive em `meta.kpiSubtitle`/`sampleCaption` e não é renderizada no v2 |

## 4. Final score formula

```
sub_envolvimento = min(100, round((ER / tier_benchmark) · 100))
sub_frequencia   = piecewise(postsPerWeek):
                     [3..5]   → 90 + (5 - |4 - ppw|) · 2
                     [1..3) ∪ (5..7] → 50 + (linha tangente até 90)
                     resto    → max(20, 100 - |4 - ppw|·15)
score_global     = round(0.6 · sub_envolvimento + 0.4 · sub_frequencia)
```

Sub-score "interação" **removido** (`score-utils.ts:64-69` comment); nenhuma referência viva. Tooltip / `SCORE_DEFINITIONS` só lista os 2 sub-scores. Teste explícito: `block01-sample.test.ts:77-86` cobre os pesos 60/40 e o caso sem interação.

## 5. Copy safety

- `"últimos 30 dias"` aparece **só nas chaves `*.window_30d` / `*.window_summary_30d` / `cadence.window_30d`**, todas renderizadas condicionalmente quando `cadence.method === "window_30d"`. Seguro.
- `posts.subtitle_with_window` recebe `meta.windowShortLabel` que reflete `30 dias` / `90 dias` / `N publicações` / `amostra insuficiente`. ✅
- **P2 #1**: chave estática `posts.subtitle = "O contraste editorial dos últimos 30 dias"` é fallback morto (windowShortLabel está sempre populado), mas existe — risco se algum caminho legacy a render. Trocar para uma forma neutra ("O contraste editorial da amostra observada") ou remover.
- **P2 #2**: copy esperada `"Análise baseada nas últimas {{count}} publicações disponíveis."` / `"Período observado: {{days}} dias."` **não existe explicitamente no Bloco 1 da UI v2**. Há equivalente próximo em `meta.sampleCaption` (`"Análise baseada nas últimas N publicações recolhidas."`) gerado em `snapshot-to-report-data.ts:1372` mas **não renderizado no v2** (só consumido pelo report legacy em `src/components/report/`).

## 6. Benchmark consistency

- Score `envolvimento` e Engagement card usam **a mesma fonte**: `keyMetrics.engagementBenchmark` derivado de `input.benchmark.positioning.benchmarkValue` (tier).
- Engagement card mostra adicionalmente referência externa por formato (Socialinsider) em `chartBenchmarkVal` — **claramente separada** como "referência externa", com `methodology` i18n a explicar a diferença ("não como meta fixa").
- Nenhum card sugere comparação na mesma janela quando o benchmark é externo. ✅

## 7. AI consistency

- `editorial-identity-card.tsx:354` comentário confirma que `ai_insights_v2.sections.hero.text` **nunca é renderizado**. O card consome só `editorialVerdict` estruturado; sem este, cai no fallback `deriveSignals` que parte das mesmas métricas canónicas (`scores`, `keyMetrics`, `cadenceMethod`, `cadenceWindowDays`).
- `deriveEditorialVerdict` em `editorial-verdict.ts` valida o veredicto IA contra os números (reasons: `conversation_contradiction`, `attention_no_conversation_missed`), caindo para fallback se contradisser.
- Bullets `strengths`/`limits` vêm da IA quando válida, do fallback determinístico caso contrário — ambos limitados ao Bloco 1 sample.
- `evidence_used` (chaves `cadence.window_30d`, `benchmark.tier_delta`, `format_mix.*`, etc.) só usa caminhos com tradução em i18n.

## 8. Tests run

- `bunx tsc --noEmit` → **clean** (0 erros).
- `bunx vitest run` → **611 pass / 9 fail** — todas as falhas são em `registry-parity.test.ts` e `send-commercial-followup.test.ts` (email infra), **nenhuma no Bloco 1**.
- Targeted: `block01-sample.test.ts` (6), `post-aggregates.test.ts` (3), `snapshot-pinned-window.test.ts` (2), `snapshot-pinned-toppost.test.ts` (2) → **13/13 pass**.

## 8b. Manual validation (3 cached snapshots)

| Perfil | Total | Pinned excl. | Analyzed | Outliers | Observed days | Newest→Oldest | Avg likes | Avg comments | Cadence | ER | Env | Freq | Score |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| pedrocaramez | 12 | 2 | 10 | 0 | 37 | 28 Mai → 23 Abr | 10 | 0,60 | 1,20/sem (30d) | 0,08% | 8 | 54 | **26** |
| susanatrigobarros | 12 | 0 | 12 | 0 | 84 | 21 Abr → 28 Jan | 8 | 0,17 | 0,50/sem (90d) | 0,16% | 16 | 48 | **29** |
| milestone.pt | 12 | 0 | 12 | 0 | 23 | 26 Mai → 5 Mai | 12 | 0,08 | 2,80/sem (30d) | 2,61% | 100 | 86 | **94** |

Janela catastrófica 1131 dias do `pedrocaramez` foi **eliminada** pelo filtro pinned (passou a 37 dias). Cadência sai do 0,08/sem antigo para 1,20/sem. ✅

## 9. P0/P1/P2 issues

- **P0**: nenhum.
- **P1 #1** — divergência de denominador: `computePostAverages` exclui só pinned; `engagementRate` exclui pinned + date outliers. Hoje não dispara porque os outliers só aparecem após filtragem de pinned na amostra atual. Mitigação: passar `posts = sample.performancePosts` para `computePostAverages`, ou aceitar nova option `excludeOutliers`.
- **P1 #2** — `buildTopPosts(posts)` usa raw `posts`, não `sample.performancePosts`. Pode eleger um post pinned ou outlier como "melhor publicação" (Bloco 1 PostComparison). Mitigação: passar `sample.performancePosts`.
- **P2 #1** — `posts.subtitle = "...últimos 30 dias"` é fallback estático morto mas existente. Trocar por copy neutra.
- **P2 #2** — `block01Sample.observedPeriodDays` está disponível no enriched mas a UI v2 não o expõe explicitamente. O brief pedia "Análise baseada nas últimas N publicações / Período observado: X dias" como linha visível no Bloco 1. Adicionar 1 linha de methodology junto à `EditorialIdentityCard`.

## 10. GO / NO-GO

**GO condicional para beta.**

A matemática do score, a janela observada e o filtro pinned estão **defensáveis e testados** nos 3 perfis amostrados, com o caso patológico (pedrocaramez, 2023 pinned + 2026 fresh) resolvido. As inconsistências remanescentes são de **coerência de denominador entre cards adjacentes** (P1 #1 e #2), não de correctness do score global. Recomendado fechar os 2 P1 antes de exposição pública mais ampla; os P2 podem entrar em PR de copy follow-up.

## Próximas ações sugeridas (não executadas)

1. **P1 #1**: `report-overview-block.tsx:55` → `computePostAverages(sample.performancePosts)` com summary já no `enriched.block01Sample` (precisa expor `performancePosts` ou recalcular).
2. **P1 #2**: `snapshot-to-report-data.ts:1227` → `buildTopPosts(sample.performancePosts)` em vez de `posts`.
3. **P2 #1**: alterar `posts.subtitle` (pt/en) para forma neutra ou removê-lo do fallback.
4. **P2 #2**: render visível em `EditorialIdentityCard` da linha "Análise baseada nas últimas {N} publicações · Período observado: {D} dias", consumindo `block01SampleSummary`.

Confirmas quais destes (1–4) queres que prepare em build mode?