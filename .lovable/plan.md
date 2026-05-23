## Objetivo

Recuperar o visual premium do Block 1 (anel 0–100) sem voltar à duplicação que motivou o refactor anterior. Em vez dos 3 mini-scores (Envolvimento / Frequência / Interação) — que repetem cards seguintes — repõe-se **um único anel global 0–100**, posicionado ao lado da observação editorial.

## Alteração

Ficheiro único: `src/components/report-redesign/v2/overview/editorial-identity-card.tsx`

### Layout

- Desktop (`sm:` ≥ 640px): grid 2 colunas → texto (esquerda, flex-1) + anel (direita, ~140px, alinhado ao topo do título).
- Mobile (375px): anel empilha ABAIXO do texto, centrado, tamanho ~120px. Mantém legibilidade e ordem narrativa (texto primeiro).
- Card mantém `rounded-2xl border border-border-default bg-white shadow-card`, padding atual.

### Anel 0–100

- SVG inline (sem dependências novas).
- Score global = média arredondada de `scores.envolvimento.value`, `scores.frequencia.value`, `scores.interaccao.value`.
- Track: `stroke-border-default` ~6px; progresso: `stroke-accent-primary` (azul #3772E5) com `stroke-linecap="round"`.
- Centro: número grande Inter SemiBold tabular-nums (text-3xl sm:text-4xl) + label "PONTUAÇÃO" em eyebrow-sm por baixo.
- Cor do progresso varia por banda (mantém calma, sem alarme):
  - ≥ 70 → `accent-primary` (azul)
  - 40–69 → `accent-primary` com opacidade ~0.7
  - < 40 → `signal-warning` (âmbar subtil)
- `aria-label="Pontuação global {n} de 100"`.

### Sem alterações em

- Lógica de `deriveCopyFromAi`, fallback, chip de benchmark, sanitização.
- `report-overview-block.tsx`, snapshot, pipeline IA, outros cards.
- Tokens (`src/styles/tokens.css`, `tokens-light.css`).

### Comportamento

- Anel é sempre renderizado (não depende de IA).
- Texto + chip continuam a respeitar a regra ≤ 5 palavras / 2–3 frases.
- Mobile-first verificado a 375px (texto em cima, anel centrado abaixo, sem overflow).

## Validação

- `bunx tsc --noEmit`
- `bunx vitest run`
- Manual em `/analyze/frederico.m.carvalho`:
  - Anel visível com número 0–100 legível
  - Observação editorial intacta
  - Chip de benchmark intacto
  - Mobile 375px: ordem texto → anel, sem clipping
  - Desktop 1460px: anel à direita, alinhado ao topo

## Checkpoint

- ☐ Editar `editorial-identity-card.tsx` (layout 2 colunas + SVG ring)
- ☐ Calcular score global como média dos 3 sub-scores
- ☐ Verificar mobile 375px e desktop
- ☐ `bunx tsc --noEmit` + `bunx vitest run` verdes
