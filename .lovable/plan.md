
## Ficheiro

`src/components/report-redesign/v2/report-engagement-benchmark-chart.tsx` — único ficheiro a alterar.

Zero alterações a dados, fórmulas ou providers.

---

## Alterações

### 1. Espaçamento geral
- Container gap: `gap-3` → `gap-5`
- Tier rows gap: `gap-2` → `gap-2.5`

### 2. Barras — mais espessas e arredondadas
- Inactive bars: `h-6 sm:h-7` → `h-7 sm:h-8`, `rounded-md` → `rounded-lg`
- Active profile bar: `rounded-md` → `rounded-lg`, inset reduzido de `top:20% bottom:20%` → `top:15% bottom:15%`
- Active base track: `h-8 sm:h-9` → `h-9 sm:h-10`, `rounded-md` → `rounded-lg`
- Inactive bar fill: `bg-content-secondary/8` → `bg-content-secondary/6` (mais suave)
- Active base track: `bg-content-secondary/5` → `bg-content-secondary/4`

### 3. Active row — mais espaçoso, menos alerta
- Padding: `px-2 py-3 sm:px-3 sm:py-4` → `px-3 py-4 sm:px-4 sm:py-5`
- Border: `1.5px` → `1px`, opacidade de 0.25 → 0.18
- Background: opacidade de 0.03 → 0.02
- Remove hatched zone (repeating-linear-gradient) — substituir por barra sólida muito leve como referência: `opacity 0.06`, `rounded-lg`
- Profile bar opacity: 0.75 → 0.65 (mais calmo)
- "ESTÁS AQUI" badge: mover para `← ESTÁS AQUI` ao lado do label do tier em vez de badge flutuante no topo — remover posicionamento absoluto, colocar inline após sub-label

### 4. Profile value label
- Em vez de floating pill acima da barra, colocar o valor dentro da barra (centrado verticalmente, alinhado à direita do preenchimento) quando a barra é larga o suficiente, ou à direita quando estreita
- `font-bold` → `font-semibold`, manter `tabular-nums`

### 5. Benchmark line e pill
- Dashed line: `border-content-secondary/30` → `border-content-secondary/20` (mais subtil)
- Pill: adicionar `border border-border-default/30` para mais definição

### 6. Inactive rows — mais espaçosos
- Padding: `px-2 py-2 sm:px-3 sm:py-2.5` → `px-3 py-2.5 sm:px-4 sm:py-3`

### 7. Right-side percentages
- Aumentar min-width: `min-w-[52px] sm:min-w-[56px]` → `min-w-[56px] sm:min-w-[60px]`
- Font: `text-[13px]` → `text-[13px] sm:text-[14px]`

### 8. X-axis
- Sem alterações (já subtil)

### 9. Sources
- Sem alterações

---

## Riscos

Mínimos — apenas CSS/layout. A remoção do hatch pattern simplifica bastante o visual.
