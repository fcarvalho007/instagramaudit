

## Entendimento

**Arquitetura actual da landing** (`src/routes/index.tsx`):
1. `<HeroSection>` — aurora cyan + headline + subtitle + action bar + handwritten note
2. Micro-proof strip inline (3 checks)
3. `<SocialProofSection>` — métricas
4. `<HowItWorksSection>` — 3 passos
5. `<ProductPreviewSection>` — header + mockup + 3 highlights

**Visual intent "Editorial Tech Noir"**: dark-first, Fraunces+Inter+JetBrains Mono, cyan accent, glassmorphism, scroll-triggered reveals. Linear/Vercel/Attio refs.

**Problemas identificados**: (a) cyan dominante em CTAs sem hierarquia clara; (b) secções todas no mesmo escuro = ritmo plano; (c) Product Preview parece mais um "slab escuro" do que um momento de revelação; (d) hero copy precisa de afinação; (e) mockup colado num fundo quase preto perde valor.

## Ficheiros homepage tocados

| Ficheiro | Locked? | Permissão | Scope |
|---|---|---|---|
| `src/styles/tokens.css` | **LOCKED** | Prompt autoriza adicionar tokens — só **adições** (CTA violet + light surfaces), zero alterações a tokens existentes | Add |
| `src/styles.css` (`@theme inline`) | **LOCKED** | Mesma autorização, só novas entradas para os tokens novos | Add |
| `src/components/ui/button.tsx` | **LOCKED** | Sprint 1.1C já alterou variante primary; agora reaplico para violet (mesma cirurgia, só primary) | Edit |
| `src/components/landing/hero-section.tsx` | **LOCKED** | Refinamento visual aprovado | Edit (copy + spacing) |
| `src/components/landing/hero-action-bar.tsx` | **LOCKED** | Refinamento visual | Edit (CTA glow color → violet, separação input/CTA) |
| `src/components/landing/social-proof-section.tsx` | **LOCKED** | Refinamento visual | Edit (surface differentiation + dividers) |
| `src/components/landing/how-it-works-section.tsx` | **LOCKED** | Refinamento visual | Edit (HUD grid background + step glow → violet) |
| `src/components/landing/how-it-works-step.tsx` | **LOCKED** | Refinamento visual | Edit (icon glow violet) |
| `src/components/landing/product-preview-section.tsx` | **LOCKED** | Refinamento visual | Edit (light surface, framing device, transition) |
| `src/components/landing/mockup-dashboard.tsx` | **LOCKED** | Refinamento visual | Edit (sharper, KPI emphasis, controlled glow, cleaner teaser) |
| `src/components/landing/mockup-metric-card.tsx` | **LOCKED** | Refinamento visual | Edit (KPI emphasis variant) |
| `src/routes/index.tsx` | — | — | Edit (micro-proof strip surface treatment) |
| `LOCKED_FILES.md` + memory | — | — | Sem novos ficheiros locked |

**Nenhum ficheiro novo é criado.** Tudo é refinamento dentro da arquitectura existente.

## Novos tokens (adicionados, nunca alterados)

Em `tokens.css`:
```
--accent-violet: 139 92 246;       /* premium violet */
--accent-violet-luminous: 167 139 250;
--shadow-glow-violet: 0 0 32px -4px rgb(139 92 246 / 0.5);

--surface-light: 241 245 249;       /* cool light surface (slate-100) */
--surface-light-elevated: 255 255 255;
--text-on-light-primary: 15 23 42;   /* slate-900 */
--text-on-light-secondary: 71 85 105; /* slate-600 */
--text-on-light-tertiary: 100 116 139;
```

Em `styles.css` (`@theme inline`): expor como `--color-accent-violet`, `--color-accent-violet-luminous`, `--color-surface-light`, etc., + `--shadow-glow-violet`.

## Mudanças por secção

