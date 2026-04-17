

## Plano: Product Preview com mockup do dashboard (Sprint 1, Prompt 1.3)

### Ficheiros a criar
1. `src/components/landing/mockup-metric-card.tsx` — card de métrica reutilizável (label + value + suffix + trend + badge)
2. `src/components/landing/mockup-benchmark-gauge.tsx` — gauge horizontal com marcador de benchmark + barra de valor actual com glow
3. `src/components/landing/mockup-dashboard.tsx` — dashboard fake completo (top bar + 4 métricas + gauge + comparação + AI insight)
4. `src/components/landing/product-preview-section.tsx` — secção wrapper com glow cyan, header, reveal e 3 feature highlights

### Ficheiros a modificar
5. `src/routes/index.tsx` — adicionar `<ProductPreviewSection />` após `<HowItWorksSection />`; `head()` intacta
6. `LOCKED_FILES.md` — bloco "Landing Components (Sprint 1, Prompt 1.3)" com os 4 ficheiros novos
7. `.lovable/memory/constraints/locked-files.md` — espelhar entradas

### Ficheiros NÃO tocados
Tudo em `LOCKED_FILES.md` actual (tokens, atoms, shell, hero, social proof, how it works, hook `use-in-view`).

---

### 1. `mockup-metric-card.tsx`

Card pequeno com:
- Wrapper `Card` variant="default" padding="md" (atom locked)
- Label font-mono uppercase tracking-wide text-xs content-tertiary
- Linha de valor: número grande font-display text-2xl/3xl medium content-primary + suffix font-mono text-sm content-tertiary + Badge opcional
- Trend opcional: ícone TrendingUp/Down + texto font-mono text-xs (cor por variant: success/warning/danger/default)
- Variant map: `success → text-signal-success`, `warning → text-signal-warning`, `danger → text-signal-danger`, `default → text-content-secondary`

### 2. `mockup-benchmark-gauge.tsx`

- Barra horizontal: `relative h-2 rounded-full bg-surface-base/60 border border-border-subtle overflow-hidden`
- Fill da esquerda até `value/max %`: `bg-gradient-to-r from-accent-primary to-accent-luminous shadow-glow-cyan rounded-full`
- Marcador vertical do benchmark: `absolute top-1/2 -translate-y-1/2 h-4 w-0.5 bg-content-tertiary` posicionado a `left: benchmarkPercent%`
- Labels abaixo (flex justify-between): "Atual" / "Benchmark" font-mono uppercase tracking-wide content-tertiary + valor font-mono content-primary

### 3. `mockup-dashboard.tsx`

Frame: `Card variant="glass" padding="none" className="overflow-hidden border-border-strong shadow-2xl"`.

**Top bar** (`border-b border-border-subtle px-6 py-4 flex items-center justify-between bg-surface-secondary/40`):
- Esquerda: avatar circular `h-10 w-10 rounded-full bg-gradient-to-br from-accent-primary to-accent-luminous` + nome `@example_brand` font-display text-lg medium + meta "Análise · 30 posts · 14 Abr 2026" font-mono text-xs content-tertiary
- Direita: `<Badge variant="success" size="sm" dot pulse>Relatório completo</Badge>`

**Body** (`p-6 space-y-6`):

a) Grid de 4 métricas — `grid grid-cols-2 md:grid-cols-4 gap-3`:
- "Engagement médio" · 0,64% · trend "+0,18 vs benchmark" · variant=success
- "Posts analisados" · 30 · suffix "últimos 30d" · variant=default
- "Frequência semanal" · 3,2 · suffix "posts/sem" · variant=default
- "Formato dominante" · Reels · badge "62%" · variant=default

b) Bloco gauge — `rounded-lg border border-border-subtle bg-surface-base/40 p-5 space-y-4`:
- Header flex justify-between: esquerda label font-mono "Benchmark · Reels" + sub "Posicionamento face ao esperado" font-sans text-sm content-secondary; direita `<Badge variant="success" size="sm">Acima benchmark</Badge>`
- `<MockupBenchmarkGauge value={0.64} benchmark={0.52} max={1.2} />`

c) Comparação com concorrentes — `space-y-3`:
- Header label font-mono "Comparação com concorrentes" content-tertiary
- 3 linhas com grid `grid-cols-[140px_1fr_56px] gap-4 items-center`:
  - Nome font-mono text-sm (self → content-primary, outros → content-secondary)
  - Barra: track `h-2 rounded-full bg-surface-base/60 border border-border-subtle` + fill `h-full rounded-full` com width `${(value/0.7)*100}%` (escala normalizada para visual). Self → `bg-gradient-to-r from-accent-primary to-accent-luminous shadow-glow-cyan`; outros → `bg-content-tertiary/40`
  - Valor à direita font-mono text-sm text-right (self primary, outros secondary)

