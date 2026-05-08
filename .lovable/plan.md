
## Ficheiros a alterar

1. **`src/components/report-redesign/v2/report-overview-engagement.tsx`** — card principal
2. **`src/components/report-redesign/v2/report-engagement-benchmark-chart.tsx`** — chart de tiers

Zero alterações a fórmulas, dados, benchmark, providers ou lógica de scoring.

---

## 1. Card principal (`report-overview-engagement.tsx`)

### Header — reestruturar

- Adicionar eyebrow `ENGAGEMENT` acima do título (Inter uppercase, `text-eyebrow-sm`, `text-content-secondary`)
- Título em Fraunces: `"Taxa de Engagement"` — sem status word inline
- Status pill ao lado do título: `engagementStatus` ("Alta" / "Média" / "Baixa") dentro de um `<span>` com:
  - Alta → `bg-signal-success/8 text-signal-success border border-signal-success/20`
  - Média → `bg-signal-warning/8 text-signal-warning border border-signal-warning/20`
  - Baixa → `bg-signal-danger/8 text-signal-danger border border-signal-danger/20`
  - Inter semibold, uppercase, `text-xs`, `rounded-full px-2.5 py-0.5`
- Subtítulo em Inter: texto atual mantido
- Remover o `borderBottom` inline style do status word

### KPI cards — refinar mais

- Remover `borderLeftWidth: 3` accent line dos KPI cards — usar apenas border uniforme suave
- KPI 1 (perfil): fundo neutro `bg-surface-muted/50`, border `border-border-default`
- KPI 2 (benchmark): mesmo estilo neutro
- KPI 3 (distância): manter cor condicional mas mais suave — `bg-signal-success/4` ou `bg-signal-danger/4`
- Aumentar `mb` do eyebrow label para `mb-2`
- Números já estão em `text-[1.4rem] sm:text-[2rem]` — manter
- Remover dot colorido `size-2 rounded-full` — simplificar para apenas label + número
- Aumentar `gap` do grid para `gap-4 sm:gap-5`

### Chart section

- Adicionar `mt-2` entre KPIs e chart para mais separação

### Diagnóstico

- Já usa `InsightCallout` — sem alterações

### Remover imports não usados

- `MessageCircle` e `AlertTriangle` de lucide-react não são usados — remover

---

## 2. Chart (`report-engagement-benchmark-chart.tsx`)

### Benchmark line

- Reduzir dashed border de `border-l-2` para `border-l` (1px) — mais subtil
- Benchmark label: adicionar `rounded-full` ao pill, manter tamanho

### Active row

- Manter as opacidades actuais (já suavizadas no round anterior)
- "ESTÁS AQUI" badge: reduzir para `text-[10px]` para ser mais discreto

### Inactive rows

- Sem alterações

### Sources

- Já em Inter — sem alterações

---

## Resumo visual antes/depois

| Elemento | Antes | Depois |
|----------|-------|--------|
| Header | Status word com underline inline | Eyebrow + Fraunces title + status pill |
| KPI borders | Left-accent colorido 3px | Border uniforme suave |
| KPI dots | Dot colorido antes do label | Removido — só label |
| KPI grid gap | `gap-3 sm:gap-4` | `gap-4 sm:gap-5` |
| Benchmark line | 2px dashed | 1px dashed |
| "ESTÁS AQUI" | `text-xs` | `text-[10px]` mais discreto |
| Unused imports | MessageCircle, AlertTriangle | Removidos |

## Riscos

- Mínimos — apenas CSS, layout e cleanup de imports
- Nenhuma alteração a lógica, dados ou providers
