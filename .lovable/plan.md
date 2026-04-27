## Objectivo

Elevar a camada visual das 3 tabs do `/admin` (Visão Geral, Receita, Clientes) para um nível cinematográfico/editorial, mantendo a lógica e a arquitectura intactas. **Sem novas funcionalidades** — só polimento.

---

## 1. Tokens de design (`src/styles/admin-tokens.css`)

Acrescentar à camada `:root` e ao `@theme inline`:

- **Backgrounds**: `--admin-bg-canvas` `#FAF9F5`, `--admin-bg-surface` `#FFFFFF`, `--admin-bg-elevated` `#FFFFFF`, `--admin-bg-subtle` `#F5F4EE`.
- **Bordas**: `--admin-border-soft` `#E8E5DA`, `--admin-border-strong` `#D3D1C7`, `--admin-border-subtle` `#F1EFE8`. Aliases existentes (`--color-admin-border`, `--color-admin-border-strong`) passam a apontar para `soft`/`strong`.
- **Tipografia (custom properties)**: `--admin-text-h1: 36px`, `h2: 20px`, `h3: 16px`, `body: 13px`, `small: 12px`, `eyebrow: 10px`, `kpi-hero: 56px`, `kpi-large: 36px`, `kpi-medium: 28px`.
- **Sombra**: `--admin-shadow-card: 0 1px 2px rgba(0,0,0,0.02), 0 0 0 1px rgba(0,0,0,0.01)`.

Actualizar `.admin-v2`:
- `background-color: var(--admin-bg-canvas)`.
- `font-feature-settings: "ss01", "cv11", "tnum"` (números tabulares globais).

Actualizar `.admin-eyebrow`:
- 10px, weight 500, `letter-spacing: 0.12em`, cor `--admin-neutral-600`.

Aplicar `padding: 40px 32px` ao container principal e `gap: 56px` entre secções (em `admin.tsx` + cada tab).

---

## 2. Primitivos partilhados — refinamento

### `AdminPageHeader`
- H1 → 36px / weight 500 / `letter-spacing: -0.02em`.
- Margem inferior: 40px; `padding-bottom: 28px`; divisora `1px solid var(--color-admin-border)` (linha sólida, sem gradiente).
- Subtítulo: 14px `--admin-text-secondary`.

### `AdminSectionHeader`
- Barra vertical: **4×22px** com radius 2px.
- H2: **20px / weight 500 / sentence case** + `letter-spacing: -0.01em` (deixa de ser uppercase).
- Nova prop opcional `info?: string` — renderiza `<AdminInfoTooltip>` à direita do H2.
- Subtítulo após `·` em 13px tertiary.

### `AdminTabsNav`
- `gap: 28px` entre tabs, `padding: 12px 0`.
- Sublinhado activo: 2px `--admin-text-primary` (já é neutral).
- `border-bottom: 1px solid var(--color-admin-border)`; margem inferior 28px.

### `AdminCard`
- Nova API:
  ```ts
  variant?: 'default' | 'hero' | 'subtle' | 'accent-left'
  padding?: 'compact' | 'default' | 'loose' | 'flush'
  ```
- `default`: bg branco, `border: 1px solid var(--color-admin-border)`, `border-radius: 14px`, `box-shadow: var(--admin-shadow-card)`.
- `hero`: gradient `linear-gradient(135deg, #ECF7F1 0%, #F0F4E5 100%)`, border `1px solid #5DCAA5`.
- `subtle`: bg `--admin-bg-subtle`, sem border.
- `accent-left`: mantém-se (compat).
- Padding: `compact 20px 24px`, `default 28px 32px`, `loose 40px 48px`, `flush 0`.
- Manter `accent-left` para retrocompatibilidade. Variant antiga `flush` mapeia para `padding: 'flush'`.

### `AdminStat` + `KPICard`
- Nova prop `size`: `'sm' | 'md' | 'lg' | 'hero'`.
  - `hero` → 56px, `-0.04em`, padding cartão `28px 32px`.
  - `lg` → 36px, `-0.03em`, padding `24px 28px`.
  - `md` → 28px, `-0.02em`, padding `20px 24px`.
  - `sm` → 22px, `-0.01em`, padding `16px 20px`.
- Todos os valores: `font-family: 'JetBrains Mono'`, `font-feature-settings: 'tnum'`, weight 500.
- Nova prop `info?: string` no `KPICard` → tooltip "i" ao lado do eyebrow.
- **Delta como pill** (substituir setas inline):
  - Up: bg `rgba(15,110,86,0.10)`, color `#0F6E56`, `▲ +x`, mono 12px, `padding 3px 10px`, radius 12px, weight 500.
  - Down: bg `rgba(163,45,45,0.08)`, color `#A32D2D`, `▼ −x`.

