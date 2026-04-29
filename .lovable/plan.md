# Redesign do report público `/analyze/$username` · estilo Iconosquare

Reformular a hierarquia visual do `ReportShell` para parecer um **dashboard analítico premium** (cards brancos, fundo azulado claro, KPIs dominantes), sem tocar em ficheiros locked nem em providers/PDF/admin.

## Estado actual confirmado

- `ReportShell` orquestra ~13 secções com peso visual igual.
- `ReportHero` já existe e é decente (gradiente cyan/violeta, avatar, badges, CTAs) mas tem hierarquia tipográfica fraca e CTAs comprimidos.
- `ReportExecutiveSummary` mostra os 5 KPIs como **linha com dividers** — não como cards. É exactamente o que o pedido quer mudar.
- `ReportSectionFrame` tem `tone` (calm/soft-cyan/soft-violet/plain) mas todas as secções acabam parecidas.
- Tema light já carregado (`tokens-light.css`): `accent-primary #3B82F6`, `tint-primary` azul-50, `tint-cyan`, shadows `card/lg/stage`. **Tudo o que preciso já existe** — não vou adicionar tokens.
- LOCKED_FILES confirmado: ficheiros do `report-redesign/*` **não estão locked**. Componentes `report/*` (ReportTemporalChart, ReportBenchmarkGauge, etc.) estão locked e serão reutilizados intactos.

## Princípios visuais (Iconosquare-inspired)

