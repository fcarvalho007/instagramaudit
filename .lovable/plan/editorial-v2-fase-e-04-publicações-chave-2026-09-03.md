# Editorial V2 — Fase E: 04 Publicações-chave

Auditoria de proveniência concluída. Todos os números necessários existem nos dados já
carregados. Não é preciso nova chamada, loader, fixture, valor da referência HTML nem
benchmark de fallback. Uma divergência de fontes foi identificada e é reportada abaixo
sem ser reconciliada.

## Auditoria de dados (leitura já feita)

| Necessidade | Fonte real | Categoria |
| --- | --- | --- |
| Amostra completa para distribuição | `result.enriched.allPostsScatter` (todas as publicações da janela) | snapshot |
| Dimensão da amostra de performance | `sample.performancePosts.length` (rótulo/eyebrow, via `pickSubtitleKey`) | snapshot |
| Data de cada ponto | `allPostsScatter[].date` / `takenAtIso` | snapshot |
| Formato de cada ponto | `allPostsScatter[].format` (`formatLabelForCard`) | snapshot |
| Engagement por publicação | `engagementPct` (`round2(post.engagement_pct)`) | snapshot (autoritativo) |
| Média da amostra | média aritmética de `allPostsScatter[].engagementPct` — mesma fórmula do bloco de produção | derivação existente |
| Melhor publicação | `result.enriched.topPosts[0]` (eligiblePosts ordenados por engagement desc) | derivação existente |
| Pior publicação | `result.enriched.bottomPosts[last]` (vazio se < 4 posts elegíveis) | derivação existente |
| Legenda, likes, comentários, thumbnail, permalink | campos de `topPosts`/`bottomPosts` (thumbnail via `pickThumbnailUrl`) | snapshot |
| Amplitude | `best/worst` quando `worst > 0`, tal como em produção | derivação existente |
| % acima/abaixo da média | `((valor − média) / média) × 100` quando `média > 0`, tal como em produção | derivação existente |
| Janela do eixo X | `result.enriched.windowRange` | derivação existente |

### Divergência de fontes — reportada, não reconciliada

Em produção, melhor/pior derivam de `eligiblePosts` (`sample.performancePosts`),
enquanto o scatter e a média derivam de `posts` (todas as publicações da janela).
A autoridade está estabelecida: é exactamente o que o bloco de produção
`PostComparisonBlock` já faz hoje. A Fase E reutiliza essa mesma combinação sem
alterar nenhuma das duas derivações e sem criar uma terceira. Quando as duas
amostras diferirem em tamanho, a copy indica o número de pontos representados
e o número de publicações da amostra de performance, sem os fundir.

Elementos da referência HTML que **não** serão reproduzidos: taxas, datas, legendas,
likes, comentários, posições de gráfico, percentagens e capas CSS ilustrativas; e a
afirmação causal sobre a primeira linha da legenda determinar o resultado.

## Alterações previstas

1. **Extração de cálculo partilhado**
   `src/lib/report/key-post-stats.ts` — mover, sem alterar comportamento, o cálculo
   hoje embutido em `report-post-comparison.tsx`: média da amostra do scatter,
   multiplicador (`worst > 0 ? Math.round(best/worst) : 0`) e deltas relativos à
   média. O componente de produção passa a importar o helper; o output renderizado
   fica idêntico, com teste de regressão.

2. **Adaptador de apresentação**
   `src/components/report-editorial-v2/key-posts/key-posts-data.ts` — consome
   `enriched.topPosts`, `enriched.bottomPosts`, `enriched.allPostsScatter`,
   `windowRange`, `cadence.method` e o tamanho da amostra de performance; devolve
   pontos do gráfico com posição derivada dos valores reais, média, extremos,
   amplitude (rácio quando válido, diferença em pontos percentuais quando
   `worst === 0`, estado "sem amplitude mensurável" quando `best === worst`),
   deltas seguros e estados degenerados (0/1/2 posts, todos iguais, média zero,
   valores em falta, empates). Empates seguem a ordenação determinística já usada
   em produção (`sort` estável por engagement), sem inventar critério novo.

3. **Secção**
   `src/components/report-editorial-v2/key-posts/editorial-key-posts.tsx` —
   `ReportBand` com eyebrow `04 — Publicações-chave`, título
   `A distância entre os dois extremos`, lede gerada dos valores reais,
   `StatusPill` informativa só quando a amplitude é matematicamente válida,
   gráfico de dispersão SVG (escala derivada dos dados, linha de média, melhor e
   pior destacados, raio de ponto reduzido em amostras grandes, todos os pontos
   mantidos), cartões de melhor e pior publicação com thumbnail real e fallback
   degradado, `ObservationBlock` só com factos calculados (diferença, formatos
   iguais ou diferentes, proximidade temporal, diferenças de likes/comentários)
   e `ReadingBlock` estritamente hipotético, sem causalidade e sem chamada de IA.
   Se não existir hipótese segura, a Leitura é omitida.

4. **Gating idêntico ao de produção**
   Em estado anónimo, produção mostra apenas `PostComparisonPreview` (sem
   engagement, likes, comentários, multiplicador ou scatter). A secção Editorial V2
   respeita exactamente essa regra: anónimo vê versão sem valores analíticos;
   lead e Pro veem a secção completa. Sem novos entitlements ou verificações.

5. **Mobile 375px**
   Ordem: intro, gráfico compacto, cartão da melhor, cartão da pior, Leitura.
   Layout desenhado para 375px, sem overflow horizontal, com legendas truncadas
   pelas convenções já existentes.

6. **Testes**
   `key-posts.test.ts` + regressão do helper extraído, cobrindo os 18 pontos
   pedidos: posições variam com os inputs, média muda com a amostra, melhor/pior
   mudam com os dados, amplitude dinâmica, denominador zero sem `Infinity`/`NaN`,
   média zero segura, amostra não assumida como 12, thumbnails reais e fallback,
   legenda em falta, empates, ausência de números da referência, ausência de mock
   runtime, ausência de fetch e visibilidade Free/Pro inalterada.

7. **QA e verificação numérica manual**
   Playwright com relatório real a 1440px, 820–900px e 375px; sem overflow.
   Conferência manual contra o snapshot carregado: contagem da amostra, engagement
   de pelo menos três publicações, média, melhor, pior, amplitude, percentagens,
   datas, likes/comentários e as duas thumbnails.

## Fora de âmbito

Conversas, diagnóstico Pro, prioridades Pro, navegação, metodologia, PDF, loaders,
schema, providers, janelas, benchmarks, cache, créditos, checkout, concorrentes,
analytics e o relatório de produção por defeito.
