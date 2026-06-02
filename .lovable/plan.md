
## Objetivo

Transformar o hero do `/analyze/$username` num cabeçalho compacto, em barra única, fiel ao mockup enviado. O formato atual (hero grande com avatar 28, prisma decorativo e stack de ações) deixa de ser o estado inicial — passa a ser opcionalmente acessível através de um botão de expandir. Remover por completo o CTA "Novo relatório".

## Mockup de referência

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ [FC●] @frederico.m.carvalho  ⌜Micro · 10K–50K⌝                              │
│       10,1K seg · 2,6K pub · 12 analisadas  ⌄        [⬇] [⤴]   │ PERÍODO  ⋯│
└──────────────────────────────────────────────────────────────────────────────┘
```

- Avatar pequeno (≈40px) com badge verificado mini.
- Handle em peso forte, tier badge inline ("Micro · 10K–50K").
- Linha única de métricas (sem nome completo, sem prisma).
- Chevron `⌄` à direita do bloco de identidade para expandir/colapsar.
- Ações reduzidas a dois ícones ghost (PDF, Partilhar). Sem "Novo relatório".
- À direita, separador vertical fino e o `AnalysisPeriodSelector` existente (já é compacto e cabe na barra em desktop).

Mobile: barra empilha em duas linhas — identidade em cima, ações + chevron em baixo; period selector mantém-se logo abaixo como hoje.

## Alterações

### 1. `src/components/report-redesign/v2/report-hero-v2.tsx`

Refactor do componente para suportar dois modos:

- `mode: "compact"` (default, novo) — barra única descrita acima.
- `mode: "expanded"` — exatamente o hero atual (avatar grande + nome + prisma + métricas), mas **sem** o botão "Novo relatório" e sem o "Comparar PRO" (Comparar fica disponível apenas via sidebar/menu existente para não recriar entry points). Ações reduzem-se a PDF + Partilhar.

Estado local: `const [expanded, setExpanded] = useState(false);`. Chevron alterna entre os dois modos com `aria-expanded`, `aria-controls` e transição suave (`transition-all` + `max-height`).

Mudanças concretas:

- Remover `Link to="/"` + ícone `Plus` (CTA "Novo relatório") em ambos os modos.
- Remover o botão "Comparar PRO" do hero (mantém-se o `CompetitorModal` apenas se for chamado a partir de outro local — caso contrário, remover o import e o estado `compareOpen`).
- Novo sub-componente `CompactHeader` com:
  - Avatar 10 (`size-10`) com check verde mini sobreposto.
  - Handle em `font-display text-[15px] sm:text-base font-semibold`.
  - `TierBadge` (novo, ver §3) inline ao lado do handle.
  - `MetricLine` reutilizada mas em `text-[13px] text-content-secondary`, sem `mt-2` e sem wrap forçado.
  - Botões PDF/Partilhar como `size-9` ghost icon-only (com `aria-label` traduzido); reutiliza `ShareReportPopover` com nova variante visual mínima.
  - Botão chevron com `ChevronDown` rotacionado quando `expanded`.
- `ExpandedHeader` reaproveita o JSX atual do hero mas com os ajustes acima (sem novo relatório, sem comparar).
- O `<section>` raiz passa a `py-3` (era `pt-5 pb-4`) para garantir compactação inicial.

### 2. `src/components/report-redesign/v2/report-shell-v2.tsx`

- Manter `ReportHeroV2` no mesmo sítio.
- Garantir que o `AnalysisPeriodSelector` continua imediatamente abaixo do hero (sem alterações funcionais). Em desktop ≥1280px, considerar fundir visualmente os dois numa única faixa: o hero compacto fica à esquerda e o selector à direita, separados por divider vertical. Isto faz-se ao envolver ambos num wrapper `flex` quando `mode === "compact"`. Se complicar layout responsivo, mantemos como duas faixas empilhadas (não bloqueante).

### 3. `TierBadge` (novo, inline no `report-hero-v2.tsx`)

Pequeno chip `inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-muted text-[11px] font-medium text-content-secondary` que mostra `{tierLabel} · {tierRange}` derivado de `getAccountTier(followers)` + `getTierLabel(...)` + intervalo do tier (já existente em `FALLBACK_BENCHMARK_DATA.tiers`). Sem dependências novas.

### 4. i18n

`src/i18n/locales/pt/report.json` e `en/report.json`:
- Remover/deixar de usar `hero.actions.new_report`.
- Adicionar `hero.actions.expand` / `hero.actions.collapse` ("Ver mais detalhes" / "Recolher cabeçalho").
- Adicionar `hero.actions.pdf_aria` e `hero.actions.share_aria` para icon-only buttons.

Não apago as chaves antigas para evitar quebrar outros consumidores; ficam órfãs e podem ser removidas num cleanup posterior.

### 5. Telemetria

Adicionar `trackEvent("analyze_header_toggled", { mode: "expanded"|"compact" })` no `setExpanded`. Sem alterações no backend.

## Fora do âmbito

- `report.example`, `report-page.tsx`, `ReportHeader` antigo (locked).
- `AnalysisPeriodSelector` (apenas reposicionado, lógica intacta).
- Lógica de credits, unlock, onboarding, Apify.
- Sidebar, modais e tracking de outros blocos.

## Checklist

- ☐ Hero v2 passa a renderizar barra compacta por defeito (≤ 56px em desktop).
- ☐ Chevron expande/colapsa para o layout atual sem layout shift acima.
- ☐ Botão "Novo relatório" removido em ambos os modos.
- ☐ Botão "Comparar PRO" removido do hero (e estado/import limpos).
- ☐ PDF + Partilhar continuam a funcionar, agora icon-only com `aria-label`.
- ☐ Tier badge inline mostra ex. "Micro · 10K–50K".
- ☐ Mobile 375px: barra em duas linhas, sem overflow horizontal.
- ☐ i18n PT/EN com chaves novas.
- ☐ `trackEvent` dispara em expand/collapse.
- ☐ `bunx tsc --noEmit` limpo.
