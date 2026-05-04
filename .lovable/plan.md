
## Melhorias ao card "Taxa de envolvimento" (Block 1)

### Ficheiros a editar
- `src/components/report-redesign/v2/report-engagement-benchmark-chart.tsx`
- `src/components/report-redesign/v2/report-overview-engagement.tsx`

Nenhum outro ficheiro será tocado.

---

### 1. Título do chart → estilo eyebrow uppercase

O mockup mostra "COMPARAÇÃO ENTRE ESCALÕES DE SEGUIDORES" em uppercase tracking largo. Atualmente usa `font-display text-[13px]` (serif, title case). Corrigir para `text-eyebrow-sm` (Inter uppercase, consistente com os outros eyebrows do card).

### 2. Valor da coluna direita no tier ativo → mostrar valor do perfil

No mockup, o tier ativo mostra **5,43%** à direita (valor do perfil), não o benchmark do tier. Atualmente o código mostra `tier.engagementRatePct` para todas as rows. Para o tier ativo, mostrar `profileVal` em vez do benchmark — o benchmark já está visível na linha de referência e no hero.

### 3. Barras com forma pill (rounded nos dois lados)

No mockup, todas as barras têm cantos arredondados em ambos os lados (pill shape). Atualmente só têm `rounded-r-md`. Adicionar `rounded-l-md` → `rounded-md` a todas as barras (activas e inactivas). Para a barra activa com dois segmentos: segmento azul `rounded-l-md`, segmento verde `rounded-r-md`.

### 4. Legenda: ícone de dashed line para "Benchmark do tier"

No mockup, a legenda mostra um indicador visual (pequena linha dashed) junto a "Benchmark do tier". Atualmente é apenas texto. Adicionar um pequeno `span` com `border-l border-dashed` como swatch antes do texto.

### 5. Legenda: renomear "Benchmark" → "O teu escalão"

No mockup, o swatch azul+verde diz "O teu escalão", não "Benchmark". Ajustar o texto e combinar os dois swatches (azul e verde) num único item de legenda com gradiente ou dois micro-dots lado a lado.

### 6. Corrigir offset da linha de referência full-height

O wrapper da linha usa margens `ml-[calc(90px+12px+12px)]` — o `+12px` extra não alinha corretamente com a área das barras. Deve ser `ml-[calc(90px+12px)]` (gap do flex) + padding do row. Ajustar para alinhar pixel-perfect com as barras.

---

### Validação
- `bunx tsc --noEmit`
- `bunx vitest run`
- Screenshot via browser para QA visual
