

## Plano: Social Proof + Como Funciona (Sprint 1, Prompt 1.2)

### Ficheiros a criar
1. `src/components/landing/use-in-view.ts` — hook com Intersection Observer, unobserve após primeira intersecção
2. `src/components/landing/social-proof-section.tsx` — strip de credibilidade com border-y, micro-statement editorial à esquerda + 3 métricas à direita
3. `src/components/landing/how-it-works-step.tsx` — step individual com reveal scroll-triggered (fade + translate-y), delay configurável
4. `src/components/landing/how-it-works-section.tsx` — header + grid 3 colunas com delays 0/150/300ms, ícones AtSign/LineChart/Mail

### Ficheiros a modificar
5. `src/routes/index.tsx` — `Home()` compõe `<HeroSection /> + <SocialProofSection /> + <HowItWorksSection />` num fragment; meta `head()` intacta
6. `LOCKED_FILES.md` — nova secção "Landing Components (Sprint 1, Prompt 1.2)" com os 4 ficheiros novos
7. `.lovable/memory/constraints/locked-files.md` — espelhar entradas

### Ficheiros NÃO tocados
Tudo em `LOCKED_FILES.md` actual (tokens, atoms, shell, hero).

---

### Detalhes-chave

**use-in-view.ts**
- Ref tipada como `RefObject<HTMLElement | null>`
- `threshold: 0.2`, `rootMargin: "0px 0px -100px 0px"`, override via options
- Unobserve após primeira intersecção → animação não re-dispara

**social-proof-section.tsx**
- `<section className="relative border-y border-border-subtle bg-surface-secondary/40">`
- Container `size="lg" py-12 md:py-16`
- Flex stacked → row em `md:`
- Métricas: `35M+` / `0,52%` / `3×` em font-display medium tracking-tight; labels font-mono uppercase tracking-wide content-tertiary
- Labels pt-PT: "Posts analisados (fonte: Socialinsider 2025)", "Engagement médio em reels", "Camadas de comparação"

**how-it-works-step.tsx**
- Props: `number`, `title`, `description`, `icon`, `delay?`
- Wrapper com `transition-all duration-[700ms] ease-[cubic-bezier(0.16,1,0.3,1)]` + `style={{ transitionDelay }}`
- Estado inicial: `opacity-0 translate-y-8` → `opacity-100 translate-y-0` quando `inView`
- Ícone num quadrado `h-14 w-14 rounded-xl bg-surface-elevated border border-border-strong shadow-glow-cyan` com ícone `text-accent-luminous`
- Label "Passo 0X" font-mono uppercase tracking-wide content-tertiary
- Título font-display 2xl/3xl medium; descrição font-sans base/lg content-secondary

**how-it-works-section.tsx**
- `py-24 md:py-32`
- Header `max-w-2xl mb-16 md:mb-20`: micro-label "Como funciona" em accent-luminous, h2 font-display 3xl/5xl "Do username ao relatório em três passos.", lead em content-secondary
- Grid `grid-cols-1 md:grid-cols-3 gap-12 md:gap-8`
- 3 steps com copy pt-PT impessoal:
  - 01 · Inserir o username · "Qualquer perfil público do Instagram. Opcionalmente, até dois concorrentes para comparação directa." · `<AtSign />`
  - 02 · Análise automática · "Os últimos 30 posts são processados contra benchmarks atualizados da plataforma e da dimensão do perfil." · `<LineChart />`
  - 03 · Relatório no email · "PDF detalhado com métricas, ranking de concorrentes e três insights estratégicos gerados por IA." · `<Mail />`
- Delays: 0 / 150 / 300 ms

**index.tsx**
```tsx
function Home() {
  return (
    <>
      <HeroSection />
      <SocialProofSection />
      <HowItWorksSection />
    </>
  );
}
```

### Decisões técnicas
- **Sem framer-motion** (não está instalado) — Intersection Observer + transitions Tailwind, conforme spec.
- **Linha decorativa entre steps**: a spec marca como opcional. Decisão: **omitir** — risco de sujar o ritmo editorial e complicar o responsive sem ganho claro. Manter o grid limpo.
- **Tokens only**: `border-border-subtle`, `bg-surface-secondary/40`, `bg-surface-elevated`, `border-border-strong`, `shadow-glow-cyan`, `text-accent-luminous`, `text-content-primary/secondary/tertiary`, `text-signal-success` — todos já existentes.

### Desvios face à spec
1. **Linha decorativa entre ícones dos steps** marcada como opcional na spec — omitida (ver acima).
2. **"comparação directa"** em pt-PT (com "c") em vez de "direta" — ortografia europeia pré-acordo é "directa"; sigo a regra do projecto de pt-PT estrito. Se preferires pós-acordo ("direta"), digo já.

