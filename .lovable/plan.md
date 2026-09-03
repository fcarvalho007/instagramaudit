# Editorial V2 — Fase D: Mix de formatos (03)

Auditoria de proveniência concluída. Todos os números necessários existem nos dados
já carregados do relatório. Não é preciso qualquer chamada nova, fixture, valor da
referência HTML nem benchmark de fallback.

## Auditoria de dados (leitura já feita)

| Necessidade | Fonte real | Categoria |
| --- | --- | --- |
| Total de publicações da amostra | `result.data.keyMetrics.postsAnalyzed` (`content_stats.posts_analyzed`) | snapshot |
| Formato de cada publicação | `result.enriched.analysedPostFormats[].type` (via `normaliseFormat(p.format)`) | snapshot |
| Contagem por formato | `payload.format_stats[k].count` (autoritativo) → contagem por post → arredondamento a partir de `sharePct` | derivação existente |
| Percentagem por formato | `result.data.formatBreakdown[].sharePct` (`format_stats[k].share_pct`) | derivação existente |
| Formato dominante | `keyMetrics.dominantFormat` / `dominantFormatShare` | derivação existente |
| Estado do mix | `getFormatVariationStatus()` já exportado pelo cartão de produção | regra de produção |
| Ordem e datas das publicações | `analysedPostFormats` (ordenado por data) | snapshot |
| Thumbnail real | `analysedPostFormats[].thumbnailUrl`, já resolvido por `pickThumbnailUrl` (Storage → CDN IG → camelCase) | snapshot |
| Fallback de thumbnail | ausência de `thumbnailUrl` → estado degradado com ícone de formato, como em produção | produção |
| Contexto da janela | `describeWindow()` do adaptador de frequência + `cadence.method` | derivação existente |

Elementos da referência HTML que **não** serão reproduzidos:

- a frase sobre visualizações médias dos reels vs gostos nos carrosséis — o snapshot
  não garante um campo de views/plays comparável; a afirmação é omitida;
- capas CSS artificiais e legendas de exemplo;
- valores de dash SVG fixos e percentagens ilustrativas;
- engagement por formato vs benchmark (mantém-se apenas em produção, para não
  introduzir uma leitura nova nesta camada).

## Alterações previstas

1. **Extração sem mudança de comportamento**
   `src/lib/report/format-entries.ts` — mover, tal como está, a derivação de
   `formatEntries` hoje presente em `report-overview-block.tsx` (payload → posts →
   arredondamento). O componente de produção passa a importar o helper; o resultado
   renderizado fica idêntico. Teste de regressão sobre as três vias de fallback.

2. **Adaptador de apresentação**
   `src/components/report-editorial-v2/format-mix/format-mix-data.ts` — consome
   `formatEntries`, `keyMetrics`, `analysedPostFormats` e o rótulo de janela;
   devolve segmentos do anel (proporções calculadas), legenda, dominante, número de
   formatos presentes, publicações com thumbnail e estados degenerados
   (zero posts, um post, um só formato, formato desconhecido, sem thumbnails).

3. **Secção**
   `src/components/report-editorial-v2/format-mix/editorial-format-mix.tsx` —
   `ReportBand` com eyebrow `03 — Mix de formatos`, título `O que costumas publicar`,
   lede gerada da amostra real, `StatusPill` com o estado de produção, nota de
   contexto da janela; à direita anel + legenda (`nome · N de T · X%`), tira de
   publicações reais, `ObservationBlock` factual e `ReadingBlock` cauteloso.
   Percentagens exibidas tal como calculadas — sem forçar soma 100.

4. **Tira de publicações**
   Limite de apresentação (12 no desktop, 8 em mobile) com nota factual
   "a mostrar N de T publicações da amostra" sempre que houver corte. A amostra
   analisada não muda; não há paginação nem fetch.

5. **Integração**
   `editorial-v2-shell.tsx` renderiza a secção após Frequência, sob a mesma condição
   `features.blockOverview !== "hidden"`. Sem novas verificações de entitlement.

6. **Testes**
   `format-mix.test.ts` (adaptador) + regressão do helper extraído: contagens e
   percentagens variam com fixtures, dominante muda, estado de um só formato, amostra
   diferente de 12, thumbnails reais usados, fallback quando ausentes, sem fetch,
   ausência de números da referência.

7. **QA visual e verificação numérica**
   Playwright com relatório real a 1440px, 820px e 375px; sem overflow; conferência
   manual de total, contagens, percentagens, dominante e três thumbnails contra o
   snapshot carregado.

## Fora de âmbito

Key Posts, Conversas, secções Pro, PDF, navegação, metodologia, loaders, providers,
janelas, benchmarks, créditos, checkout, analytics e o relatório de produção por
defeito.