d) AI insight — `rounded-lg border border-border-subtle bg-surface-elevated/60 p-5`:
- Flex gap-4: ícone `<Sparkles />` num quadrado `h-10 w-10 rounded-lg bg-accent-primary/10 border border-accent-primary/30 text-accent-luminous`
- Coluna texto: label font-mono "Insight prioritário" text-accent-luminous + parágrafo font-sans text-sm/base content-secondary leading-relaxed com o copy pt-PT: "A performance em Reels está 23% acima do benchmark. A frequência pode subir de 3,2 para 4 posts/semana sem saturar — os concorrentes publicam menos mas com menor engagement."

### 4. `product-preview-section.tsx`

- `<section className="relative py-24 md:py-32 overflow-hidden">`
- Glow decorativo: `absolute inset-0 pointer-events-none` com div centrado `top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[800px] rounded-full bg-accent-primary/10 blur-3xl` (aria-hidden)
- `<Container size="lg" className="relative z-10">`
  - Header `max-w-2xl mb-12 md:mb-16`: micro-label "Preview do produto" font-mono uppercase accent-luminous; h2 font-display text-3xl md:text-5xl medium tracking-tight "O relatório que recebes no email." (única excepção pt-PT com "tu" — alinhada com tom premium do projecto e linguagem do brief; alternativa impessoal proposta abaixo); lead font-sans text-lg content-secondary
  - `<MockupWithReveal />` — usa `useInView` (hook locked), wrapper com transição `opacity-0 scale-95 translate-y-8` → `opacity-100 scale-100 translate-y-0`, `duration-[900ms]` ease-out-expo
  - `<FeatureHighlights />` — grid `grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 mt-16 md:mt-20`, cada item:
    - Label font-mono text-xs uppercase tracking-wide content-tertiary
    - Título font-display text-xl medium content-primary
    - Descrição font-sans text-sm content-secondary leading-relaxed
  - Conteúdo (3 highlights pt-PT impessoal):
    - DADOS · "Métricas accionáveis" · "Engagement, alcance, frequência e formato dominante. Tudo o que importa, nada do que distrai."
    - BENCHMARK · "Comparação imediata" · "Cada métrica contextualizada face ao benchmark da plataforma e da dimensão do perfil."
    - IA · "Leitura estratégica" · "Três insights prioritários gerados por IA, com recomendações concretas para os próximos 30 dias."

### 5. Homepage

```tsx
function Home() {
  return (
    <>
      <HeroSection />
      <SocialProofSection />
      <HowItWorksSection />
      <ProductPreviewSection />
    </>
  );
}
```

---

### Decisões técnicas

- **Mockup 100% em componentes**: `Card`, `Badge`, `Container` (atoms locked) + divs com tokens. Zero imagens, zero SVG externo. Apenas ícones lucide (`Sparkles`, `TrendingUp`).
- **Escala da barra de concorrentes**: normalizo a `value / 0.7` para que `@example_brand` (0,64) fique perto do fim da barra mas não a 100% — visualmente convincente sem parecer "max out".
- **Glow decorativo**: `bg-accent-primary/10` + `blur-3xl` em vez de aurora completa (já existe no hero) — discreta, dá profundidade sem competir com o mockup.
- **Reveal**: reusa `use-in-view.ts` locked. Sem nova dependência.
- **Tokens-only**: surfaces, accents, signals, borders, shadows todos via classes Tailwind dos tokens existentes.

### Desvios face à spec

1. **Headline "O relatório que recebes no email."** usa "recebes" (segunda pessoa). Alinhado com o brief literal mas viola a regra de impessoalidade preferencial. **Proposta alternativa impessoal**: "O relatório enviado por email." ou "O relatório que chega ao email." Aplico a versão da spec por defeito; se preferires impessoal, digo já qual aplicar.
2. **`Badge` no metric card** sem variante específica — uso `variant="outline"` size=sm para o "62%" do formato dominante (subtil, não compete com a métrica).
3. **Trend icons (TrendingUp/Down)** só aparecem quando há `trend` definido, e só uso `TrendingUp` no mockup (engagement positivo) — `TrendingDown` importado mas não renderizado para já, removido do import para evitar warning.

