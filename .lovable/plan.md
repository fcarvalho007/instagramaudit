# Plano — Redesenho SVG do gráfico "Ritmo por dia da semana"

## Causa raiz

O `WeeklyRhythmChart` actual usa um grid de `<div>` com:
- track decorativo `position: absolute` `w-full` por coluna,
- barra real `relative z-[1] w-full max-w-[42px]` empilhada por flex column,
- altura por inline-style em px.

Em algumas combinações de browser/viewport e com `color-mix(in oklab, …)` aplicado simultaneamente a track + barra + sombra, o resultado fica visualmente confuso ou quase invisível (a barra fica do mesmo tom do track, ou o conteúdo do flex empurra a barra para fora). É frágil e já levou a várias iterações sem resolver.

Solução: substituir o render por um SVG `viewBox` único, robusto, com geometria explícita por barra (`<rect>` ou `<path>` com cantos arredondados em cima), guides verticais leves, baseline e labels alinhadas. Sem libraries externas.

## Âmbito

Apenas `src/components/report-redesign/v2/overview/frequency-card.tsx`. Só a função `WeeklyRhythmChart` é reescrita. Tudo o resto fica intacto:
- `aggregateByWeekday`, `pickMostActive`, `pickQuietest`, scoring, fetches, i18n keys
- 3 KPIs (Cadência, Consistência, Pico semanal)
- Conclusão editorial abaixo do gráfico
- Subtítulo, título, qualifier "Alta"
- Outros cards (format-card etc.) e qualquer outro ficheiro

## Nova implementação (resumo)

### Container e viewBox
- Wrapper continua a ser `rounded-xl border border-border-default bg-surface-base/60 px-4 md:px-6 pt-5 pb-5` (mantém alinhamento com o resto do card).
- Header mantém o eyebrow `"RITMO POR DIA DA SEMANA"` e o chip `PICO` à direita (já elegante).
- Substituir o bloco de barras + labels por **um único SVG** com:
  - `viewBox="0 0 700 220"` (proporção fixa, escala via `width="100%" height="auto"`).
  - Áreas internas:
    - topo (24px) para os valores numéricos por barra,
    - corpo (140px) para guides + barras,
    - baseline (1px),
    - rodapé (30px) para os labels S T Q Q S S D.
  - Padding lateral interno 16px.

### Geometria das barras
- 7 colunas equidistantes, largura de barra = 32px (desktop) — calculada a partir do `viewBox` (escala automática em mobile).
- Cantos superiores arredondados (`rx=4` aplicado a `<rect>` + máscara, ou usar `<path>` com top-rounded).
- Altura por barra:
  - peak: `posts/maxPosts * 130`
  - active não-peak: `max(20, posts/maxPosts * 130)` para garantir altura mínima visível
  - zero: hairline de 3px (visível mas claramente "nada publicado")
- Cores:
  - peak: `var(--accent-primary, #3772E5)` (azul cheio)
  - active: azul suave mas sólido (sem `color-mix` frágil — usar um tom calibrado, ex.: `#A6BEF1` derivado do accent)
  - zero: cinza-azulado discreto (`#D6DEEC`)

### Guides e baseline
- 7 lanes verticais muito subtis (`<rect fill="var(--surface-muted)" opacity=".55"`) atrás de cada barra, com 36px de largura e cantos arredondados no topo — estrutura sem chamar atenção.
- 1 baseline horizontal em `y = 24+140` (`<line stroke="color-mix(in oklab, var(--accent-primary) 22%, transparent)" stroke-width="1"`).

### Valores acima das barras
- `<text>` SVG centrado na coluna da barra, `y = topo da barra - 6px`.
- Peak: 14px, weight 700, cor accent.
- Active: 12px, weight 600, cor `var(--content-primary)`.
- Zero: 11px, cor `var(--content-tertiary)`.
- `tabular-nums` via `font-variant-numeric="tabular-nums"`.

### Labels S T Q Q S S D
- `<text>` SVG na zona inferior, centrado por coluna, uppercase, `letter-spacing="0.08em"`.
- Peak: weight 700, cor accent.
- Outros: cor `var(--content-tertiary)`.

### Responsividade
- SVG escala via `width="100%" height="auto"` + `preserveAspectRatio="xMidYMid meet"`.
- Desktop renderiza ~210px de altura; mobile ~170px (proporcional ao container, sem media queries).
- Sem overflow horizontal porque o SVG ocupa 100% do wrapper.

### Acessibilidade
- `role="img"` + `aria-label` reutiliza a string actual `t("frequency.weekly_rhythm.aria_distribution")`.
- `<title>` interna no SVG opcional para tooltip nativo.

## O que NÃO muda

- `aggregateByWeekday(days)` e qualquer cálculo (continuamos a chamar dentro do componente).
- `pickMostActive`, `pickQuietest`, scoring, fetches.
- 3 KPIs (Cadência / Consistência / Pico semanal).
- Conclusão editorial e divisor acima dela.
- Título "Frequência de publicação", qualifier "Alta", subtítulo.
- i18n keys (`frequency.weekly_rhythm.title`, `peak_chip`, `aria_distribution`, `weekday_short`, `weekday_long`).
- Outros cards do report.
- Lógica de payment, unlock, premium gating, schema, scraping.

## Validação manual

Rota: `/admin/report-preview/frederico.m.carvalho?variant=pro_preview`

1. As 7 barras visíveis e sólidas.
2. Terça destacada em azul accent, mais alta.
3. Quarta (zero) aparece como hairline curto e intencional, alinhado com a baseline.
4. Valores ficam logo acima de cada barra (sem flutuar).
5. Labels S T Q Q S S D alinhados na vertical com as colunas.
6. Sem overflow horizontal em desktop nem mobile (375px / 768px / 1280px).
7. Altura do gráfico ~210px desktop, ~170px mobile.
8. KPIs e conclusão inalterados.
9. Nenhuma alteração em dados/cálculos/i18n/outros componentes.

## Output esperado

- Ficheiros alterados: `src/components/report-redesign/v2/overview/frequency-card.tsx` (apenas `WeeklyRhythmChart`).
- Causa raiz: layout div+flex+absolute-track frágil com `color-mix` empilhado a colidir com a barra.
- Nova abordagem: SVG `viewBox` com `<rect>` por barra, guides e labels também em SVG → geometria estável, escala fiável, sem dependência de stacking ou color-mix em camadas.
- Sem mudanças em dados, cálculos, geração, payment, schema ou outros cards.

Posso avançar?