### `AdminBadge`
- Texto 11px → 12px mono opcional; manter API. Apenas garantir que não conflita com novo delta-pill.

### `ProgressBar`
- Altura passa para 8px (já é `h-2`); confirmar.
- Cor de fundo via `--admin-border-subtle` para harmonia.

### Novo: `AdminInfoTooltip`
- Ficheiro: `src/components/admin/v2/admin-info-tooltip.tsx`.
- Wrap sobre `@/components/ui/tooltip` (Radix já instalado).
- Gatilho: `<button>` 16×16, border `1px solid var(--color-admin-border-strong)`, `border-radius: 50%`, letra `i` Georgia italic 10px weight 500, cor tertiary, `cursor: help`, hover → border + texto `--admin-text-primary`.
- Conteúdo: bg `#1F1E1B`, color `#FAF9F5`, Inter 11px, `padding 10px 14px`, radius 8px, `max-width: 240px`, `line-height: 1.45`, shadow `0 4px 12px rgba(0,0,0,0.15)`, seta 4px.
- Props: `text: string`, `side?: 'top'|'right'|'bottom'|'left'` (default `top`), `delayDuration: 200`.

---

## 3. Refinamentos por tab

### Visão Geral

- **`FunnelSection`**: refazer em 2 colunas grid `1.2fr 1fr`, gap 48px.
  - Esquerda: SVG `viewBox="0 0 400 280"` com 3 trapézios (`#EEEDFE`, `#AFA9EC`, `#534AB7`) e `<text>` mono 22px com 1.847 / 312 / 125 (este último branco).
  - Direita: 3 stages com marker vertical 6×36 da família roxa, label primary 13px + valor mono 28px, badge conversão `↓ 16.9%` em pill cinza claro mono 12px (excepto 1ª).
- **Cartão linha-resumo** (Conversão total / Receita por lead / Valor médio cliente): `border-right: 1px var(--color-admin-border)` entre células, padding `0 24px`, valores 28px mono `-0.02em`, eyebrow + tooltip "i".
- **`RevenueSection`**: 1º cartão (MRR) passa a `KPICard size="hero" variant="hero"` com €684, delta pill +€72 (12%), sub "38 subscritores activos · ARPU €18". Outros 2 KPIs em `size="lg"`.
- **`ExpenseSection`**: 3 colunas separadas por `border-right` em vez de gap, valores 36px mono, padding `0 28px` por coluna, label "CAP" mono 8px `letter-spacing 0.1em` acima da linha vermelha.

### Receita

- **`MetricsSection`**: 1ª linha — MRR `size="hero" variant="hero"`, ARR/ARPU/Churn em `size="lg"` com `info` tooltips. 2ª linha mantém `size="sm"`.
- **`WaterfallSection`**: altura 240px, negativo passa para `#E24B4A`, eixo Y JetBrains Mono 10px, tooltip dark.
- **`CohortSection`**: `border-collapse: separate; border-spacing: 4px`, células com radius 6px, padding `8px 6px`, header mono 10px tracking, % em mono.
- **`InvoicesSection`**: `padding: 14px 0` por linha, hover `bg-admin-bg-subtle`, valores em mono medium.

### Clientes

- **`PipelineSection`**: cartões padding `18px 20px`, valores mono 28px `-0.02em`. Setas SVG 24×16. Quantidade entre conectores em pill verde `bg rgba(29,158,117,0.1) color #0F6E56`, mono 11px, `padding 2px 8px`, radius 10px.
- **`CustomersTableSection`**: `padding: 14px 0` por linha, hover `bg-admin-bg-subtle`, LTV mono 13px medium.
- **`CustomerCardSection`**: avatar 64px, h3 nome 22px weight 500, 4 KPIs internos com `KPICard size="md"`. Health bars 16×5 gap 3. Timeline pontos 13×13. Notas padding `14px 16px`.

---

## 4. Recharts — tooltips e eixos cinematográficos

Helper partilhado novo: `src/components/admin/v2/charts/chart-tooltip.tsx` exportando `<DarkTooltip>` configurado:
- `contentStyle`: bg `#1F1E1B`, color `#FAF9F5`, border `none`, radius 8px, padding `10px 14px`, shadow `0 4px 12px rgba(0,0,0,0.15)`, font Inter 11px.
- `labelStyle`: cor `#888780` mono 10px tracking.
- `itemStyle`: cor `#FAF9F5` mono 12px.

