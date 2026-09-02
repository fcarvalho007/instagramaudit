# Editorial V2 — Fase C: Frequência editorial

## Verificação do data path (concluída, sem I/O novo)

Todos os campos necessários já chegam ao Editorial V2 através das props de produção (`result`, `payload`), exactamente as mesmas que o shell actual recebe:

| Necessidade | Fonte confirmada |
| --- | --- |
| Frequência por semana | `result.data.keyMetrics.postingFrequencyWeekly` (= `cadence.weekly`) |
| Dimensão da amostra | `result.enriched.cadence.sampleSize` |
| Janela / período activo | `result.enriched.cadence.windowDays` + `cadence.method` (`window_30d`, `window_90d`, `sample_span`, `insufficient`) e `result.enriched.windowRange` |
| Dia da semana de cada publicação | `result.enriched.postingTimeline[]` (`date`, `postCount`) |
| Contagens por dia da semana | agregação Mon→Sun já usada em produção (`aggregateByWeekday`) |
| Suficiência da cadência | `result.enriched.cadence.sufficient` e `cadence.notePt` |
| Estado/rótulo de cadência | `buildCadenceLabelPt` (`src/lib/report/cadence-label.ts`) + `computeFrequencia`/`getFrequencyVerdict` já existentes |

Conclusão: **é possível avançar em Edit Mode**. Nenhum fetch, server function, loader, métrica ou regra de cadência nova.

`LOCKED_FILES.md` lido: nenhum ficheiro desta fase está bloqueado.

## O que vai ser construído

### 1. Helper partilhado de contagem por dia da semana
A agregação Mon→Sun existe hoje como função privada dentro de `frequency-card.tsx`. Para não criar um segundo algoritmo, é extraída sem alteração de comportamento para `src/lib/report/weekday-counts.ts` e o cartão de produção passa a importá-la. Só muda a localização da função — zero alterações de layout, de cálculo ou de saída.

### 2. Adaptador de apresentação Editorial V2
`src/components/report-editorial-v2/frequency/frequency-data.ts`
- lê os campos acima;
- devolve contagens dos 7 dias, máximo, empates, dias sem publicações, total da amostra;
- devolve rótulos de contexto gerados a partir de `cadence.method`/`windowDays` (nunca "quatro semanas" ou "30 dias" fixos);
- devolve estado `sufficient` para bloquear qualquer leitura optimista quando produção marca amostra insuficiente.

### 3. Secção
`src/components/report-editorial-v2/frequency/editorial-frequency.tsx`
- `ReportBand`, eyebrow `02`, título "Com que ritmo publicas";
- lede e nota de cálculo derivadas do contexto real (12 posts / 30d / 90d / span);
- `StatusPill` a partir da lógica de cadência existente;
- gráfico de 7 colunas segunda→domingo, alturas proporcionais, pico destacado, empates tratados como "dias com maior concentração" (sem eleger um vencedor único), dias a zero em estado neutro;
- `ObservationBlock` factual (dia de maior concentração, nº de dias sem publicações, total da amostra);
- `ReadingBlock` cauteloso, sem afirmar causalidade entre distribuição e desempenho;
- estado dedicado para amostra insuficiente e para ausência total de publicações.

### 4. Integração
`editorial-v2-shell.tsx`: renderiza a secção após Engagement, com a mesma visibilidade de produção (`features.blockOverview !== "hidden"`). Sem novas verificações de entitlement.

### 5. Mobile 375px
Intro primeiro, gráfico num único cartão branco compacto com altura reduzida (não é o desktop escalado), sete rótulos visíveis, Observação e Leitura abaixo, sem scroll horizontal.

## Testes
Ficheiro novo em `src/components/report-editorial-v2/__tests__/frequency.test.ts`, cobrindo: contagens a variar com fixtures diferentes; rótulos sensíveis ao contexto (span curto, 30d, 90d); ausência de "quatro semanas" fixo; empate; amostra insuficiente sem estado "saudável"; ausência de `fetch`; visibilidade Free/Pro igual. Mais typecheck e a suite existente de `report-editorial-v2` + `lib/report` para garantir que o cartão de produção não regride.

## QA visual
Playwright com dados reais a 1440px, 768–900px e 375px: sem overflow horizontal e sete rótulos legíveis.

## Fora de âmbito
Formatos, publicações-chave e conversas. Janelas de análise, cache, créditos, refresh, entitlements, providers, snapshots, concorrentes, analytics, PDF e o relatório de produção mantêm-se intactos.
