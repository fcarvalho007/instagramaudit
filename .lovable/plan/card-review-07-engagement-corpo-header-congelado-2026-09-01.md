# Card Review 07 — Engagement (corpo, header congelado)

Refinar apenas o corpo do `EngagementCardRefined`. O header aprovado fica intocado.

## Estrutura actual dos KPIs

Três caixas iguais numa grelha `sm:grid-cols-3`, todas com o mesmo tamanho de número (1.6rem / 2.25rem), o mesmo padding e o mesmo peso visual:

```text
[ Taxa deste perfil ] [ Mediana do escalão ] [ Distância ]
      0,08%                  4,80%             98% inferior
```

## Estrutura proposta

Uma única unidade comparativa, em vez de três widgets independentes:

```text
┌─────────────────────────────────────────────────────────┐
│  TAXA DESTE PERFIL                                      │
│  0,08%          vs. 4,80%  mediana do escalão (Micro)   │
│  legenda curta      → 98% inferior                      │
└─────────────────────────────────────────────────────────┘
```

- KPI principal: `0,08%` ganha protagonismo por posição, espaço e contraste (subida moderada de escala, ~2rem/2.75rem), com o eyebrow "Taxa deste perfil" por cima.
- Benchmark: mesmo valor e mesma copy, apresentado ao lado como referência com escala menor (~1.5rem) e cor secundária, sem caixa própria.
- Distância: `98% inferior` fica como consequência, ligada visualmente ao par acima (seta/`vs.`), em tom subtil de sinal — nunca uma superfície vermelha grande.
- Tudo dentro de um único bloco com uma separação interna leve, em vez de três cartões com borda.

Mobile (375/390): empilha na ordem obrigatória taxa → benchmark → distância → gráfico → diagnóstico, sem colunas estreitas e sem overflow horizontal.

## Densidade

- Remove-se a moldura tripla e o padding duplicado, reduzindo a altura da zona de KPIs.
- Aperta-se o espaço entre KPIs e gráfico (`mt-4 sm:mt-6` → margem mais curta), sem comprimir o gráfico.
- `InsightCallout` e `readingText` mantêm-se, no fim, com hierarquia ligeiramente mais discreta (é prova, não novo diagnóstico executivo).

## Congelado

- Header: eyebrow, título, qualifier inline, tokens, subtítulo, underline tonal — zero alterações; `qualifierPlacement` não regressa.
- Toda a lógica analítica: `engagementRate`, `engagementBenchmark`, série consolidada, `getActiveTierIndex`, `gapPp`, `pctDiffLabel`, `pctDiffDirection`, `engagementStatus`, thresholds, `readingText`, multiplicadores, fontes.
- `ReportEngagementBenchmarkChart` e as suas props.
- Nenhuma diferença por estado A/B/C. Nenhum outro card tocado (Frequency, Format, Índice, PostComparison, Conversas, Pro Gate, sidebar).

## Notas técnicas

Ficheiros: `src/components/report-redesign/v2/report-overview-engagement.tsx` (apenas JSX/classes abaixo do header) e, se ajudar a legibilidade, um subcomponente local `overview/engagement-kpi-row.tsx` puramente de apresentação. Cores só via tokens semânticos existentes (`content-*`, `signal-*`, `surface-muted`, `border-default`); os rgba decorativos já documentados no topo do ficheiro mantêm-se ou são reduzidos.

Novas chaves i18n: nenhuma nova copy; reutilizam-se as chaves `engagement.kpi.*` existentes (PT/EN).

Validação: `tsgo` + `vitest run` (incluindo o guarda `header-consistency.test.ts` e um novo teste estrutural que confirma que o card não reintroduz `qualifierPlacement` e mantém as chaves de KPI), inspecção visual a 1440 e 390 com o mesmo snapshot, comparando valores antes/depois para confirmar identidade numérica.
