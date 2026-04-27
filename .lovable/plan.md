
# Tab Receita — Plano de implementação

Substituir o stub em `/admin/receita` pela tab completa com 5 secções verticais, reutilizando integralmente o sistema de design da Visão Geral (`AdminPageHeader`, `AdminSectionHeader`, `AdminCard`, `AdminStat`, `KPICard`, `AdminBadge`, tokens).

## Decisões de stack

- **Gráfico waterfall**: usar **Recharts** (não Chart.js). O projecto já o tem instalado, a Visão Geral usa-o, e Recharts suporta o "truque de offsets" via `<Bar dataKey="base" stackId>` invisível + `<Bar dataKey="delta">` colorido — equivalente funcional aos `[start, end]` do Chart.js, com o mesmo resultado visual.
- **Cohort heatmap**: tabela HTML semântica (`<table>`) com células coloridas via 5-step verde — mais acessível e mais leve que um chart.
- **Período + Exportar CSV**: estado local sem lógica real (mock interactivity); botão CSV com `console.log` placeholder.

## Estrutura visual

```text
AdminPageHeader (título "Receita" + select período + botão CSV)
└─ flex gap-7
   ├─ MetricsSection        (verde · 2×4 KPICards)
   ├─ WaterfallSection      (roxo · gráfico + 5 colunas explicação)
   ├─ PlansSection          (verde · 2-col: distribuição + concentração)
   ├─ CohortSection         (roxo · tabela heatmap 6×8)
   └─ InvoicesSection       (verde · tabela 6 linhas)
```

## Ficheiros a criar

- `src/components/admin/v2/receita/metrics-section.tsx` — 2 linhas de KPIs.
- `src/components/admin/v2/receita/waterfall-section.tsx` — gráfico Recharts + grelha 5-col.
- `src/components/admin/v2/receita/plans-section.tsx` — distribuição + concentração.
- `src/components/admin/v2/receita/cohort-section.tsx` — tabela heatmap.
- `src/components/admin/v2/receita/invoices-section.tsx` — tabela faturas.
- `src/components/admin/v2/period-select.tsx` — select estilizado para o header.

## Ficheiros a editar

- `src/routes/admin.receita.tsx` — substituir stub pela composição das 5 secções.
- `src/components/admin/v2/kpi-card.tsx` — adicionar `size="sm"` (valor 22px em vez de 26px) e suportar `valueSuffix` inline (para "1 cancel." em vermelho ao lado do "2.6%" do churn).
- `src/lib/admin/mock-data.ts` — adicionar 6 datasets novos.

## Detalhes por secção

### 1. Métricas principais (verde)

