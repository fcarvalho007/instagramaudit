

## Plano: Refactor do Hero (Sprint 1, Prompt 1.1B)

### Ficheiros a criar
1. `src/components/landing/blur-reveal-text.tsx` — reveal palavra-a-palavra com blur→focus, props: `text`, `as`, `staggerMs`, `durationMs`, `delayMs`. Acessibilidade via `aria-label` no parent + `aria-hidden` nos spans.
2. `src/components/landing/animated-counter.tsx` — counter 0→`to` com easing ease-out-expo via `requestAnimationFrame`, suporta `delayMs` e `durationMs`.
3. `src/components/landing/handwritten-note.tsx` — texto Fraunces *italic* tilted -6deg + arrow SVG curvo que desenha-se com `stroke-dasharray`, integra `AnimatedCounter` para o "2". Cor `accent-luminous`. Sequência: arrow (900ms, delay 1200ms) → text fade-in (500ms, delay 1700ms) → counter (600ms, delay 2100ms).
4. `src/components/landing/scroll-indicator.tsx` — barra vertical pulsante + label "Explorar" font-mono uppercase, posicionada `absolute bottom-8 left-1/2`. `prefers-reduced-motion` desactiva animação.

### Ficheiros a modificar (com permissão explícita)
5. `src/components/landing/hero-action-bar.tsx` — **cirúrgico**:
   - Remover bloco linhas 13-21 (micro-label "Analisar perfil" + Badge "Gratuito")
   - Remover imports `Badge` (já não usado)
   - Adicionar classe `hero-bar-breathe` no wrapper do Card glass (linha 24)
   - Adicionar `<style>` no fim com keyframe `hero-bar-breathe-kf` (scale 1 → 1.005 → 1, 4s loop) + media `prefers-reduced-motion`
   - Tudo o resto (form, input, button, reveal de concorrentes) **intacto**

6. `src/components/landing/hero-section.tsx` — **rewrite completo**:
   - `min-h-screen` em vez de `min-h-[92vh]`
   - Composição centrada
   - Headline H1: `<BlurRevealText text="Instagram analisado em 30 segundos." as="h1" className="font-display text-4xl md:text-6xl lg:text-7xl tracking-tight font-medium leading-[1.05] text-content-primary" delayMs={200} />` — **sem gradiente**, cyan reservado para CTAs
   - Subtitle: `<BlurRevealText text="Benchmark, comparação com concorrentes e insights por IA." as="p" className="font-sans text-lg md:text-xl text-content-secondary leading-relaxed max-w-2xl mx-auto" delayMs={800} />`
   - Wrapper `relative` à volta do `<HeroActionBar />` para ancorar `<HandwrittenNote />` em `absolute -top-8 -right-12 hidden sm:block` (apontando para o botão Analisar)
   - `<ScrollIndicator />` no fim
   - Remover micro-proof strip (3 checks) — passa para below-the-fold
   - Remover import `Check` (já não usado)

7. `src/routes/index.tsx` — adicionar micro-proof strip entre `<HeroSection />` e `<SocialProofSection />`:
   - `<section className="border-y border-border-subtle bg-surface-secondary/30 py-6">` com `<Container size="lg">` e flex centrado com 3 items (Check + label font-mono uppercase): "Análise em 30 segundos", "Sem registo necessário", "RGPD compliant"
   - Importar `Check` de lucide-react e `Container`

8. `LOCKED_FILES.md` — adicionar bloco "Landing Micro-components (Sprint 1, Prompt 1.1B)" com os 4 novos ficheiros
9. `.lovable/memory/constraints/locked-files.md` — espelhar entradas

### Ficheiros NÃO tocados
- `hero-aurora-background.tsx`, todos os atoms (button, badge, card, input, switch), layout (container, header, footer, app-shell, brand-mark), tokens, styles, social-proof, how-it-works (todos), product-preview (todos), use-in-view.

---

### Sequência de animação no load

| t (ms) | Evento |
|---|---|
| 0 | Aurora começa a flutuar (já em loop) |
| 200 | Headline começa reveal palavra-a-palavra (stagger 80ms, ~7 palavras = ~700ms total) |
| 800 | Subtitle começa reveal (stagger 80ms, ~9 palavras) |
| ~1000 | Action bar visível (sem animação de entrada, só breathing 4s loop) |
| 1200 | Handwritten note: arrow SVG draws-in (900ms) |
| 1700 | Texto da note fade-in + tilt (500ms) |
| 2100 | Counter "0→2" anima (600ms ease-out-expo) |
| ~contínuo | Scroll indicator pulsa (1.4s loop), action bar respira (4s loop) |

### Decisões técnicas

- **Handwritten note via SVG + Fraunces italic** (não cursive font) — viewBox ~`0 0 200 120`, path curvo `M 30 30 Q 60 80, 130 100` com `stroke-linecap="round"`, arrowhead com 2 paths curtos. Animação stroke via `stroke-dasharray: <length>; stroke-dashoffset: <length>→0` em 900ms.
- **Posicionamento da note**: `absolute -top-12 -right-16 sm:block hidden` no wrapper do action bar (que é `relative`). Em mobile fica oculto (sem espaço).
- **Cor do headline**: `text-content-primary` puro, sem gradient — segue regra "cyan reservado para CTAs".
- **`prefers-reduced-motion`**: respeitado em blur-reveal (mostra texto imediatamente), counter (mostra valor final), scroll-indicator (sem pulse), handwritten arrow (mostra final), action bar breathing (sem scale).

### Desvios face à spec
1. **Headline copy**: spec sugere "Instagram analisado em 30 segundos." — aplico literal. Confirmar se preferes "O Instagram analisado em 30 segundos." (artigo definido pt-PT mais natural).
2. **Subtitle**: "Benchmark, comparação com concorrentes e insights por IA." — 9 palavras, dentro do alvo "single line".
3. **Imports a remover**: `Badge` em hero-action-bar e `Check` em hero-section — para não deixar warnings.

