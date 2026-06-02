## Alvo
Refinar apenas visual de:
- `src/components/report-redesign/v2/overview/frequency-card.tsx`
- `src/components/report-redesign/v2/overview/format-card.tsx`

Sem alterar dados, scoring, gating premium, tooltips, thumbnails source, backend ou rotas.

## Mudanças no `frequency-card.tsx`

**Header**
- Título `text-[1.25rem] sm:text-[1.5rem] md:text-[2rem]` → `text-[1.125rem] sm:text-[1.25rem] md:text-[1.5rem]` (mais editorial, menos pesado).
- Padding-top `md:pt-8` → `md:pt-6`.
- `space-y-2.5` → `space-y-2`.
- Subtítulo `text-[15px]` → `text-[14px]`.

**Calendário (a maior queixa)**
- Wrapper ganha `max-w-[420px]` para deixar de ocupar toda a largura do card em desktop.
- Cell aspect `aspect-[5/3]` → `aspect-square` (cells mais pequenas e quadradas, footprint vertical reduzido).
- Cell radius `rounded-md` → `rounded-[5px]`.
- Gap entre cells `gap-1 md:gap-1.5` → `gap-1` uniforme.
- Weekday headers `text-xs` → `text-[11px]`, cor `content-secondary` → `content-tertiary`.
- Contador dentro da cell `text-xs` → `text-[10px]`.
- Margens internas: bloco do calendário `mt-3` → `mt-2.5`; secção `sm:mt-6` → `sm:mt-5`.

**Legenda**
- Quadrados `size-[10px]` → `size-[9px]`, radius `rounded-[3px]` → `rounded-[2px]`.
- Gap entre items `gap-4 md:gap-5` → `gap-3 md:gap-4`.
- Margem topo `mt-3 md:mt-3.5` → `mt-2.5`.

**Verdict**
- `mb-5 sm:mb-6 md:mb-8` → `mt-5 mb-5 sm:mb-6` (reduz altura inferior).

## Mudanças no `format-card.tsx`

**Header**
- Título mesma redução de escala que o de Frequência.
- `space-y-2.5` → `space-y-2`.
- `pt-6 md:pt-8` → `pt-5 md:pt-6`.
- Subtítulo `text-[15px]` → `text-[14px]`.

**Galeria de thumbnails (a maior queixa)**
- Wrapper passa a ter `max-w-[520px]` para a galeria não dominar o card.
- Grid colunas: hoje `Math.min(sortedPosts.length, 4)` (4 colunas grandes). Passa a fixo: `grid-cols-6 sm:grid-cols-8 md:grid-cols-8` — thumbs muito mais pequenos, normalmente 2 linhas para 12–16 posts.
- Aspect `3/4` → `1/1` (quadrado, mais compacto e analítico).
- Gap `gap-2` → `gap-1.5`.
- Dot indicator `size-2` → `size-1.5`, ring `ring-1` mantém.
- Margem topo da secção `mt-6` → `mt-5`.
- Eyebrow "X posts analisados": cor mantida, `mb-1.5` → `mb-2`.

**Donut + breakdown**
- Donut size 88 → 76, stroke 11 → 9 (mais compacto, mantém leitura).
- Número central `text-[1.5rem]` → `text-[1.25rem]`.
- Container `gap-5 md:gap-6` → `gap-4 md:gap-5`; padding `py-3.5` → `py-3`.
- Legenda lateral `text-[15px]` → `text-[14px]`.

**Verdict**
- `mb-6 md:mb-8` → `mb-5 sm:mb-6`.

## O que NÃO muda
- Toda a lógica de cálculo (`computeFrequencia`, `getFrequencyHeadlineKey`, `buildWeekGrid`, `cellStyle`, `legendBg`, `getFormatHeadline`, `computeExternalReading`, `buildSubtitleLineT`).
- Dados, props, traduções, ordem dos blocos.
- Tooltips, ARIA labels, premium gating, ExternalReferenceTable / ExternalSourceNote / ExternalReferenceNote.
- `report-overview-block.tsx` (stack vertical já feito antes — fica intacto).
- Comportamento mobile: continua responsivo; thumbs em 6 cols mobile + 8 cols ≥sm; calendário mantém-se 7 cols.

## Validação
- `bunx tsc --noEmit`.
- Visual QA no `id-preview` (1440, 1280, 768, 390) — comparar título, altura do calendário, dimensão das thumbs, altura total dos cards.
- Confirmar que o resto do report (`/analyze/$username`) não regrediu (só Block 1 é tocado).

## Risco
Baixo: apenas classes Tailwind e dois valores de `size`/`stroke` no SVG do donut. Zero alteração de lógica ou contrato de props.
