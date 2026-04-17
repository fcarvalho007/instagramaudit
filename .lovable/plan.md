

## Entendimento do pedido

1. **Logo Instagram com mais valor visual** — o glyph monocromático actual (linha cyan ténue) passa despercebido. Substituir por um glyph com gradient Instagram (laranja→rosa→roxo) inspirado no logo de referência, mas sem usar a marca oficial Meta (questão legal). Aplicar onde gera mais valor: action bar do hero (já presente, mas sem destaque).
2. **"2 relatórios grátis" — refinar cor/tipografia** — actualmente cyan luminoso (`text-accent-luminous`) com Fraunces italic. Está a competir com o CTA roxo e fica "infantil". Mudar para tom mais editorial: `accent-violet-luminous` (alinha com sistema CTA) OU `text-content-primary/90` (mais sóbrio). Recomendo violet luminoso para coesão.
3. **Dashboard 100% pt-PT** — corrigir:
   - `@example_brand` → `@marca_exemplo`
   - `@competitor_a` / `@competitor_b` → `@concorrente_a` / `@concorrente_b`
   - `Engagement médio` → `Envolvimento médio`
   - `posts/sem` → `publicações/sem`
   - `Posts analisados` → `Publicações analisadas`
   - `últimos 30d` → `últimos 30 dias`
   - `Formato dominante` / `Reels` — manter (Reels é nome próprio Instagram)
4. **Dashboard "sai do escuro"** — o mockup actual é dark (navy). Pedido: continuar elegante mas sólido, num tom que não seja o navy escuro. Interpretação: passar o mockup para uma surface clara/neutra (slate-50 / branco editorial) com texto escuro, mantendo elegância. Isto contrasta dramaticamente com o palco light já existente — o dashboard torna-se um "documento premium" pousado no palco, em vez de um ecrã escuro.

## Conflitos com LOCKED_FILES.md

Todos os ficheiros visados estão lockados (Sprints 0/1). Esta prompt **autoriza explicitamente refinamento visual**. UI-only, zero impacto em lógica.

| Ficheiro | Scope |
|---|---|
| `src/components/landing/instagram-glyph.tsx` | Reescrever: SVG com gradient Instagram (defs linearGradient laranja→rosa→roxo), opção `solid` para apresentar fill colorido |
| `src/components/landing/handwritten-note.tsx` | Trocar cor `text-accent-luminous` → `text-accent-violet-luminous`; reduzir italic peso (manter Fraunces mas weight `font-normal`) |
| `src/components/landing/mockup-dashboard.tsx` | **Reformulação visual**: passar Card de glass dark para surface light (`bg-surface-light-elevated`), texto dark; corrigir copy pt-PT; refinar bordas, badges e gauge para light theme |
| `src/components/landing/mockup-metric-card.tsx` | Adaptar tons de texto/borda para variante light (manter API; adicionar variante interna ou usar tokens on-light) |
| `src/components/landing/mockup-benchmark-gauge.tsx` | Adaptar fundo da barra para light (`bg-slate-200`), manter gradient cyan no fill |
| `src/components/landing/product-preview-section.tsx` | Ajustar palco/frame: como mockup deixa de ser dark, simplificar studio stage (menos dramatismo, mais elegância pousada); ajustar grounding shadow |

**Sem novos ficheiros. Sem novos tokens.** Reutiliza tokens já existentes: `surface-light-elevated`, `surface-light`, `surface-light-deep`, `text-on-light-*`, `accent-violet*`, `accent-primary`, `signal-success`.

## Detalhes por ficheiro

### `instagram-glyph.tsx` — gradient Instagram
- Adicionar `<defs><linearGradient id="ig-grad">` com 4 stops: `#F58529` (0%) → `#DD2A7B` (40%) → `#8134AF` (75%) → `#515BD4` (100%), diagonal top-right→bottom-left
- Outer rect: `fill="url(#ig-grad)"` `stroke="none"` `rx="6"` — quadrado preenchido
- Inner camera ring: círculo branco `stroke="white"` `strokeWidth="1.8"` sem fill
- Inner camera lens: círculo branco menor `fill="white"`... ou apenas círculo stroke
- Top-right dot: `fill="white"`
- Add prop `tone?: "gradient" | "mono"` (default gradient). Manter compatibilidade com `className` para tamanho.
- Usar o glyph em `hero-action-bar` micro-label — passa de cinzento ténue para mancha colorida vibrante (chama atenção sem competir com CTA roxo).

### `handwritten-note.tsx` — refinar
- Cor: `text-accent-luminous` → `text-accent-violet-luminous` (alinha com CTA roxo)
- Peso/estilo: manter Fraunces italic mas reduzir `font-medium` → `font-normal` (mais elegante, menos berrante)
- Tamanho: `text-base md:text-lg` → `text-sm md:text-base` (mais discreto, menos competitivo)

