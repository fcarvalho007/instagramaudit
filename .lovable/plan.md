
# Pontuação Global — números maiores e UX/UI refinada

## Problema

Os score cards actuais têm rings de 64px com números em fontSize 18–20. No ecrã móvel ficam pequenos e pouco impactantes. A UX pede números "cinematográficos" — grandes, com presença visual imediata.

## Alterações

### 1. `score-ring.tsx` — ring maior e número dominante

- Aumentar o `RADIUS` de 30 para 38 e o `STROKE_WIDTH` de 6 para 5 (anel mais fino e elegante).
- Default `size` de 64 para 88 (mobile) — o card passa a receber `size={88}`.
- `fontSize` do número sobe para 28–30 (bold 700), tornando o dígito o elemento dominante do card.
- Font-weight 700 em vez de 600.

### 2. `score-card.tsx` — layout mais respirado e hierárquico

- Padding interno sobe de `px-3 py-4` para `px-4 py-5`.
- Label sobe de `text-[13px]` para `text-sm font-semibold`.
- Subtitle sobe de `text-[11px]` para `text-xs`.
- Gap entre ring e texto aumenta ligeiramente.

### 3. `score-grid.tsx` — gap refinado

- Gap entre cards de `gap-3` para `gap-3.5` em mobile, `gap-4` em `sm:`.
- Legenda mantém-se.

## Ficheiros editados

1. `src/components/report-redesign/v2/overview/score-ring.tsx`
2. `src/components/report-redesign/v2/overview/score-card.tsx`
3. `src/components/report-redesign/v2/overview/score-grid.tsx`

## Restrições respeitadas

- Sem alterações ao backend, adapter, admin, tokens globais.
- Sem alterações a outros blocos do report.
- Cores continuam a vir de `score-utils.ts` (sem hardcode).