Em todos os Recharts (`RevenueSection`, `ExpenseSection`, `WaterfallSection`):
- Substituir `<Tooltip>` por `<Tooltip {...DarkTooltip} />`.
- `<XAxis tick={{ fontSize: 10, fontFamily: 'JetBrains Mono', fill: '#888780' }} stroke="#E8E5DA" />`.
- `<YAxis tick={...same} axisLine={false} tickLine={false} />`.
- `<CartesianGrid stroke="#F1EFE8" vertical={false} />`.
- `<Bar radius={3} ... />`.
- Custos: `<ReferenceLine stroke="#A32D2D" strokeDasharray="3 3" label={{ value: 'CAP', position: 'right', fill: '#A32D2D', fontSize: 8, fontFamily: 'JetBrains Mono', letterSpacing: '0.1em' }} />`.

---

## 5. Tooltips a aplicar (texto exacto)

Aplicar em cada secção/KPI nas 3 tabs conforme tabela do prompt (Funil / Conversão total / Receita por lead / Valor médio cliente / MRR / Receita total / Avulso / Apify / OpenAI / Despesa total / Kanban / Sinais de intenção / Métricas principais / ARR / ARPU / Churn / LTV / Mix subscrição / Anatomia do MRR / MRR por plano / Concentração / Cohort de retenção / Últimas faturas / Pipeline / Lista de clientes / Ficha do cliente). Usar exactamente o texto fornecido em pt-PT.

---

## 6. Layout global

Em `src/routes/admin.tsx`:
- `padding: '40px 32px'`.
- `max-width: 1280` (mantém).

Em cada tab (`admin.visao-geral.tsx`, `admin.receita.tsx`, `admin.clientes.tsx`):
- Substituir `gap-7` por `gap-14` (56px) entre secções.

---

## 7. Detalhes técnicos

- **Tooltip**: usar `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider` de `@/components/ui/tooltip`. Wrappar `__root.tsx`/admin layout num `<TooltipProvider delayDuration={200}>` se ainda não existir, para evitar provider em cada uso.
- **Mono tabular**: aplicar `font-feature-settings: 'tnum'` via classe utility `.admin-num` definida em `admin-tokens.css` para reaproveitar.
- **Compatibilidade**: `KPICard` mantém props existentes (`variant`, `accent`); novas props `size="hero"` e `info` são aditivas.
- **Build hygiene**: `bunx tsc --noEmit` + `bun run build` no fim.

---

## 8. Ficheiros afectados

**Editados:**
- `src/styles/admin-tokens.css`
- `src/components/admin/v2/admin-page-header.tsx`
- `src/components/admin/v2/admin-section-header.tsx`
- `src/components/admin/v2/admin-tabs-nav.tsx`
- `src/components/admin/v2/admin-card.tsx`
- `src/components/admin/v2/admin-stat.tsx`
- `src/components/admin/v2/kpi-card.tsx`
- `src/components/admin/v2/admin-badge.tsx`
- `src/components/admin/v2/progress-bar.tsx`
- `src/routes/admin.tsx` + 3 routes das tabs (gap-14)
- Todas as secções `visao-geral/*`, `receita/*`, `clientes/*` (tipografia + tooltips + Recharts darks)

**Novos:**
- `src/components/admin/v2/admin-info-tooltip.tsx`
- `src/components/admin/v2/charts/chart-tooltip.tsx`

**Intocados:**
- `src/integrations/supabase/*` (locked)
- `src/components/admin/cockpit/*` (legado)
- `/report.example`, `/report/example`
- `mock-data.ts` (estrutura)
- Stubs das tabs Relatórios/Perfis/Sistema

---

## Checklist de aceitação

- ☐ Tokens novos disponíveis (`--admin-bg-*`, `--admin-border-*`, `--admin-text-*`, `--admin-shadow-card`)
- ☐ Background do admin passa a `#FAF9F5`
- ☐ H1 36px, H2 20px sentence case, eyebrows 10px mono
- ☐ Todos os KPIs em JetBrains Mono com `tnum` + letter-spacing negativo
- ☐ `KPICard size="hero"` funcional + MRR é hero na Visão Geral E Receita
- ☐ `AdminInfoTooltip` (Radix) com letra "i" Georgia italic, tooltip dark
- ☐ Tooltips aplicados em todas as secções e KPIs (texto exacto pt-PT)
- ☐ Funil refeito em 2 colunas (SVG + lista)
- ☐ Despesa em 3 colunas com bordas verticais e label "CAP" mono 8px
- ☐ Recharts dark tooltips + eixos mono + grid subtil + bars radius 3
- ☐ Pipeline cartões 18×20 + quantidades em pill verde
- ☐ Health score 5 barras 16×5
- ☐ Spacing entre secções 56px nas 3 tabs
- ☐ `bunx tsc --noEmit` ✓ + `bun run build` ✓
- ☐ Cockpit legado e `/report.example` intactos
