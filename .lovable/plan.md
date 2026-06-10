## Auditoria mobile do relatório — só código, sem editar

Escopo: `src/components/report-redesign/v2/**` (shell V2 em produção em `/reports/$snapshotId` e `/analyze/$username`). Cobre os 3 estados:
- **Free** (sem secções premium desbloqueadas) — render do hero + 1–2 blocos + `PremiumTeaserCard` + `StickyUnlockBar`
- **Pago individual** — todos os blocos desbloqueados, sem `competitor*`
- **Pago comparativo** — todos os blocos + `compare/*` + `competitor-*-compare.tsx`

Viewports verificados: 320 / 375 / 390 / 414 / 768 / 1024.

Legenda: **P0** = bloqueia uso real em mobile · **P1** = degrada credibilidade ou tap-target · **P2** = polish.

---

### P0 — Bloqueadores mobile

**P0-1 · Hero: botões PDF e Share com 28×28 px (tap target inválido)**
`report-hero-v2.tsx:96-126` — `size-7 sm:size-9`. Em 375/390/414 os botões medem 28 px, abaixo do mínimo WCAG 44×44 e abaixo do guidance shadcn (`size="icon"` = 36 + bump para `min-h-11 min-w-11`).
Fix: `size-9 sm:size-9` (36 px) ou `size-11` (44 px) já no breakpoint base.

**P0-2 · Utility bar: botões `h-8` (32 px)**
`report-utility-bar.tsx:46-100` — PDF + Share com `h-8 text-xs`. Sticky em `top-16` ocupa banda fixa de 44 px, mas o alvo clicável é 32 px. Em 320/375 com dois botões cabidos no canto direito ficam praticamente inacessíveis.
Fix: `h-10` (40 px) ou `h-11` (44 px) e remover o `hidden sm:inline` do label para preservar contexto em ≥390.

**P0-3 · Sticky unlock bar + bottom nav tabs: dupla barra empurra ~140 px do viewport**
`sticky-unlock-bar.tsx:285-329` usa `mb-[72px]` para libertar `report-block-nav.tsx:1678` (`min-h-[64px]`). Em 320 e 375 isto deixa **apenas ~580–700 px úteis** sob o hero + utility bar. Em iPhone SE (320×568), depois de hero (~60) + tabs top (~44) + utility bar (~44) + unlock bar (~120) + bottom nav (~72) = **~340 px de conteúdo visível**. Inutilizável.
Fix obrigatório em duas frentes:
- Esconder `report-utility-bar.tsx` em `<md` (consolidar PDF/Share dentro do hero, que já os tem).
- `StickyUnlockBar` mobile deve auto-colapsar para **um botão flutuante** após o primeiro scroll, expandindo só quando o utilizador atinge o `EndOfFreeBlock`.

**P0-4 · `report-overview-cards.tsx`: tooltip `w-[240px]` em 320px**
Linha 309: `"w-[240px] sm:w-[260px] … max-w-[calc(100vw-3rem)]"`. O `max-w-` salva o overflow, mas em 320 o tooltip ocupa 272 px (100vw–48), tapa o KPI inteiro e não é dispensável por touch (`group-hover` só, sem suporte a `onClick`/aria-expanded).
Fix: trocar tooltip por `Popover` shadcn (clique alterna) ou esconder o info-tooltip em mobile e mover o texto explicativo para o `help` line do `KpiCard`.

**P0-5 · `report-posting-heatmap.tsx` força scroll horizontal sem affordance**
Linha 31: `min-w-[640px]` dentro de `overflow-x-auto`. Em 375 o utilizador vê metade da grelha sem nenhum hint visual de que pode arrastar (sem fade-edge, sem scrollbar, sem chip "→ deslizar"). Conhecido pattern broken: utilizadores assumem que faltam dados.
Fix: adicionar fade gradient no edge direito + chip `"← deslizar →"` visível só em `<sm` na primeira renderização.

---

### P1 — Degradação significativa

**P1-1 · Compare blocks (pago comparativo): nomes longos truncam silenciosamente**
`compare/compare-table.tsx:46` — header `Th` usa `truncate max-w-full`. Handles `@reservaranchocharrua_oficial` (22 chars) em coluna de ~140 px ficam `@reservaranch…`. Idem `compare-stat-block.tsx:131` (`min-w-0 overflow-hidden whitespace-nowrap text-3xl`) — números grandes (1.234.567) cortam em viewport 320.
Fix: trocar `text-3xl sm:text-4xl` por `text-2xl sm:text-3xl md:text-4xl`; nos handles, permitir 2 linhas em mobile (`line-clamp-2` em vez de `truncate`).

**P1-2 · `competitor-cadence-compare.tsx`: `grid-cols-5` sem responsive prefix**
Linha 270. Cinco colunas em 320 px = ~52 px por coluna, com `gap-2`. Métricas + sparkline lá dentro ficam ilegíveis.
Fix: `grid-cols-2 sm:grid-cols-5` ou scroll horizontal explícito.