### `mockup-dashboard.tsx` — passar para light theme
- **Card wrapper**: `variant="glass"` → custom: `bg-surface-light-elevated border-slate-200 shadow-[0_25px_50px_-12px_rgb(15_23_42_/_0.25),0_10px_20px_-8px_rgb(15_23_42_/_0.15)]` (sombra mais editorial, controlada)
- **Top bar**: `bg-surface-secondary/60` → `bg-slate-50/80`, border-bottom `border-slate-200`
  - Avatar: gradient `from-accent-violet to-accent-violet-luminous` (substitui cyan, alinha com CTA system)
  - Nome: `@example_brand` → `@marca_exemplo`, cor `text-on-light-primary`
  - Meta: cor `text-on-light-tertiary`, copy `Análise · 30 publicações · 14 Abr 2026`
  - Badge "Relatório completo": manter violet mas ajustar bg para `bg-accent-violet/15`
- **Body**: manter blur+mask reveal; backgrounds passam para light
  - Container blocks (`bg-surface-base/40`, `bg-surface-elevated/60`) → `bg-slate-50` + `border-slate-200`
- **Competitor rows**: `@competitor_a` → `@concorrente_a`, `@competitor_b` → `@concorrente_b`; trilho da barra `bg-slate-200` border `border-slate-300`; texto `text-on-light-primary` / `text-on-light-secondary`
- **AI insight**: bg `bg-violet-50` border `border-accent-violet/20`, ícone bg `bg-accent-violet/10` border `border-accent-violet/30` color `text-accent-violet-deep`; texto `text-on-light-primary/secondary`
- **Bottom teaser fade**: `via-surface-base/60 to-surface-base` → `via-surface-light-elevated/80 to-surface-light-elevated`
- **Lock label**: bg `bg-white/95` border `border-slate-200` text `text-on-light-secondary`

### `mockup-metric-card.tsx`
Como o Card actual usa `variant="default"` (token `surface-secondary`), e queremos light: passar para classes `bg-white border border-slate-200` directas no className (override) — ou adicionar prop `tone?: "dark" | "light"` (mais limpo). Recomendo prop `tone` para manter o Card primitive intocado.
- `tone="light"`:
  - Card bg `bg-white border-slate-200`
  - Label `text-on-light-tertiary`
  - Value `text-on-light-primary`
  - Suffix `text-on-light-tertiary`
  - Trend success `text-emerald-600` (em vez de `text-signal-success` que continua a funcionar bem em light, mas ajustar tom)
  - Featured: border `border-accent-violet/50` shadow `shadow-[0_0_24px_-8px_rgb(139_92_246_/_0.35)]`
- `tone="dark"` (default — preserva uso futuro)

### `mockup-benchmark-gauge.tsx`
- Trilho: `bg-surface-base/60 border-border-subtle` → `bg-slate-200 border-slate-300`
- Marcador benchmark: `bg-content-tertiary` → `bg-slate-500`
- Labels: `text-content-tertiary` → `text-on-light-tertiary`, valores `text-content-primary` → `text-on-light-primary`
- Fill cyan mantém-se (assinatura técnica)

### `product-preview-section.tsx` — ajuste de palco
Como o mockup deixa de ser uma "ilha escura" no fundo claro, o palco precisa de ser **mais subtil**:
- Studio stage radial: reduzir intensidade (já é ténue) — manter
- Grounding shadow: reduzir `bg-slate-900/15` → `bg-slate-900/10` (mockup light não precisa de tanta sombra dramática para "pousar")
- Frame brackets: manter (continuam a sinalizar "produto enquadrado")
- Frame container `bg-surface-light-elevated/80` → `bg-white/40` (mais subtil, deixa o mockup branco respirar)

## Cadência visual resultante

```
[Hero — dark + glyph IG colorido na action bar + handwritten violet sóbrio]
  ↓
[Social Proof — dark]
  ↓
[How It Works — dark]
  ↓ transição dark→light
[Product Preview — palco light + DASHBOARD LIGHT pousado] ← mudança de paradigma
  ↓
[Footer]
```
O dashboard deixa de ser "outro bloco escuro" e passa a ser **um documento premium** — coerente com a metáfora "relatório que recebes no email" (relatórios são tipicamente light).

## Validação

- **pt-PT**: todas as strings revistas (envolvimento, publicações, marca_exemplo, concorrente_a/b, dias)
- **Mobile 375px**: grid 2-col mantém-se, KPI featured destaca-se sem rebentar
- **Acessibilidade**: contrastes light passam WCAG AA (slate-900 sobre slate-50, slate-600 sobre white)
- **Logo Instagram**: gradient inspirado, sem trademark Meta — glyph genérico colorido (decisão legal já tomada na sprint anterior, agora apenas adiciono cor)
- **UI-only**: zero alterações em routing, forms, state, integrações

## Desvios face à spec

1. **Logo Instagram oficial** — não posso usar o logo Meta literal por questões de trademark. Uso o mesmo glyph SVG actual mas com o gradient signature do Instagram (laranja→rosa→roxo) — efeito visual equivalente, sem risco legal.
2. **Cor do "relatórios grátis"** — proposto violet luminoso (alinha com sistema CTA). Alternativa cyan luminoso já era o estado actual; alternativa neutra (`text-content-primary`) seria mais sóbria mas perderia personalidade. Vou de violet por coesão.
3. **Dashboard light** — interpretação de "sai do escuro para ser sólido elegante" como light editorial (slate-50/white) com texto dark. Faz sentido com o palco light já existente. Se preferires uma intermediate (e.g. surface "elevated dark" mais clara mas ainda navy), posso ajustar.

