

## Plan: Application shell — Container + Header + Footer + AppShell (Sprint 0, Prompt 3)

### Files to create
1. `src/components/layout/container.tsx` — horizontal constraint with 5 sizes + responsive padding
2. `src/components/layout/header.tsx` — sticky header w/ scroll-aware border, brand zone, desktop nav, mobile drawer (Radix Dialog)
3. `src/components/layout/footer.tsx` — 4-column top row + divided bottom row
4. `src/components/layout/app-shell.tsx` — composes Header + main + Footer

### Files to modify (with explicit permission)
5. `src/routes/__root.tsx` — wrap `<Outlet />` in `<AppShell>` only; meta/links/shell untouched
6. `src/routes/index.tsx` — strip outer min-h-screen wrapper, wrap showcase in `<Container size="lg" as="section" className="py-16">`. Keep all existing Sections intact.
7. `LOCKED_FILES.md` — append "Application Shell (locked since Sprint 0, Prompt 3)" with the 4 layout files
8. `.lovable/memory/constraints/locked-files.md` — mirror

### Container API
```tsx
<Container size="md" as="section" className="...">
```
- cva: `size`: sm (max-w-3xl) | md (max-w-5xl, default) | lg (max-w-7xl) | xl (max-w-[1440px]) | full (max-w-none)
- Base: `mx-auto w-full px-6 md:px-8 lg:px-10`
- `as` polymorphic via `React.ElementType` (default `div`)

### Header
- Wrapper: `sticky top-0 w-full transition-[backdrop-filter,border-color] duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)]` + inline `style={{ zIndex: "var(--z-sticky)" }}`
- Resting: `bg-surface-base/80 backdrop-blur-md border-b border-transparent`
- Scrolled (>40px): `backdrop-blur-lg border-border-subtle`
- Hook: inline `useScrollPast(threshold)` using `useEffect` + `window.addEventListener('scroll', …, { passive: true })`; cleanup on unmount; SSR-safe (initial state false, sets in effect)
- Inner: `<Container size="xl">` with `flex h-16 md:h-20 items-center justify-between gap-6`

**BrandMark** (inline SVG component): 32×32 svg, cyan circle with luminous gradient stroke (`stroke="url(#bm)"`, defs with linearGradient from `--accent-primary` to `--accent-luminous`), using `currentColor`/inline rgb refs.

Left zone: `<Link to="/">` containing BrandMark + wordmark "InstaBench" (font-display text-lg font-semibold tracking-tight text-content-primary). Tagline "INSTAGRAM BENCHMARK" hidden < md, separated by a vertical `h-5 w-px bg-border-default`.