- **Linha 1** (4 KPICards `size="md"`): MRR (variant `hero`, gradient esmeralda) · ARR projectado · ARPU · Churn mensal (com suffix vermelho "1 cancel.").
- **Linha 2** (4 KPICards `size="sm"`): LTV · Receita avulsa · Receita total (delta verde) · Mix subscrição.
- Grid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`, gap 12px entre KPICards e 12px entre as duas linhas.

### 2. Anatomia do MRR (roxo)

- `AdminCard` com gráfico waterfall Recharts, height 220px.
- 6 barras: MRR inicial (cinza), + Novo (verde), + Expansão (verde), − Contracção (vermelho), − Churn (vermelho), MRR final (cinza).
- Implementação: cada item tem `{ base, delta, label, color }`. Render: `<Bar dataKey="base" stackId="w" fill="transparent" />` + `<Bar dataKey="delta" stackId="w" fill={color} radius={3} />`.
- Tooltip custom: "+ Novo: +€126" / "− Churn: −€54".
- Eixo Y: `[0, 800]`, formatter `€X`. Grid horizontal subtil, X sem grid.
- Por baixo: grelha 5 colunas com hairlines de 1px (mesmo padrão dos `totals` do funil — `grid-cols-5 gap-px bg-admin-border` + cells `bg-admin-surface p-3`).

### 3. MRR por plano (verde)

- Grid `lg:grid-cols-[1.4fr_1fr]` gap 14px.
- **Esquerdo (Distribuição)**: 3 linhas plano com nome + preço, valor + subs/% à direita, e barra horizontal (8px, fundo `accent/12%`, fill sólido) — reutiliza `ProgressBar`. Separador 1px no fim. Rodapé flex com Total MRR + Subscritores.
- **Direito (Concentração)**: 3 linhas com quadrado 38×38 (cores `revenue-900` / `revenue-500` / `revenue-alt-400` mapeadas), bloco texto, percentagem direita 14px/500.

### 4. Cohort de retenção (roxo)

- `AdminCard` com `<table>` semântica.
- Helper `retentionStyle(pct)` → 5-step verde (`revenue-900` → `revenue-700` → `revenue-500` → `revenue-400` → `revenue-100`), texto branco ou `revenue-900`.
- Células `<td>` com `<span>` interno colorido, padding 6px 4px, radius 4px, centrado.
- Meses futuros: `—` em `text-admin-text-tertiary`.
- Rodapé: copy à esquerda (11px secondary) + legenda escala à direita (5 quadradinhos 16×8px + "0%"/"100%" 10px tertiary).

### 5. Últimas faturas (verde)

- `<table>` semântica com 6 colunas. `<th>` em eyebrow style. `<tr>` com `border-top: 1px solid border-admin-border`, padding vertical 10px.
- "Tipo": `AdminBadge variant="revenue"` (subscrição) ou `variant="expense"` (avulso).
- "Estado": `AdminBadge variant="revenue"` (paga) ou `variant="danger"` (falhou).
- "Valor": alinhado direita, `font-mono font-medium`.

## Mock data novo

```ts
export const MOCK_MRR_METRICS = {
  mrr: { value: "€684", delta: "+€72", deltaDir: "up", sub: "vs €612 mês anterior" },
  arr: { value: "€8.208", sub: "MRR × 12" },
  arpu: { value: "€18.00", sub: "€684 ÷ 38 subscritores" },
  churn: { value: "2.6%", suffix: "1 cancel.", sub: "retenção 97.4%" },
  ltv: { value: "€692", sub: "ARPU ÷ churn" },
  oneOff: { value: "€2.163", sub: "87 reports · ticket €24.86" },
  total: { value: "€2.847", sub: "+18% vs mês anterior", subAccent: "revenue" },
  mix: { value: "24%", sub: "€684 de €2.847 · sub vs total" },
};

export const MOCK_MRR_WATERFALL = [
  { label: "MRR inicial",  type: "total",    value: 612 },
  { label: "+ Novo",       type: "positive", value: 126 },
  { label: "+ Expansão",   type: "positive", value:  18 },
  { label: "− Contracção", type: "negative", value: -18 },
  { label: "− Churn",      type: "negative", value: -54 },
  { label: "MRR final",    type: "total",    value: 684 },
];

export const MOCK_PLAN_DISTRIBUTION = [
  { name: "Starter", price: "€9/mês",  subs: 9,  mrr: 81,  pct: 12, color: "revenue-alt" },
  { name: "Pro",     price: "€18/mês", subs: 23, mrr: 414, pct: 60, color: "revenue" },
  { name: "Agency",  price: "€49/mês", subs: 6,  mrr: 294, pct: 43, color: "revenue" }, // tom 800
];

export const MOCK_CONCENTRATION = [/* Top 10% / Top 25% / Bottom 50% */];
export const MOCK_COHORTS = [/* 6 cohorts × array de % ou null */];
export const MOCK_INVOICES = [/* 6 faturas */];
```

## Critérios de aceitação

- Tab Receita acessível em `/admin/receita` substitui o stub.
- 5 secções na ordem: métricas → waterfall → planos → cohort → faturas.
- Reutiliza `AdminPageHeader`, `AdminSectionHeader`, `AdminCard`, `AdminStat`, `KPICard`, `AdminBadge`, `ProgressBar`, tokens `admin-tokens.css`.
- `KPICard` ganha `size="sm"` (22px) e `suffix` inline.
- Waterfall com Recharts usando barras empilhadas (base transparente + delta colorido) — equivalente ao `[start, end]` do Chart.js.
- Cohort heatmap com escala 5-step verde e `—` para meses futuros.
- Header com select de período (3 opções) e botão "Exportar CSV" — visualmente completos, acção mock.
- Tooltips em todos os gráficos. Tipografia/cores/espaçamentos conformes ao sistema.
- Build limpo (`tsc --noEmit` + `bun run build`) sem warnings novos.
