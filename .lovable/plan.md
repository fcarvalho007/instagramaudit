

## Plan: Hero action-first com Aurora + Action Bar (Sprint 1, Prompt 1.1)

### Ficheiros a criar
1. `src/components/landing/hero-aurora-background.tsx` — 5 blobs radiais animados + noise + vignette, com `prefers-reduced-motion`
2. `src/components/landing/hero-action-bar.tsx` — barra glass com input + botão inline + reveal progressivo de concorrentes
3. `src/components/landing/hero-section.tsx` — orquestra aurora + action bar (primeiro) + headline + micro-proof

### Ficheiros a modificar
4. `src/routes/index.tsx` — rewrite total: importa `HeroSection`, mantém `head()` com meta pt-PT
5. `LOCKED_FILES.md` — nova secção "Landing Components (locked since Sprint 1, Prompt 1.1)" com os 3 ficheiros novos
6. `.lovable/memory/constraints/locked-files.md` — espelhar entradas

### Ficheiros NÃO tocados
Tudo em `LOCKED_FILES.md` actual: tokens, styles, __root, button, badge, card, input, switch, container, header, footer, app-shell, brand-mark.

---

### 1. Aurora background

- `<div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>`
- 5 blobs `<div className="aurora-blob aurora-blob-N">` com classes inline
- Camada noise SVG inline (data URI), `mix-blend-mode: overlay`, `opacity: 0.04`
- Vignette radial para focar centro e fundir com `surface-base`
- `<style>{...}</style>` inline com `@keyframes aurora-float-1..5`, `.aurora-blob`, `.aurora-noise`, `.aurora-vignette`, e `@media (prefers-reduced-motion: reduce) { .aurora-blob { animation: none } }`
- Cores via `rgb(6 182 212 / X)` e `rgb(103 232 249 / X)` (valores literais dos tokens `accent-primary` e `accent-luminous` — única forma de injectar dentro de `radial-gradient` sem CSS vars; consistente com tokens.css)
- `will-change: transform` + `filter: blur(80px)` + `mix-blend-mode: screen`

### 2. Action bar

Estrutura:
- Wrapper `relative w-full max-w-3xl mx-auto`
- Floating micro-label (acima, absolute top-0 -translate-y-full): font-mono uppercase + Badge "Gratuito" variant=success size=sm dot pulse
- Card glass: `relative rounded-2xl border border-border-strong bg-surface-secondary/60 backdrop-blur-xl shadow-2xl overflow-hidden`
- `<form onSubmit={(e) => e.preventDefault()}>` flex stacked → row em `sm:`, divisores `divide-y sm:divide-y-0 sm:divide-x divide-border-subtle`
- Zona input: `relative flex-1`, `<AtSign />` icon absolute left-5 top-1/2 -translate-y-1/2 size-5 text-content-tertiary, `<input>` nativo (NÃO o componente `Input` locked) `h-16 sm:h-18 bg-transparent pl-14 pr-4` font-sans text-base md:text-lg, placeholder pt-PT `"@username ou URL do perfil"`, focus ring custom (`focus:outline-none`)
- Zona submit: `p-2 sm:p-2 flex items-stretch`, `<Button variant="primary" size="lg" rightIcon={<ArrowRight />} className="w-full sm:w-auto sm:h-14 px-6 sm:px-8 whitespace-nowrap">Analisar</Button>`

Reveal concorrentes (state `competitorsOpen`):
- Wrapper `mt-4`
- Fechado: `<button>` com `<Plus />` + texto "Adicionar até 2 concorrentes para comparar" (font-sans text-sm, content-secondary → accent-luminous on hover)
- Aberto: container `space-y-3 animate-fade-in`, header com label font-mono "Concorrentes (opcional)" + botão "Remover" à direita, dois `<Input variant="glass" inputSize="md" leftIcon={<AtSign />}>` com placeholders `"@concorrente 1"` e `"@concorrente 2 (opcional)"`

### 3. Hero section

- `<section className="relative min-h-[92vh] w-full overflow-hidden bg-surface-base flex items-center">`
- `<HeroAuroraBackground />` (camada absoluta)
- `<Container size="lg" className="relative z-10 py-20 md:py-28">`
  - `<HeroActionBar />` com `mb-16 md:mb-20`
  - Bloco texto centrado `max-w-4xl mx-auto text-center space-y-8`:
    - H1 font-display text-4xl md:text-6xl lg:text-7xl tracking-tight font-medium leading-[1.05] (peso 500 conforme nota da spec — text-7xl pesa demasiado a 600), duas linhas: "O benchmark de Instagram" + `<span className="block bg-gradient-to-r from-accent-primary to-accent-luminous bg-clip-text text-transparent">que faltava ao mercado.</span>`
    - Sub-headline `font-sans text-lg md:text-xl text-content-secondary leading-relaxed max-w-2xl mx-auto`: "Análise instantânea de qualquer perfil público, comparação com até dois concorrentes e relatório detalhado com leitura estratégica por IA. Enviado por email. Sem custos."
    - Micro-proof strip: `flex flex-wrap items-center justify-center gap-x-8 gap-y-3 pt-4`, três items com `<Check className="size-4 text-signal-success" />` + texto font-mono uppercase tracking-wide text-xs content-tertiary: "Análise em 30 segundos", "Sem registo necessário", "RGPD compliant"

### 4. Homepage rewrite

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { HeroSection } from "@/components/landing/hero-section";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [/* pt-PT meta */] }),
  component: Home,
});
function Home() { return <HeroSection />; }
```

### 5. LOCKED_FILES.md

Adicionar bloco no fundo:
```
## Landing Components (locked since Sprint 1, Prompt 1.1)
- /src/components/landing/hero-section.tsx
- /src/components/landing/hero-aurora-background.tsx
- /src/components/landing/hero-action-bar.tsx
```
Espelhar em `.lovable/memory/constraints/locked-files.md`.

---

### Decisões técnicas

- **Cores aurora hardcoded em rgb()**: única solução técnica para injectar dentro de `radial-gradient` em CSS keyframes sem suporte universal de `color-mix`. Os valores correspondem 1:1 aos tokens `accent-primary` (#06B6D4) e `accent-luminous` (#67E8F9) — semanticamente consistentes, apenas em formato literal.
- **Input nativo no action bar**: a spec diz explicitamente "NOT wrapped in the shadcn Input component" para conseguir o efeito "barra contínua dividida". Estilizado para herdar tom premium (font-sans, text-content-primary, placeholder content-tertiary/70).
- **Headline a 6xl/7xl com peso 500** (não 600) — segue a nota da spec sobre densidade visual a estes tamanhos.
- **`min-h-[92vh]`** em vez de `min-h-screen` para deixar 8vh de "respiração" antes do header sticky e indicar que há scroll.
- **Aurora aria-hidden + pointer-events-none** — decorativo, não interfere com SR nem cliques.

### Desvios face à spec

1. **Headline weight 500 em vez de 600** — pré-validado pela própria spec ("If visually dense, drop to weight 500"). Decisão: aplicar já 500 a partir de `md:text-6xl`.
2. **Aurora cores em literal rgb()** — explicado acima; não há alternativa técnica viável dentro de keyframes/gradients sem var() suportado em todos os browsers para esta sintaxe específica.