Center nav (hidden < md): `<nav><ul class="flex items-center gap-8">` 4 items as `<Link>` with text-sm font-medium text-content-secondary hover:text-content-primary transition-colors duration-[150ms]. Items: Analisar `/`, Como funciona `/como-funciona`, Preços `/precos`, Recursos `/recursos`. (Routes don't exist yet — use `<a href>` instead of `<Link to>` to avoid TanStack typecheck failures on missing routes.)

Right zone: 
- Theme toggle placeholder: `<Button size="icon" aria-label="Mudar tema"><Moon /></Button>` (defaults ghost)
- Hamburger (md:hidden): `<DialogTrigger asChild><Button size="icon" aria-label="Abrir menu"><Menu /></Button></DialogTrigger>`
- Primary CTA hidden < sm: `<Button variant="primary" rightIcon={<ArrowRight />}>Analisar agora</Button>`

**Mobile drawer** using Radix Dialog (`@radix-ui/react-dialog` already present via shadcn dialog.tsx):
- Import primitives directly to build right-slide drawer (existing dialog.tsx is centered modal, not a slide drawer)
- Overlay: `fixed inset-0 bg-surface-base/80 backdrop-blur-sm z-overlay` w/ data-state animations
- Content: `fixed right-0 top-0 h-full w-[calc(100vw-60px)] sm:w-80 bg-surface-secondary border-l border-border-default flex flex-col`, slide-in-from-right animation
- Close X top-right (ghost icon button)
- Nav items stacked: `py-4 text-lg text-content-primary border-b border-border-subtle`
- Bottom: full-width primary CTA "Analisar agora"

### Footer
- `<footer class="bg-surface-secondary border-t border-border-subtle py-16 md:py-20">`
- `<Container size="xl">`
- Top row: `grid grid-cols-1 md:grid-cols-4 gap-10`
  - Col 1 Brand: BrandMark (reuse — extract to shared file `src/components/layout/brand-mark.tsx` so header + footer share it) + wordmark below + description paragraph (max-w-xs, sans text-sm content-secondary leading-relaxed)
  - Cols 2–4: micro label header (font-mono text-xs uppercase tracking-wide content-tertiary mb-4) + `<ul class="space-y-3">` of links (text-sm content-secondary hover:content-primary)
- Bottom row: `flex flex-col md:flex-row md:justify-between md:items-center gap-4 pt-8 mt-12 border-t border-border-subtle text-center md:text-left`
  - Left: copyright text-xs content-tertiary
  - Right: `<ul class="flex items-center gap-3 justify-center md:justify-end">` micro-links separated by `·` middot (rendered as `<li>` between items or via separator span)

Note: extracting BrandMark to its own file in `/src/components/layout/brand-mark.tsx` is one extra file (5 layout files total); will lock all five.

### AppShell
```tsx
<div className="min-h-screen flex flex-col">
  <Header />
  <main className="flex-1 pt-8 pb-24">{children}</main>
  <Footer />
</div>
```

### __root.tsx surgical change
Modify only `RootComponent`:
```tsx
function RootComponent() {
  return <AppShell><Outlet /></AppShell>;
}
```
Plus the new `import { AppShell } from "@/components/layout/app-shell";` line. Nothing else changes (meta, links, shellComponent, NotFoundComponent untouched).

### index.tsx change
- Remove outer `<div className="min-h-screen px-6 py-16 md:px-12 md:py-24" style={…surface-base}>`
- Replace inner `<div className="mx-auto max-w-5xl space-y-16">` with `<Container size="lg" as="section" className="py-16 space-y-16">`
- All Sections inside preserved verbatim
- Note: AppShell already provides `pt-8 pb-24` so `py-16` here adds the showcase-specific breathing room

### Lock governance
Append to `LOCKED_FILES.md`:
```
## Application Shell (locked since Sprint 0, Prompt 3)
- /src/components/layout/container.tsx
- /src/components/layout/header.tsx
- /src/components/layout/footer.tsx
- /src/components/layout/app-shell.tsx
- /src/components/layout/brand-mark.tsx
```
Mirror in `.lovable/memory/constraints/locked-files.md`.

### Deviations from spec
1. **BrandMark extracted to its own file** — header + footer both use it; DRY beats inlining. Locked together with the others.
2. **Nav links use `<a href>` not `<Link to>`** — TanStack Router enforces type-safe routes at typecheck; `/como-funciona`, `/precos`, `/recursos` don't exist yet and would fail the build. Plain anchors render the same and are trivially upgradable to `<Link>` once those routes ship.
3. **Custom drawer built from Radix Dialog primitives** in header.tsx (not the shadcn dialog.tsx wrapper) — needed for right-slide layout instead of centered modal. No new dep.
4. **z-sticky / z-overlay** — these tokens are CSS vars but not exposed as Tailwind utilities in `@theme inline`. Applied via inline `style={{ zIndex: "var(--z-sticky)" }}` to honor tokens without modifying the locked styles.css.

### Tokens used (no hardcoding)
`bg-surface-base/80`, `bg-surface-secondary`, `border-border-subtle`, `border-border-default`, `text-content-primary/secondary/tertiary`, `font-display`, `font-mono`, `font-sans`, `backdrop-blur-md/lg/sm`, custom durations/easings via inline transition class, `accent-primary`, `accent-luminous` (in BrandMark gradient via `rgb(var(--accent-…))`).

