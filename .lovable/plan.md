

## Plano: Refinamentos cinemáticos (Sprint 1, Prompt 1.1C)

### Ficheiros a criar
1. `src/components/landing/instagram-glyph.tsx` — SVG genérico minimalista (quadrado arredondado + círculo + ponto), sem usar logo oficial Meta. `currentColor`, `aria-hidden`.

### Ficheiros a modificar (com permissão explícita)

2. `src/components/ui/button.tsx` — **APENAS** variante `primary`:
   - `bg-gradient-to-br from-accent-luminous via-accent-primary to-accent-primary` (diagonal, mais saturado)
   - `font-semibold` (era medium)
   - `hover:brightness-110`
   - Resto (sizes, states, loading, icons, outras variantes) **intacto**

3. `src/components/landing/hero-action-bar.tsx`:
   - Adicionar micro-label acima do Card glass: flex centrado com `<InstagramGlyph className="size-4" />` + `<span className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-content-tertiary">Perfil público do Instagram</span>` em `mb-3`
   - Alterar background do Card: `bg-surface-secondary/60` → `bg-surface-base/80` (mais escuro, mais peso)
   - Botão Analisar: adicionar `shadow-[0_0_32px_-4px_rgb(6_182_212_/_0.5)]` para glow exterior reforçado
   - Breathing animation, form, reveal de concorrentes — intacto

4. `src/components/landing/hero-section.tsx` — apenas 2 props de texto:
   - Headline: `"Analise o teu Instagram em menos de 30 segundos."`
   - Subtitle: `"Análise competitiva e dados concretos para comparar com a concorrência."`
   - Tudo o resto (BlurRevealText, timings, layout, handwritten note, scroll indicator) intacto

5. `src/components/landing/handwritten-note.tsx`:
   - Remover segundo `<span>` ("por mês")
   - Manter apenas `<AnimatedCounter to={2} /> relatórios grátis` numa linha
   - Ajustar SVG arrow: reduzir altura visual (mt menor) e reposicionar para apontar bem para o botão
   - Tilt -6deg, Fraunces italic, glow cyan, sequência de animação — intacto

6. `src/components/landing/mockup-dashboard.tsx` — refactor estratégico do body:
   - Top bar (linhas 26-50) **intacta** — permanece crystal clear
   - Wrapper do body: `<div className="relative">`
   - Body content actual: aplicar `style={{ filter: "blur(0.5px)", maskImage: "linear-gradient(to bottom, black 0%, black 25%, rgba(0,0,0,0.85) 50%, rgba(0,0,0,0.4) 80%, transparent 100%)", WebkitMaskImage: "..." }}` + `aria-hidden="true"` para SR não tropeçar em conteúdo decorativo
   - Overlay extra: `<div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-b from-transparent via-surface-base/40 to-surface-base" />` para fade reforçado
   - Label de intriga centrado: `<div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center"><span className="font-mono text-[0.625rem] uppercase tracking-[0.2em] text-content-tertiary/80 px-3 py-1.5 rounded-full bg-surface-base/60 backdrop-blur-sm border border-border-subtle">Conteúdo completo no relatório</span></div>`
   - Conteúdo (métricas, gauge, comparação, insight) permanece no DOM — apenas visualmente velado

7. `src/components/landing/how-it-works-section.tsx` — única alteração: h2 de `"Do username ao relatório em três passos."` para `"Relatório em 3 passos simples."`

8. `LOCKED_FILES.md` — adicionar bloco "Landing Micro-components (Sprint 1, Prompt 1.1C)" com `instagram-glyph.tsx`

9. `.lovable/memory/constraints/locked-files.md` — espelhar entrada

### Ficheiros NÃO tocados
- `hero-aurora-background.tsx`, `blur-reveal-text.tsx`, `animated-counter.tsx`, `scroll-indicator.tsx`
- Atoms (badge, card, input, switch), layout (container, header, footer, app-shell, brand-mark)
- Tokens, styles, social-proof, how-it-works-step, mockup-metric-card, mockup-benchmark-gauge, product-preview-section, use-in-view
- `src/routes/index.tsx`

---

### Decisões técnicas

- **Instagram glyph**: SVG 24×24 viewBox, `rx="6"` no rect exterior, círculo central, ponto pequeno top-right. `stroke="currentColor"` `fill="none"` `strokeWidth="1.5"` — encaixa no tom editorial monocromático e evita problemas legais com logo Meta.
- **Progressive blur**: combinação `filter: blur(0.5px)` no conteúdo + `mask-image` com gradient (preto→transparente) para criar fade direccional. Browsers modernos suportam `mask-image`/`-webkit-mask-image` nativamente. O `blur(0.5px)` é subtil — o efeito principal de "esconder" vem do mask + overlay gradient, não do blur intenso (que custaria GPU).
- **Acessibilidade do mockup**: `aria-hidden="true"` no wrapper do body porque é decorativo no contexto da landing. Top bar permanece acessível.
- **Botão glow extra**: shadow custom com cor `rgb(6 182 212 / 0.5)` (accent-primary com 50% opacity) — token-aligned mesmo sendo arbitrary value, dado que reproduz `--accent-primary`.
- **Handwritten arrow re-position**: provavelmente baixar `-mt-1` para `mt-0` ou `mt-1` agora que só há uma linha de texto. Ajuste fino visual.

### Desvios face à spec

1. **Micro-label "PERFIL PÚBLICO DO INSTAGRAM"** — em pt-PT respeitando capitalização, renderizo em `uppercase` via CSS; texto fonte fica `"Perfil público do Instagram"` (correcto ortograficamente; CSS faz uppercase). Alternativa: hardcoded em maiúsculas no JSX. Vou pelo CSS uppercase para preservar o texto semântico legível.
2. **Botão glow custom** usa arbitrary Tailwind value (`shadow-[...]`) porque os tokens existentes (`shadow-glow-cyan`) podem não ter a intensidade certa. Mantém-se token-aligned por usar a cor exacta de `--accent-primary`.
3. **Mockup blur intensity** — uso `blur(0.5px)` global + mask gradient agressivo em vez de blur progressivo via múltiplas camadas (que seria mais caro e complexo). Resultado visual equivalente ao spec, mais performante.

