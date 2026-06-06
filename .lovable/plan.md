## Objectivo

Substituir o gráfico SVG actual de "Ritmo por dia da semana" pela direcção **Editorial monochromatic** escolhida, mantendo todo o resto do cartão Frequência intocado.

## Ficheiro alterado

- `src/components/report-redesign/v2/overview/frequency-card.tsx` — apenas o componente `WeeklyRhythmChart` (linhas ~247–416).

Sem alterações a tokens, i18n, dados, cálculos, lógica do cartão, KPIs ou rodapé de insight.

## O que muda visualmente

- SVG com lanes cinza-azulado + barras chunky → grelha flex de 7 colunas com **track pill** (h-24, full rounded, `#F1F4F9`) e **fill proporcional** desde a base.
- Cores codificadas por intensidade na paleta Ocean Breeze (sem cinzentos pesados, sem misturas):
  - Pico → `#03045E` (navy) cheio + ring `inset 0 0 0 1px rgba(3,4,94,.12)`
  - Outro dia com ratio = 1 → `#0077B6` (ocean)
  - ratio ≥ 0.5 → `#00B4D8` (cyan)
  - ratio > 0 → `#90E0EF` (aqua light)
  - 0 publicações → track desaparece; fica só um **dot 1.5×1.5** na base
- Número por cima: Inter SemiBold tabular-nums, opacity 45% nos dias normais, **bold navy 100%** no pico, **invisível** nos dias zero (mantido no DOM como `aria-hidden`).
- Label do dia (S T Q Q S S D) em baixo: tracking 0.08em, peso normal/bold conforme pico, cor navy/40% normal.
- Eyebrow "RITMO POR DIA DA SEMANA" mantém-se à esquerda; chip "PICO" passa a label simples à direita (sem ponto colorido, sem fundo).
- Animação subtil: fill cresce com transição `duration-500 ease-out` (sem loops).

## Notas técnicas

- Render passa de SVG para divs Tailwind, alinhado com o protótipo escolhido.
- Mapeamento por ratio (e não por absoluto) preserva legibilidade qualquer que seja o `maxPosts`.
- Mantém `aggregateByWeekday`, `pickMostActive`, `weekdayShort` e `aria-label` existentes.
- Sem novas dependências, sem alterações a tokens, sem alterações ao cartão exterior.

## Validação

- Desktop (≥1280): track 48px, h-24, gap-2 → 7 colunas equilibradas dentro do cartão branco.
- Mobile (375–414): `w-full max-w-[48px]` mantém colunas mais estreitas com gap → não rebenta layout.
- Dados extremos: tudo zero → componente continua a devolver `null`; todos iguais → todas barras 100% na cor ocean, sem pico bold.
