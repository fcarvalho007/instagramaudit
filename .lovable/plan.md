

## Plano: /design-system + nova homepage placeholder (Sprint 0, Prompt 4 — final)

### Ficheiros a criar
1. `src/components/design-system/ds-section.tsx` — helpers `DSSection` + `DSExample`
2. `src/routes/design-system.tsx` — rota `/design-system` com sidenav sticky + 7 secções
3. `src/routes/index.tsx` — **rewrite total** para placeholder hero "em breve"

### Ficheiros NÃO tocados
- Tudo em `LOCKED_FILES.md`: tokens, styles, __root, button, badge, card, input, switch, container, header, footer, app-shell, brand-mark
- `routeTree.gen.ts` (auto-gerado pelo plugin Vite)

---

### 1. `ds-section.tsx` — API

```tsx
<DSSection id="button" label="ATOMS" title="Button" description="...">
  <DSExample label="VARIANTS">
    {children}
  </DSExample>
</DSSection>
```

- `DSSection`: `<section id={id} className="scroll-mt-24 mb-24">` + bloco header (micro-label font-mono, título font-display 3xl/4xl, descrição) + `<div className="space-y-12">{children}</div>`
- `DSExample`: wrapper `space-y-4` + label font-mono + caixa "sandbox" `rounded-lg border border-border-subtle bg-surface-secondary/40 p-6`

### 2. Nova homepage (`src/routes/index.tsx`)

Hero centrado dentro de `<Container size="md">` com `min-h-[70vh] flex flex-col items-center justify-center text-center`:

- Micro-label: "Em breve · Instagram Benchmark Analyzer"
- H1 font-display 4xl/6xl: **"O benchmark de Instagram que faltava ao mercado."**
- Lead paragraph (text-lg, content-secondary, max-w-2xl): copy pt-PT impessoal sobre análise pública, benchmarks, IA e relatório por email
- CTAs (flex gap-4):
  - Primary `<Button variant="primary" rightIcon={<ArrowRight />}>Receber aviso de lançamento</Button>`
  - Secondary `<Button asChild variant="secondary"><Link to="/design-system">Ver design system</Link></Button>`
- Status strip (font-mono text-xs content-tertiary com Badge dot): "Sprint 0 completo · Design system finalizado"

**Toda a copy em pt-PT impessoal** — sem "tu/precisas/queres/podes".

### 3. `/design-system` — estrutura

`<Container size="xl" className="py-12">` com grid `lg:grid-cols-[200px_1fr] gap-12`:

**Sidenav (`<aside>`):**
- Desktop: `sticky top-24 self-start hidden lg:block`
- Mobile: barra horizontal scrollável no topo do conteúdo (`lg:hidden flex gap-4 overflow-x-auto pb-4 mb-8 border-b border-border-subtle`)
- Header: "Design system · v0.1" (font-mono micro-label)
- Items (anchors `<a href="#tokens">` etc.): Tokens, Button, Badge, Card, Input, Switch, Layout — font-mono uppercase tracking-wide, py-2, border-l-2 border-transparent hover:border-accent-primary hover:text-content-primary

**Conteúdo:**
- DSHero (inline): micro-label "Living documentation · Sprint 0 completo", título font-display 4xl/5xl "Design System", descrição
- Secção 1 — Tokens:
  - DSExample "SURFACES & ACCENTS": grid 2/3 cols com 9 swatches (h-20 rounded-lg + nome token + hex), usando classes utilitárias `bg-surface-base`, `bg-accent-primary`, etc.
  - DSExample "TYPOGRAPHIC SCALE": lista vertical com "Aa" em Fraunces 5xl/4xl/3xl, "The quick brown fox..." Inter lg/base, "ENGAGEMENT · 0.52%" mono sm — cada um com label font-mono content-tertiary à direita ou abaixo
- Secção 2 — Button: VARIANTS, SIZES, STATES (loading + disabled, com nota sobre hover), WITH ICONS
- Secção 3 — Badge: STATUS VARIANTS (7), SIZES (sm/md/lg), WITH DOT (estático + pulse), WITH ICONS
- Secção 4 — Card: VARIANTS (grid 5 cards) + PADDING SIZES (4 cards lado a lado)
- Secção 5 — Input: DEFAULT (com leftIcon AtSign, rightIcon Search, sem ícone), GLASS (Search), GHOST (inline), SIZES (sm/md/lg stacked), STATES (error + disabled) — todos com `InputLabel` + `InputHelper` em pt-PT
- Secção 6 — Switch: SIZES (3 stacked) + STATES (off/on/disabled-off/disabled-on com label à esquerda)
- Secção 7 — Layout: DSExample "CONTAINER SIZES" — 5 barras stacked centradas (`mx-auto`) com larguras `max-w-3xl`, `max-w-5xl`, `max-w-7xl`, `max-w-[1440px]`, `w-full`, cada uma com label "SIZE sm · max-w-3xl" font-mono e bar `h-12 border border-border-subtle bg-surface-secondary/40 rounded-md flex items-center px-4`

### Detalhes técnicos

- Rota registada automaticamente pelo plugin Vite ao criar o ficheiro (TanStack file-based routing)
- `head()` em `/design-system`: title "Design System · InstaBench", description em pt-PT
- `head()` em `/`: title "InstaBench · O benchmark de Instagram que faltava ao mercado", og:title/og:description correspondentes
- `<Link to="/design-system">` é type-safe assim que o ficheiro existir
- Sem cores/spacing/fonts hardcoded — só utilities baseadas em tokens
- Placeholder homepage usa apenas componentes já locked (Button, Badge, Container)

### Desvios face à spec

1. **Mobile sidenav** — spec só pede "visível no mobile pelo menos como navegação topo"; implemento como barra horizontal scrollável acima do conteúdo (mais elegante que dropdown e mantém os anchors funcionais).
2. **Status strip na homepage** — uso `<Badge variant="success" size="sm" dot pulse>` em vez de SVG manual; reutiliza componente locked, mantém o tom premium.
3. **Sem ficheiros locked tocados** — registo do route é 100% automático via Vite plugin; `routeTree.gen.ts` regenera sozinho no build.

