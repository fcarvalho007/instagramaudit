# Editorial V2 — Fase B: Engagement

## Verificação do data-path (concluída, read-only)

Fontes de produção já disponíveis nas props do relatório, sem novo I/O:

| Necessidade | Fonte existente |
| --- | --- |
| Taxa de engagement do período | `reportData.keyMetrics.engagementRate` |
| Referência do escalão actual | `reportData.keyMetrics.engagementBenchmark` (de `benchmark.positioning.benchmarkValue`) |
| Delta vs referência | `reportData.keyMetrics.engagementDeltaPct` |
| Definição de escalão | `resolveReportTier()` já aplicado → `profile.tier` / `profile.tierRange`; label do benchmark em `tierLabel` |
| Amostra usada na média | `keyMetrics.postsAnalyzed` + `windowLabel` |
| Estado (acima/alinhado/abaixo) | `positioning.positionStatus` / delta já derivado |
| Versão do dataset | `benchmarkSource.datasetVersion` |

## Dependência bloqueante — cinco escalões

Os valores de benchmark dos **outros quatro escalões não estão disponíveis** no
contrato de dados actual. O adaptador só transporta a referência do escalão do
perfil (`perFormatReference` do escalão corrente + `positioning`). A tabela
completa por escalão vive em `benchmark_references` (cloud), carregada apenas
server-side em `benchmark-input.server.ts`.

Existe um mapa estático em código (`FALLBACK_BENCHMARK_DATA`) com os cinco
escalões, mas é apenas fallback de build-time; usá-lo para desenhar as cinco
barras mostraria valores potencialmente divergentes do dataset activo, ao lado
de um valor real vindo da cloud. Isso viola a regra de integridade de dados.

Conclusão: renderizar os cinco escalões exigiria alteração de loader/servidor.
Não será feito nesta fase. Implementa-se a **variante de fallback** prevista no
próprio pedido: comparação Editorial V2 de escalão único, com o escalão actual
identificado.

## O que será implementado

Novos ficheiros em `src/components/report-editorial-v2/engagement/`:

- `engagement-data.ts` — derivação pura a partir das props já recebidas
  (taxa, referência, delta, escalão, amostra, estado). Sem novas fórmulas:
  só leitura e formatação dos valores já calculados em produção.
- `editorial-engagement.tsx` — banda `ReportBand`:
  - coluna de contexto (1–4): eyebrow `01 — Engagement`, título
    "Quantas pessoas reagem ao que publicas", lede em linguagem simples,
    `StatusPill` derivado do estado real, nota de cálculo com a amostra real;
  - coluna de dados (6–12): comparação principal `MetricDisplay`
    (perfil vs referência do escalão), equivalência "X em cada 1 000
    seguidores" derivada deterministicamente da mesma taxa, barra comparativa
    do escalão actual com marcação "Estás aqui", `ObservationBlock` factual
    (taxa, referência, gap já derivado) e `ReadingBlock` com linguagem cautelosa
    ("Os dados sugerem…"), reutilizando interpretação de produção quando existe.
- Estado de indisponibilidade: quando `positioning.status !== "available"`,
  mostra a taxa e explica que não há referência publicada para o escalão.

Mobile 375px: intro fora dos cartões, comparação num cartão branco focado,
barra de escalão em cartão compacto, Observation em bloco branco, Reading em
bloco azul-claro, nota de cálculo no fim, sem scroll horizontal, mínimo 12px.

Integração: a secção é inserida na `EditorialV2Shell` a seguir à Visão geral,
com a mesma visibilidade que o Engagement tem hoje (sem novos entitlement
checks). Nenhuma alteração ao relatório default, gating, PDF, analytics,
créditos ou checkout.

Motion: apenas as utilidades de reveal/fill já existentes em
`src/styles/editorial-v2.css`, com respeito por `prefers-reduced-motion`.

## Testes

Novo `engagement.test.ts` (+ actualização do teste de presentation):

1. relatório default inalterado (Editorial V2 só com `?report_design=editorial_v2`);
2. taxa e referência acompanham fixtures diferentes;
3. nenhum número de benchmark hardcoded (fixtures alteradas mudam o output);
4. escalão identificado a partir dos dados reais;
5. fallback de escalão único quando não há cinco bandas;
6. estado sem benchmark disponível renderiza sem erro;
7. visibilidade Free/Pro inalterada;
8. render puro — nenhuma chamada de rede/fetch.

Correm-se ainda os testes de `src/components/report-editorial-v2` e
`src/lib/report`.

## QA visual

Playwright com dados reais a 1440px, 768–900px e 375px: overflow, clipping de
labels, legibilidade e alinhamento Observation/Reading.

## Fora de âmbito

Frequência, Formatos, Publicações-chave, Conversas, secções Pro, e qualquer
alteração de arquitectura de dados para obter os cinco escalões.