### Hero
- H1 → `"Analisa o teu Instagram em menos de 30 segundos."` (já está "Analise"; passar a "Analisa" tu-form imperativo conforme pedido)
- Subtitle → `"Benchmark, comparação e insights claros para decidir melhor."` + `md:whitespace-nowrap` para garantir uma linha em desktop/tablet landscape, sem nowrap em mobile
- Spacing cadence: `space-y-8 md:space-y-10` → `space-y-6 md:space-y-8` para apertar headline↔subtitle, e `pt-6 md:pt-8` → `pt-10 md:pt-12` para arejar antes do action bar
- Subtitle leve bump de contraste: `text-content-secondary` → `text-content-secondary/95`

### Action bar
- CTA: `shadow-[0_0_32px_-4px_rgb(6_182_212_/_0.5)]` → `shadow-glow-violet`
- Separação input/CTA: aumentar padding do submit zone `p-2` → `p-2.5`, e adicionar uma sombra interior subtil ao bar (`shadow-[inset_0_1px_0_rgb(255_255_255_/_0.04)]`) para definição extra
- Border do bar reforçado em focus-within: `focus-within:border-accent-violet/40 transition-colors`

### Button (variante primary apenas)
```
bg-gradient-to-br from-accent-violet-luminous via-accent-violet to-accent-violet
shadow-glow-violet
text-white (em vez de text-content-inverse — violet pede branco para contraste WCAG)
hover:scale-[1.02] hover:brightness-110 hover:shadow-[0_0_40px_-4px_rgb(139_92_246_/_0.6)]
```
Hover/active/focus/disabled preservados. Cyan continua disponível em `accent-primary` para uso decorativo (aurora, gauges, badges).

### Micro-proof strip (em index.tsx)
Surface: `bg-surface-secondary/30` → `bg-gradient-to-b from-surface-base to-surface-secondary/60`, com border-bottom mais marcada (`border-b border-border-default`) e remoção do border-top (deixa o hero flutuar para a strip naturalmente).

### Social proof
- Background: `bg-surface-secondary/40` mantido mas com **divider luminoso** subtil no topo (linha de gradient horizontal violet→transparent→violet 1px, opacity 20%)
- Adicionar uma micro-grid HUD em background (CSS gradient lines, opacity 0.025) — anchorage editorial discreta
- Métricas: número grande continua, mas adicionar pequeno underline animado de 2px violet por baixo de cada valor (decorativo)

### How It Works
- Background: adicionar uma camada HUD com linhas verticais subtis (`linear-gradient(90deg, transparent 0, transparent calc(100% - 1px), rgb(255 255 255 / 0.03) 100%)` repeat-x a cada 80px) + glow radial violet muito ténue centrado
- Step icons: `box-shadow: var(--shadow-glow-cyan)` → `var(--shadow-glow-violet)` com border violet/20
- Adicionar separadores connector entre steps em desktop (linha pontilhada horizontal `border-t border-dashed border-border-subtle` ligando ícones — só md+)
- Section divider no topo: linha hairline `border-t border-border-default`

### Product Preview — **a transição dramática**
Esta é a mudança mais importante.

**Background da secção**: passa de escuro para **light editorial surface**.
- Wrapper section: `bg-gradient-to-b from-surface-base via-surface-light to-surface-light` com `padding-top` extra para a transição
- Camada de transição no topo: 120px de altura `bg-gradient-to-b from-surface-base to-transparent` para fundir suavemente
- Header (label "Preview do produto", h2, lead) muda para tipografia em **dark text** sobre fundo claro: `text-on-light-primary`, `text-on-light-secondary`, label muda para `text-accent-violet`
- Highlights abaixo: também em dark text sobre light surface

**Framing device editorial** (à volta do mockup):
- "Studio light stage": gradient radial branco→transparent atrás do mockup criando spotlight
- Frame fino com `rounded-3xl border border-slate-200/60 bg-white/40 backdrop-blur-sm p-3 md:p-5` envolvendo o mockup (parece um "objecto" pousado num expositor)
- Sombra dramática multi-layer: `shadow-[0_30px_60px_-20px_rgb(15_23_42_/_0.25),_0_60px_120px_-40px_rgb(139_92_246_/_0.15)]`
- 4 corner brackets SVG (L-shapes) nos cantos do frame externo — cor `slate-300` — sinaliza "produto enquadrado", linguagem editorial/tech

