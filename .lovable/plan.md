# Editorial V2 — Fase F: 05 — Conversas

Auditoria de proveniência concluída. A secção pode ser construída inteiramente com dados já carregados: nenhum novo fetch, enriquecimento, IA ou algoritmo de análise de comentários.

## Proveniência verificada (produção actual)

| Campo | Fonte real | Categoria |
| --- | --- | --- |
| Comentários por publicação | `payload.posts[].comments` (`number \| null`) | scrape/snapshot |
| Total de comentários da amostra | soma determinística dos valores não-nulos acima | derivação |
| Publicações com ≥1 comentário / média | derivação determinística da mesma lista | derivação |
| Comentários por publicação (extremos) | `enriched.topPosts[].comments`, `bottomPosts[].comments` | scrape |
| Data / thumbnail / permalink | mesmos objectos de post + `pickThumbnailUrl` | scrape |
| Amostra de comentários, respostas, contagens de sinais, excertos, acção recomendada, limitações, `topConversationPost(s)`, `lowConfidence`, `repliesMeasurable`, `reason` | `result.enriched.commentIntelligence` (`payload.comment_intelligence`, thumbnails já hidratadas em `snapshot-to-report-data.ts`) | enriquecimento |
| Motivo de indisponibilidade | `commentIntelligence.reason` mapeado por `publicUnavailableState()` | enriquecimento |

`allPostsScatter` **não** transporta comentários — não será usado aqui.

## Fronteira Free/Pro encontrada (a preservar exactamente)

- Anónimo: a secção Conversas não é renderizada (`report-shell-v2.tsx` só a mostra com `leadCaptured || premiumUnlocked`).
- Free com email capturado: vê a secção completa de comment intelligence.
- Pro: exactamente o mesmo conteúdo (não há campo de comentários exclusivo do Pro).
- `internal_lab`: única diferença — detalhe técnico do motivo de falha (`features.debugLabels`).

Editorial V2 replica isto: gating por `leadCaptured || premiumUnlocked` no shell; detalhe técnico apenas quando `useVariantFeatures().debugLabels !== "hidden"`. Nenhuma verificação de entitlement nova.

## Quatro estados de apresentação

1. **Enriquecimento disponível** (`commentIntelligence.available`): veredicto (`classifyBrandReply`), voz da audiência (`classifiedExcerpts`), sinais com contagem > 0, acção recomendada, métricas apenas mensuráveis (`repliesMeasurable`), nota de amostra limitada, metodologia. Zero invenção.
2. **Zero confirmado**: todos os posts da amostra têm `comments === 0` (nenhum `null`) → estado editorial com `0` grande e "Nenhuma das N publicações analisadas recebeu comentários públicos", com N real.
3. **Comentários existem, sem enriquecimento**: métricas factuais (total, publicações com comentários, média, publicação mais comentada) + bloco neutro "análise aprofundada indisponível". Nunca inferir perguntas/objeções/sentimento.
4. **Dados de comentários indisponíveis** (`comments` nulo/ausente e sem enriquecimento): estado neutro, sem qualquer zero.

Regra transversal: `null`/ausente nunca vira `0`; título "O que revelam os comentários" só no estado 1.

## Ficheiros

Novos, em `src/components/report-editorial-v2/conversations/`:
- `conversations-data.ts` — adaptador puro: classifica o estado (1–4) a partir de `result.enriched.commentIntelligence` e `payload.posts`, com derivações determinísticas e distinção nulo/zero.
- `editorial-conversations.tsx` — apresentação (intro 05, estados, cartões de top conversation posts com thumbnail real e fallback existente, `ObservationBlock` só com factos, `ReadingBlock` só quando existe leitura segura — caso contrário omitido).

Alterado:
- `src/components/report-editorial-v2/editorial-v2-shell.tsx` — renderizar a secção depois de Publicações-chave, com o mesmo gating de produção.

Extracção de lógica de produção: reutilizar os exports já públicos `classifyBrandReply` e `repliesAreMeasurable`. Se `publicUnavailableState` for necessário, é exportado sem alterar comportamento (mudança de uma linha, com teste de regressão). Nenhum refactor mais amplo.

Fora de âmbito: produção, gating, loaders, enriquecimento, custos, PDF, secções seguintes.

## Testes

`src/components/report-editorial-v2/__tests__/conversations.test.ts` cobrindo: zero real vs. em falta, comentários sem enriquecimento sem insights inventados, enriquecimento só com valores reais, números dinâmicos com input variável, amostra dinâmica, `sampleReplies` 0 vs. não mensurável, ausência de números da referência HTML, ausência de mocks em runtime, thumbnails reais e fallback, visibilidade anónimo/Free/Pro, sem fuga de `internal_lab`, snapshot antigo sem enriquecimento em estado verdadeiro de indisponível. Mais: suite de comment intelligence existente, testes report-redesign relevantes e typecheck.

## Validação

Spot-check manual com relatórios reais (um com comentários, outro sem, e um com enriquecimento se existir), comparando amostra, totais, contagens por post e excertos com os dados persistidos. QA visual com dados reais a 1440px, 860px e 375px, verificando ausência de overflow horizontal e distinção clara entre indisponível e zero.