**P1-3 · `competitor-modal.tsx`: viola design system + tipografia <12 px**
- Linhas 30–55: classes `text-slate-500/700`, `bg-slate-50/50`, `border-slate-200/60` — proibidas (core rule).
- `text-[12px]` na caption do gráfico e `text-[13px]` na descrição passam, mas o CTA "Pro" usa `from-amber-500 to-amber-600` hardcoded — viola a regra de remover gold/amber do UI público.
Fix: substituir por tokens `content-secondary/tertiary`, `surface-muted`, `border-default` e o CTA por `bg-accent-primary`.

**P1-4 · Shell `px-5` em 320px deixa 280 px úteis e provoca overflow em `EditorialIdentityCard`**
`report-shell-v2.tsx:193,222` — `px-5 md:px-6 lg:px-8`. Em 320 com `editorial-identity-card.tsx:787` a renderizar uma chip absoluta `-top-7 -translate-x-1/2 whitespace-nowrap` por cima do título, a chip pode sair do container.
Fix: `px-4 sm:px-5 md:px-6 lg:px-8` e, para a chip, `hidden sm:inline-flex` já está aplicado — confirmar que não há `display: inline-flex` forçado via override.

**P1-5 · `report-block-nav.tsx` mobile bottom bar: rótulos truncados em 320**
Linhas 1697–1746. Cada `button` em `flex-1` com `text-xs leading-tight truncate`. Em 320, com 5 blocos visíveis + botão menu (72 px), sobram ~50 px por bloco; rótulos "Performance", "Conteúdo", "Procura" cortam para "Performa…" e descaracterizam a nav.
Fix: limitar a 3–4 ícones em `<sm` (já há `visibleIndices`, validar `maxVisible` per breakpoint) ou só-ícone sem label em 320–375.

**P1-6 · `report-engagement-benchmark-chart.tsx` (14 classes responsivas, alto risco)**
Linhas 163, 238, 259, 282 — `min-w-[56px]` / `min-w-[48px]` somam ~250 px de gutters fixos antes do desenho da barra. Em 320 sobram ~70 px para a barra real. Comparativo (com label do competitor à direita) sobrepõe.
Fix: em `<sm` esconder a coluna direita de labels (já há `sm:min-w-[100px]`) — confirmar que `min-w-[56px]` baseline não está duplicado em ambos os lados.

---

### P2 — Polish e dívida técnica de mobile

**P2-1 · Texto <12 px disperso por 25+ pontos em `report-block-nav.tsx`** (`text-[11px]`, `text-[10px]`). Core rule: 12 px mínimo, abaixo só para chart ticks. Promover para `text-xs` em todos os pontos que sejam UI textual, não rótulos de gráfico.

**P2-2 · `whitespace-nowrap` em headlines de compare e badges do hero** — risco de overflow quando i18n encompridar strings. Substituir por `text-balance` + permitir wrap.

**P2-3 · `slate-*` em 10 ficheiros do relatório** — viola core rule "Never use slate-*". Não é mobile-only, mas como sweep aqui está a lista para limpar num PR dedicado:
`premium-callout.tsx`, `report-kpi-grid-v2.tsx`, `report-themes-feature.tsx`, `report-source-label.tsx`, `report-overview-attention-row.tsx`, `report-overview-cards.tsx`, `report-benchmark-evidence.tsx`, `overview/competitor-modal.tsx`, `report-positioning-banner.tsx`, `report-diagnostic-grid-v2.tsx`.

**P2-4 · `format-card.tsx` coluna proporção `w-[88px]` em 320 + thumbnails de 120 px do top posts** competem por 280 px úteis. Funciona, mas justo. Considerar `w-[80px]` em base.

**P2-5 · `report-post-comparison.tsx` tooltip `max-w-[220px]` posicionado absolutamente acima do card pode sair do viewport em 320 — já tem `pointer-events-none` mas falta `max-w-[calc(100vw-2rem)]`.

---

### Resumo executivo

| Estado | P0 críticos | P1 | Veredicto mobile |
|---|---|---|---|
| Free | P0-1, P0-2, P0-3, P0-4, P0-5 | P1-4, P1-5, P1-6 | **Usável com fricção alta**. P0-3 (dupla barra) é o pior. |
| Pago individual | P0-1, P0-2, P0-4, P0-5 | P1-4, P1-5, P1-6 | Sem `StickyUnlockBar`, ganha ~120 px. **Funcional, tap-targets em falta.** |
| Pago comparativo | P0-1, P0-2, P0-4, P0-5 | **P1-1, P1-2, P1-3**, P1-4, P1-5, P1-6 | **Pior estado**: compare blocks e modal de competidor têm mais problemas concentrados. |

### Próximo passo

Sair de plan mode → entrar em build mode com 4 patches independentes (sem tocar desktop, sem tocar lógica de payments/credits/cache):

1. **Fix tap-targets** (P0-1, P0-2): hero + utility bar a 44 px.
2. **Fix dupla barra mobile** (P0-3): consolidar utility bar dentro do hero em `<md`, colapsar `StickyUnlockBar` para FAB.
3. **Fix tooltips touch-hostile** (P0-4, P2-5): `Popover` shadcn + `max-w-[calc(100vw-2rem)]`.
4. **Fix heatmap affordance** (P0-5) e compare blocks (P1-1, P1-2, P1-3).

P2 fica para um PR de limpeza separado (substituição de `slate-*` por tokens).

Aprovas a entrada em build mode com estes 4 patches por esta ordem?