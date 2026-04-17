

## Entendimento

Landing já tem boa estrutura (Hero dark → micro-proof → Social proof → How it works → Product preview light). Os pontos a refinar:

1. **Light section washed out** — `--surface-light: 241 245 249` (slate-100) com `bg-white/40` no frame e radial spotlight branco puro = neblina/fog branca. Falta sofisticação.
2. **Mockup dashboard** — fade + lock label estão bem, mas top bar e KPI hierarchy podem ficar mais editorial; gauge ainda usa `shadow-glow-cyan` cheio (não controlado).
3. **CTA roxo** — funciona, mas gradient pode ganhar mais profundidade (deeper indigo/violet stop) e estado pressed ainda usa só `active:scale-[0.98]` global.
4. **Hero spacing** — cadência entre subtitle e action bar (`pt-10/12`) está OK mas pode refinar; subtitle `text-content-secondary/95` ainda pode ganhar leve bump.
5. **Section rhythm** — Hero→micro-proof→Social proof transita bem; Social proof→How it works falta separator visível; How it works→Product preview já tem gradient transition.

## Conflitos com LOCKED_FILES.md

Todos os ficheiros visados estão lockados (Sprints 0/1). Esta prompt **autoriza explicitamente refinamento visual da landing**. Sem ficheiros novos. Sem alterações estruturais. Confirmado: **UI-only, zero impacto em lógica/routing/forms/state**.

## Tokens — refinamentos cirúrgicos

Em `tokens.css` (apenas adições/refinamentos):
```
/* Light surface — cooler, more editorial (was slate-100, now cool-slate with depth) */
--surface-light: 226 232 240;          /* slate-200 — menos lavado */
--surface-light-elevated: 248 250 252; /* slate-50 — para o palco do mockup */
--surface-light-deep: 203 213 225;     /* slate-300 — bordas e profundidade */

/* CTA violet — refinado para premium, não playful */
--accent-violet-deep: 109 40 217;      /* violet-700 — para gradient stop profundo */

/* Glow controlado para o mockup no light surface */
--shadow-stage: 0 30px 60px -25px rgb(15 23 42 / 0.35),
                0 60px 120px -50px rgb(79 70 229 / 0.18);
```

Em `styles.css` (`@theme inline`): expor `--color-surface-light-deep`, `--color-accent-violet-deep`.

## Mudanças por secção

### Hero (`hero-section.tsx`)
- Subtitle: `text-content-secondary/95` → `text-content-secondary` (full token, mais legível)
- Spacing: `space-y-6 md:space-y-8` mantido; `pt-10 md:pt-12` → `pt-8 md:pt-10` para apertar ligação visual com action bar

### Action bar (`hero-action-bar.tsx`)
- Adicionar separador visual entre input e CTA: já existe `divide-x divide-border-subtle` — reforçar com `divide-border-default` em sm+
- Refinar shadow do bar: adicionar segunda camada `shadow-[0_30px_60px_-30px_rgb(0_0_0_/_0.6)]` para mais profundidade
- Submit button glow já é `shadow-glow-violet` — manter

### Button primary (`button.tsx`)
- Gradient mais rico: `from-accent-violet-luminous via-accent-violet to-accent-violet-deep` (3-stop com profundidade real)
- Pressed state explícito: `active:brightness-95 active:shadow-[0_0_16px_-4px_rgb(139_92_246_/_0.4)]` (substitui glow forte por subtil quando pressed)
- Hover já bem (`hover:scale-[1.02] hover:brightness-110`)

### Social proof (`social-proof-section.tsx`)
- Métricas: subir contraste do label `text-content-tertiary` → `text-content-secondary` (estava muito ténue)
- Underline violet: `bg-accent-violet/60` → `bg-gradient-to-r from-accent-violet to-accent-violet-luminous` (mais editorial)

### How it works (`how-it-works-section.tsx`)
- Section header label: já é `text-accent-violet-luminous` — bom
- Adicionar hairline divider no topo da secção: `border-t border-border-subtle` para separar visualmente de social-proof
- Step icons (`how-it-works-step.tsx`): manter glow violet, mas reduzir intensidade do background `bg-surface-elevated` → `bg-surface-elevated/70` para integrar melhor

### Product preview (`product-preview-section.tsx`) — **a grande mudança**
**Background**: passa de `from-surface-base via-surface-light to-surface-light` (slate-100 lavado) para uma composição editorial cool-slate:
```
bg-gradient-to-b from-surface-base via-surface-light to-surface-light-elevated
```
Com `surface-light` agora a slate-200 (mais cor, menos lavado).

**Studio light stage** — substituir o radial branco puro por uma composição de duas camadas:
- Camada 1 (atmosfera): radial gradient suave de `surface-light-elevated` (off-white quente) → transparent, mais pequeno (`h-[80%] w-[90%]`)
- Camada 2 (bottom shadow grounding): elipse escura subtil por baixo do mockup `shadow-stage` para "pousar" o objecto
- Remover `bg-[radial-gradient(ellipse_at_center,_rgb(255_255_255)_0%,...)]` puro branco

