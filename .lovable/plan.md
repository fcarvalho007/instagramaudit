# Header consistency hotfix — cards analíticos V2

Correcção da regressão introduzida nas rondas 04/05: Frequência e Formato passaram a usar título em bloco (`qualifierPlacement="block"`), quebrando o padrão inline canónico do Engagement. Nenhum conteúdo interno dos cards é alterado.

## Auditoria dos headers montados (verificada no código)

| Componente | Eyebrow | Título | Qualifier | Modo | Redundância | Estado |
|---|---|---|---|---|---|---|
| `report-overview-engagement` | ENGAGEMENT | Taxa de Engagement | Baixa/Média/Alta | inline | tolerada (aprovada) | CANONICAL (golden reference) |
| `overview/frequency-card` | — | Frequência de publicação | Alta/Média/Baixa | **block** | título repetido como eyebrow visual | **REGRESSION** |
| `overview/format-card` | — | Formato | Pouco variado/Variado/Muito variado | **block** | idem | **REGRESSION** |
| `report-post-comparison` (preview) | linha de amostra | Melhores e piores publicações | — | inline | não | CANONICAL |
| `report-post-comparison` (completo) | linha de amostra | Melhores e piores publicações | — | inline | não | CANONICAL |
| `report-comment-intelligence` | Conversas | O que revelam as conversas? | — | inline | não | CANONICAL |
| `report-themes-feature` | Pergunta 04 · Temas das legendas | Sobre que assuntos o perfil fala mais? | — | inline | não | CANONICAL |
| `EditorialIdentityCard` / Índice | — | hierarquia própria | — | — | — | INTENTIONAL EXCEPTION |
| Capítulos (`report-block-section`), Pro Gate (`end-of-free-block`), navegação, metodologia | — | — | — | — | — | INTENTIONAL EXCEPTION |

Os únicos consumidores de `qualifierPlacement="block"` em todo o projecto são Frequência e Formato.

## Correcções

1. **Frequência** — remover `qualifierPlacement="block"`; volta a `Frequência de publicação Alta` num único `<h3>`, com o mesmo tratamento tonal e underline subtil. KPI, gráfico, métricas de suporte e conclusão ficam intactos.
2. **Formato** — remover `qualifierPlacement="block"`; volta a `Formato Pouco variado`. Hero, percentagem, distribuição, filmstrip e conclusão ficam intactos.
3. **`ReportCardSectionHeader`** — como não sobra nenhum consumidor legítimo, remover a variante `block` (prop, ramo de render e o mapa `BLOCK_QUALIFIER_COLOR`), deixando o inline como único comportamento. Documentar no comentário do componente a regra de não-redundância eyebrow/título.
4. **Engagement** — não tocado.

## Teste de guarda

Novo teste estrutural (leitura do ficheiro-fonte, sem screenshots): confirma que `frequency-card.tsx` e `format-card.tsx` não contêm `qualifierPlacement`, que os três cards usam `ReportCardSectionHeader`, e que o título vive em `REPORT_SECTION_HEADER_TOKENS.title`.

## Notas técnicas

Ficheiros: `src/components/report-redesign/v2/overview/frequency-card.tsx`, `.../overview/format-card.tsx`, `.../report-card-section-header.tsx`, e um novo teste em `.../v2/__tests__/`. Sem alterações a i18n, `score-utils`, gating, analytics, sidebar ou hero. Validação: typecheck + `vitest run` + inspecção a 1440 e 390.
