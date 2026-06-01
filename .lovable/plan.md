## Objetivo

Refinar o bloco `PostComparisonBlock` (`src/components/report-redesign/v2/report-post-comparison.tsx`) seguindo o mockup. Só alteração visual e de interação — sem mexer em dados, sampling, ou backend.

## Mudanças

### 1. Scatter — eliminar repetição do número

Remover as `ScatterPill` azul/laranja com `0,15%` e `0,04%`. No lugar:

- Melhor → marcador `★` discreto acima do ponto, com label `melhor` em accent-primary
- Pior → marcador `▾` discreto abaixo do ponto, com label `pior` em signal-warning
- Manter aura + dot coloridos
- Sem nunca mostrar o número diretamente no scatter (fica só no hero e no tooltip)

### 2. Hover/tap funcional em todos os pontos

Implementar tooltip via estado React (hover desktop + tap mobile):

- Adicionar `<rect>` invisível por ponto (r≈12, `cursor-pointer`) para hit-target generoso
- `onMouseEnter` / `onFocus` / `onClick` → set `hoveredId`
- `onMouseLeave` / `onBlur` → clear (no desktop); no mobile mantém até tap fora ou noutro ponto
- Tooltip flutuante (div HTML posicionado por `foreignObject` ou overlay absoluto sobre o SVG, usando coordenadas convertidas) com:
  - **Pontos extremos (best/worst)**: data, formato (chip), `engagementPct` formatado, delta vs média, excerto da legenda (≤80 chars), gostos + comentários
  - **Pontos bloqueados (cinzentos)**: apenas `🔒 publicação bloqueada · desbloqueia no premium` (sem valor real, sem blur de número — evita extração via DOM)
- Tooltip auto-flip horizontal/vertical quando perto das bordas
- Acessibilidade: `tabIndex={0}` em cada hit-target + `aria-describedby`

Para isto, o `ConstellationScatter` passa a precisar dos posts completos (legenda, likes, comments) só para os 2 extremos. Os pontos bloqueados ficam apenas com tooltip genérico, por isso continuam a usar `ScatterPost` minimal.

### 3. Cartões — remover redundância do número grande

No `DetailedPostCard`:

- **Remover** o `<span>` com `0,15%` grande (linhas 731–735)
- Manter **apenas** o chip de contexto (`+68% vs média` / `−55% vs média`) — promovido para cima como elemento principal da linha de métrica
- A imagem real (`thumbUrl`) já está implementada — manter, com badge de formato sobreposto (já existe)
- Reordenar: chip delta no topo do bloco direito, depois caption, depois likes/comments

### 4. Copy (i18n)

Atualizar `src/i18n/locales/pt/report.json` e `en/report.json`:

- `posts.scatter.best_marker`: `"melhor"`
- `posts.scatter.worst_marker`: `"pior"`
- `posts.scatter.locked_tooltip`: `"🔒 Publicação bloqueada · desbloqueia no premium"`
- Remover (ou deixar não-usadas) `posts.scatter.best_pill` / `worst_pill`
- Novas keys do tooltip:
  - `posts.tooltip.delta`: `"{{sign}}{{value}}% vs média"`
  - `posts.tooltip.engagement`: `"{{value}}% envolvimento"`

### 5. Mobile

Comportamento tap-to-reveal (decisão recomendada pelo user): mesmo tooltip em mobile. Implementado naturalmente porque o handler é `onClick`, não só `onMouseEnter`. Tap fora do ponto fecha.

## Ficheiros alterados

- `src/components/report-redesign/v2/report-post-comparison.tsx` — refactor do `ConstellationScatter` (markers + tooltip state + hit-targets) e do `DetailedPostCard` (remover número grande)
- `src/i18n/locales/pt/report.json` — novas keys
- `src/i18n/locales/en/report.json` — espelhar

## Não tocado

- `snapshot-to-report-data.ts`, `block01-sample.ts`, scoring, sampling
- Pipeline de thumbnails (`persist-thumbnails.server.ts`)
- `ComparativeHero` (hero mantém os números grandes — fonte única do valor)
- `PremiumReveal`, `AiReading`

## Validação

- `bunx tsc --noEmit`
- Inspeção visual no preview (desktop + 375px) — confirmar que:
  - Hero é o único sítio com `0,15%` / `0,04%`
  - Scatter mostra só ★ melhor / ▾ pior sem número
  - Hover/tap funciona em todos os pontos com tooltips corretos
  - Cartões mostram só o chip delta, sem o número grande
  - Pontos bloqueados não revelam valor real

## Checkpoint

- ☐ Scatter sem pills com número
- ☐ Marcadores ★ / ▾ visíveis e legíveis
- ☐ Tooltip extremos com 6 campos (data, formato, %, delta, caption, likes+comments)
- ☐ Tooltip bloqueados vago, sem valor
- ☐ Tap-to-reveal funciona em mobile
- ☐ Cartões sem número grande, chip delta como métrica principal
- ☐ `bunx tsc --noEmit` passa