1. **Canvas claro azulado**: fundo da página `bg-surface-base` (#FAFBFC) com banda hero em gradiente azul muito suave (`tint-primary` + branco).
2. **Cards brancos verdadeiros**: `bg-white`, `border border-slate-200/70`, `shadow-card`, `rounded-2xl`, padding generoso.
3. **3 níveis visuais**:
   - **L1** (dominante): Hero + KPI grid + AI reading
   - **L2** (analítico): performance, benchmark, top posts, audiência, linguagem (cards uniformes mas sem competirem com L1)
   - **L3** (suporte): metodologia, teaser tier, bloco final (mais discretos, tipografia menor, sem cor)
4. **Hierarquia tipográfica fixa**: hero h1 / section h2 / card label — três tamanhos, três pesos, sem variantes ad-hoc.

## Alterações por ficheiro

### 1. `src/components/report-redesign/report-tokens.ts` (refactor)
Substituir os tokens existentes por uma paleta Iconosquare-style:

```ts
export const REDESIGN_TOKENS = {
  // Canvas e bandas de fundo
  pageCanvas: "bg-[linear-gradient(180deg,#F5F8FF_0%,#FAFBFC_280px,#FAFBFC_100%)]",
  heroBand: "bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.08),transparent_60%),linear-gradient(180deg,#EEF4FF_0%,#F8FAFF_100%)]",
  sectionAlt: "bg-white",            // L2 cards vivem dentro de banda branca
  sectionPlain: "bg-transparent",    // herda canvas
  // Cards
  card: "rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)]",
  cardKpi: "rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05),0_12px_32px_-16px_rgba(15,23,42,0.10)]",
  cardSoft: "rounded-2xl border border-blue-100 bg-blue-50/40",
  // Tipografia
  h1Hero: "font-display text-[2rem] sm:text-4xl md:text-5xl lg:text-[3.25rem] font-semibold tracking-[-0.02em] text-slate-900 leading-[1.05]",
  h2Section: "font-display text-2xl md:text-[1.75rem] font-semibold tracking-tight text-slate-900 leading-tight",
  eyebrow: "font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500",
  kpiValue: "font-display text-[2.25rem] md:text-[2.5rem] font-semibold tracking-tight text-slate-900 leading-none",
  kpiLabel: "font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500",
  kpiHelp: "text-xs text-slate-600 leading-snug",
} as const;
```

(Cores hardcoded **apenas** por compatibilidade com tema light; valores derivados directamente da palette `tokens-light.css` — `slate-200` = `border-subtle/40`, `blue-50/100/500` = família `accent-primary`. Justifico no PR — se preferes mapear para tokens semânticos digo na implementação.)

### 2. `src/components/report-redesign/report-hero.tsx` (rework)
- Substituir gradiente cyan/violeta por **azul-claro Iconosquare** (`heroBand` token).
- H1 maior e mais editorial (`h1Hero`); display name como h2 sub-linha; bio menor.
- Reorganizar layout: **avatar+identidade à esquerda, CTAs à direita** numa única linha em desktop; em mobile empilha mas CTAs continuam **antes do badges row**.
- Badges com fundo `bg-blue-50` + ring `ring-1 ring-blue-200`, texto `text-blue-700`. (Iconosquare-style chips.)
- CTA primário: botão sólido azul `bg-blue-600 hover:bg-blue-700 text-white` com sombra suave. Secundário: `bg-white border border-slate-200`.
- Adicionar pequena linha de "coverage": `{X} publicações · {Y} dias · analisado em {data}` em mono pequeno por baixo dos badges.

### 3. **NOVO** `src/components/report-redesign/report-kpi-grid.tsx`
Componente novo para substituir o `ReportExecutiveSummary` actual:
- 5 KPI **cards individuais** (white card pattern), **não** linha com dividers.
- Cada card: ícone lucide pequeno em círculo `bg-blue-50 text-blue-600` (top-left) → eyebrow label → valor grande → help line opcional.
- Ícones: `Activity` (envolvimento), `BarChart3` (publicações), `CalendarDays` (ritmo), `Image` ou `Film` (formato), `Target` (benchmark) — todos já em `lucide-react`.
- Grid responsivo:
  - mobile (<640): `grid-cols-2`, 5º card `col-span-2`
  - sm/md (640–1023): `grid-cols-3`
  - lg+ (1024+): `grid-cols-5`
- Cor do valor neutro `text-slate-900`; help em `text-slate-500`. Para "Estado do benchmark" o valor recebe pill colorida (verde/amarelo/cinzento).
- Sem hover effects exagerados — apenas `hover:shadow-lg transition-shadow`.

### 4. `src/components/report-redesign/report-executive-summary.tsx` (refactor → wrapper fino)
- Reduzir a um wrapper que renderiza `<ReportKpiGrid>` numa secção branca com padding generoso, **directamente após o hero, sem header próprio** (os KPIs falam por si).
- Ou (preferido) **eliminar** o ficheiro e substituir o uso no shell por `<ReportKpiGrid>` directamente. Vou pelo wrapper fino para manter API e evitar mexer no shell além do necessário.

### 5. `src/components/report-redesign/report-section-frame.tsx` (refactor mínimo)
- Standardizar header: eyebrow `kpiLabel` token + h2 `h2Section` token + subtitle 14-15px slate-600.
- Tons disponíveis passam a ser: `plain` (canvas), `white` (banda branca), `soft-blue` (banda azul-50). Remove cyan/violet (não combinam com a nova direcção azul).
- Wrapper interno do conteúdo: `<div className={REDESIGN_TOKENS.card + " p-6 md:p-8"}>{children}</div>` quando `framed=true` (novo prop), para garantir que cada secção L2 vive num card branco em vez de "flutuar" sobre a banda.

### 6. `src/components/report-redesign/report-shell.tsx` (refactor)
- Wrapper raiz: `<div className={REDESIGN_TOKENS.pageCanvas + " min-h-screen"}>`.
- Estrutura nova:
  ```
  Hero (banda azul claro)
  KPI Grid (banda branca, 5 cards)
  AI Reading (banda branca alt, card único elevado)
  Market Signals (mantém)
  ── separador visual ──
  Performance ao longo do tempo (framed=true)
  Benchmark + Formatos (framed=true)
  Concorrentes (framed=true)
  Top posts (framed=true)
  Resposta da audiência (framed=true)
  Linguagem (framed=true)
  ── L3, mais discreto ──
  Metodologia + benchmark source (banda canvas, sem card)
  Tier teaser + comparison
  Final block
  ```
- Reduzir `tone` redundantes; aplicar ritmo **branco ↔ canvas** alternado para criar separação visual sem cores fortes.

### 7. `src/components/report-redesign/report-ai-reading.tsx` (revisão visual leve)
- Apenas garantir que vive num card grande branco com eyebrow azul, sem mexer em conteúdo/lógica. Verifico ao implementar; se já estiver bom, **não toco**.

### 8. `src/components/report-redesign/report-methodology.tsx` (revisão visual leve)
- Mover para nível L3: card `cardSoft` (azul-50 muito suave) ou simples `border-t border-slate-200 pt-8`, tipografia menor. Sem mexer em conteúdo.

### Não toca

- `src/routes/analyze.$username.tsx` — nenhuma alteração necessária (todos os hooks/data flow ficam iguais).
- `src/components/report-share/*` — usado tal-qual.
- Qualquer `src/components/report/*` (locked).
- `src/routes/report.example.tsx` (locked).
- Providers, PDF, schema.

## Validação

- `bunx tsc --noEmit` e `bun run build` (corridos pelo harness).
- QA visual com `browser--navigate_to_sandbox` em 3 viewports:
  - 1366×768 (desktop): KPIs em linha de 5, hero com CTAs à direita.
  - 768×1024 (tablet): KPIs em 3 cols, hero a empilhar.
  - 375×812 (mobile): KPIs em 2 cols + 5º full-width, sem overflow horizontal.
- Confirmar que `/report/example` continua intacto (rota locked, não tocada).

## Não fazer

- Não introduzir novos tokens em `tokens-light.css` (locked).
- Não inventar dados — só `result.data`, `result.enriched`, `result.coverage`.
- Não chamar providers durante implementação.
- Não tocar em locked files.

## Checkpoint

- ☐ `report-tokens.ts` reescrito com paleta Iconosquare
- ☐ `report-hero.tsx` rework azul-claro com hierarquia clara
- ☐ `report-kpi-grid.tsx` novo (5 cards individuais)
- ☐ `report-executive-summary.tsx` reduzido a wrapper de KpiGrid
- ☐ `report-section-frame.tsx` com `framed` prop e tons azul/branco
- ☐ `report-shell.tsx` com nova estrutura L1/L2/L3
- ☐ QA em 1366 / 768 / 375 sem overflow
- ☐ `/report/example` inalterado