**Section divider topo**: hairline divider violet 1px com fade lateral

### Mockup dashboard (continua dark, agora contrasta com fundo claro)
- Border: `border-border-strong` → `border-slate-700/60` (mais contraste contra fundo claro)
- Shadow: `shadow-xl` → `shadow-[0_25px_50px_-12px_rgb(0_0_0_/_0.5)]`
- Top bar: refinar — `font-mono text-xs` da meta com mais tracking, badge "Relatório completo" passa a usar dot violet
- **KPI hero emphasis**: o primeiro metric card (`Engagement médio`) ganha tratamento especial via nova prop `featured`:
  - Border `border-accent-violet/40` em vez de subtle
  - Valor maior: `text-3xl md:text-4xl` (em vez de `2xl/3xl`)
  - Sombra glow violet muito subtil
  - Trend mantém success green
- Outros 3 cards: tipografia mais apertada, label `text-[0.625rem]` → `text-[0.6875rem]` para legibilidade, `gap-2` → `gap-1.5`
- Glow do gauge: reduzir `shadow-glow-cyan` no fill para `shadow-[0_0_12px_-2px_rgb(6_182_212_/_0.4)]` (mais controlado)
- Teaser bottom: o mask + fade já existe; clarificar — substituir `via-surface-base/40 to-surface-base` por um fade que vai para o frame interior (semi-transparente preto), e label "Conteúdo completo no relatório" passa a ter um pequeno ícone Lock à esquerda + tracking maior. O blur de 0.5px mantém-se, mas o mask começa mais cedo (`black 35%` → `transparent 100%`) para criar mais "convite à inscrição"

### Footer
Mantém-se dark mas com transição editorial: top border vira gradient hairline violet/cyan/transparent. Footer já é `bg-surface-secondary` — ok.

## Cadência de scroll resultante

```
[Hero — dark cinematic + aurora cyan]
  ↓ (micro-proof strip — gradient sutil escuro→escuro)
[Social Proof — surface-secondary/40 + HUD grid]
  ↓ (hairline divider)
[How It Works — dark + grid HUD + glow violet ténue]
  ↓ (gradient transition 120px dark→light)
[Product Preview — LIGHT editorial surface + studio stage + dark mockup contrastado]  ← MOMENTO DE REVELAÇÃO
  ↓ (gradient light→dark)
[Footer — dark]
```

## Confirmação visual-only

✅ Sem mudanças em routing (`createFileRoute`, links), `head()`/SEO, form handlers (`onSubmit`), state da action bar, props funcionais. Zero alterações em integrações, analytics, ou APIs (não existem ainda nesta landing).

## Validação mobile (375px)

- Hero: H1 mantém escala fluida `text-4xl md:text-6xl lg:text-7xl`; subtitle perde `whitespace-nowrap` em mobile (wrap natural)
- Métricas mockup: grid `2 cols` mantido em mobile, KPI featured destaca-se mas não rebenta layout
- Frame do mockup: padding reduzido em mobile (`p-3` vs `md:p-5`)
- Studio light stage: dimensionado em vw (`max-w-[90vw]`)

## Conflitos com LOCKED_FILES.md

Todos os ficheiros visados estão lockados desde Sprints 0/1. **Esta prompt concede explicitamente permissão para refinamento visual da landing**, satisfazendo a regra "only proceed if this prompt already grants permission". Sem ficheiros novos — nada a adicionar a `LOCKED_FILES.md` nem à memory.

## Desvios face à spec

1. **CTA color**: violet `#8B5CF6` (slate-violet 500) — premium, não roxo carnaval. Glow `rgb(139 92 246 / 0.5)`.
2. **Hero copy**: spec pede "Analisa" (tu-form imperativo) — adopto literal. O ficheiro actual tem "Analise" (formal). Mudo para "Analisa".
3. **"Studio light stage"**: implementado com gradient radial + frame branco translúcido + corner brackets, em vez de tentar desenhar moldura de monitor (que ficaria literal demais e contra a estética editorial).