**Frame editorial**: `bg-white/50 backdrop-blur-sm` → `bg-surface-light-elevated/80 border-slate-300/60`. Sombra: `shadow-[0_30px_60px_-20px_...]` → `shadow-stage` (token).

**Corner brackets**: `border-slate-400/60` → `border-slate-500/70` (ligeiramente mais visíveis, mais editorial).

**Header tipografia** (sobre fundo light): label `text-accent-violet` → `text-accent-violet-deep` (melhor contraste em light surface). h2 já é `text-on-light-primary` — bom.

**Highlights abaixo**: label `text-on-light-tertiary` → `text-on-light-secondary` (estava ténue demais sobre slate-200).

### Mockup dashboard (`mockup-dashboard.tsx`)
- Top bar: `bg-surface-secondary/40` → `bg-surface-secondary/60` (mais peso visual). Avatar gradient `from-accent-primary to-accent-luminous` mantido (cyan = "perfil", não CTA).
- Badge "Relatório completo" já usa violet — bom.
- KPI featured (Engagement médio): glow `shadow-[0_0_24px_-8px_rgb(139_92_246_/_0.4)]` → `shadow-[0_0_32px_-12px_rgb(139_92_246_/_0.5)]` (mais focado, menos espalhado).
- Gauge bar (`mockup-benchmark-gauge.tsx`): `shadow-glow-cyan` → `shadow-[0_0_8px_-2px_rgb(6_182_212_/_0.3)]` (mais controlado).
- Bottom teaser: aumentar opacidade do label backdrop `bg-surface-base/70` → `bg-surface-base/85` (mais legível); mask já parou em `transparent 100%` — manter.

## Cadência visual resultante

```
[Hero — dark + aurora cyan + violet CTA]
  ↓ gradient suave
[Micro-proof — gradient bridge]
  ↓
[Social Proof — surface-secondary/40 + HUD grid + métricas com underline gradient]
  ↓ hairline divider
[How It Works — dark + grid HUD + violet glow + steps integrados]
  ↓ gradient transition dark→light
[Product Preview — slate-200 editorial + studio stage + dark mockup pousado]  ← REVELAÇÃO
  ↓
[Footer]
```

## Ficheiros tocados

| Ficheiro | Scope |
|---|---|
| `src/styles/tokens.css` | Add: `--surface-light` refinado, `--surface-light-elevated` ajustado, `--surface-light-deep` novo, `--accent-violet-deep` novo, `--shadow-stage` novo |
| `src/styles.css` | Add: expor novos tokens em `@theme inline` |
| `src/components/ui/button.tsx` | Edit primary variant: gradient 3-stop + active state |
| `src/components/landing/hero-section.tsx` | Edit: subtitle contrast, spacing |
| `src/components/landing/hero-action-bar.tsx` | Edit: divider reforçado, shadow extra |
| `src/components/landing/social-proof-section.tsx` | Edit: underline gradient |
| `src/components/landing/how-it-works-section.tsx` | Edit: top hairline divider |
| `src/components/landing/how-it-works-step.tsx` | Edit: bg-surface-elevated/70 |
| `src/components/landing/product-preview-section.tsx` | Edit: studio stage 2-layer, frame token-based, header colors |
| `src/components/landing/mockup-dashboard.tsx` | Edit: top bar weight, KPI glow refinado, label opacity |
| `src/components/landing/mockup-metric-card.tsx` | Edit: featured glow refinado |
| `src/components/landing/mockup-benchmark-gauge.tsx` | Edit: gauge glow controlado |

**Sem novos ficheiros.** Sem alterações em `routes/index.tsx`, header, footer, hero-aurora, blur-reveal, animated-counter, handwritten-note, scroll-indicator, instagram-glyph.

## Confirmação UI-only

✅ Zero alterações em: rotas, `head()`/SEO, form handlers, state da action bar, props funcionais, integrações, analytics, APIs, dependências.

## Mobile 375px

- Hero spacing reduzido funciona melhor em mobile (menos vazio entre subtitle e bar).
- Studio stage `max-w-[90vw]` mantido.
- Mockup grid 2-col em mobile, KPI featured destaca-se sem rebentar.
- Frame padding `p-3 md:p-5` mantido.

## Desvios face à spec

1. **Light surface**: passa de `slate-100` (#F1F5F9) para `slate-200` (#E2E8F0) como base + `slate-50` (#F8FAFC) como elevated. Justificação: slate-200 dá a "cool editorial" pedido, sem o efeito washed-out; slate-50 reservado para o palco onde o mockup pousa, criando contraste interno.
2. **Violet deep**: violet-700 (`#6D28D9`) como stop final do gradient — mantém a família roxa mas adiciona profundidade premium.
3. **Shadow stage como token**: criado `--shadow-stage` para reutilização no frame do mockup, evitando shadow arbitrária inline.

