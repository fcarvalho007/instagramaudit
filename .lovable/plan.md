
## Ficheiros a alterar

1. **`src/components/report-redesign/v2/report-overview-engagement.tsx`** — card principal
2. **`src/components/report-redesign/v2/report-engagement-benchmark-chart.tsx`** — chart de tiers

Nenhuma alteração a dados, fórmulas, providers ou lógica de scoring.

## Dados disponíveis (confirmados, sem alterações)

- `k.engagementRate` — taxa do perfil
- `chartBenchmarkVal` — benchmark do tier ativo
- `gapPp` / `pctDiffLabel` / `pctDiffDirection` — distância à referência
- `engagementStatus` — "Alta" / "Média" / "Baixa"
- `isBelowBenchmark` — flag booleana
- `benchmarkSeries`, `activeTierIdx`, `activeTier`
- `readingText` — texto diagnóstico já calculado

## Alterações no card principal (`report-overview-engagement.tsx`)

### KPI cards (grid 3-col)
- Aumentar números de `text-[1.1rem] sm:text-[1.6rem]` → `text-[1.4rem] sm:text-[2rem]`
- Aumentar padding interno: `px-3 py-4 sm:px-5 sm:py-5`
- Reduzir opacidade do border-left de 0.50 → 0.30 (menos agressivo)
- Reduzir opacidade dos fundos: danger bg 0.04 → 0.025, success bg 0.04 → 0.025, blue bg 0.03 → 0.02
- Aumentar gap do grid: `gap-2 sm:gap-3` → `gap-3 sm:gap-4`
- Aumentar margens gerais: `mt-4 sm:mt-6` → `mt-6 sm:mt-8`, `pb-5` → `pb-6 sm:pb-8`

### Header
- Reduzir underline do status word de 2px → 1.5px, opacidade 0.50 → 0.35
- Aumentar padding top/bottom do header: `pt-5 sm:pt-6 md:pt-8` → `pt-6 sm:pt-8 md:pt-10`

## Alterações no chart (`report-engagement-benchmark-chart.tsx`)

### Tier rows
- Aumentar gap entre rows: `gap-1.5` → `gap-2`
- Active row: reduzir border de 2px → 1.5px, opacidade border 0.35 → 0.25
- Active row: reduzir opacidade do fundo de 0.05 → 0.03
- Active row: aumentar padding `py-2.5 sm:py-3` → `py-3 sm:py-4`
- Inactive rows: aumentar height das barras `h-5 sm:h-6` → `h-6 sm:h-7`

### "ESTÁS AQUI" badge
- Reduzir intensidade: font-bold → font-semibold, tracking mais aberto
- Border opacity 0.35 → 0.20

### Inactive bars
- Manter opacidade leve (já 8%), sem alteração

### Axis / footer
- Sem alterações

## Comportamento responsivo

Mantém-se: grid 3-col em todos os breakpoints, chart full-width. Apenas se aumentam espaçamentos que já existem.

## Riscos

- Mínimos — apenas CSS/spacing/opacity. Zero lógica alterada.
- Verificar que os números maiores não causam overflow em mobile 375px.
