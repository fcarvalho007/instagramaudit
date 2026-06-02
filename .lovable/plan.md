
# Redesign da homepage (pós-hero → footer) em dark mode

Reconstruir a homepage do `SocialProofSection` até ao footer, aplicando a arquitetura do mockup `landing_completa_dark_pos_hero.html`. Tudo dark scoped (mesmo idioma visual do hero), mantendo o footer global light intacto — colocamos um "mini-footer" dark dentro da ilha da landing e mantemos o `<Footer />` global para legal/links.

## Bloqueio a destrancar

Estes ficheiros estão em `LOCKED_FILES.md` e serão tocados. Preciso de **confirmação explícita** para destrancar:

- `src/components/landing/social-proof-section.tsx`
- `src/components/landing/how-it-works-section.tsx`
- `src/components/landing/how-it-works-step.tsx`
- `src/components/landing/product-preview-section.tsx`
- `src/components/landing/mockup-dashboard.tsx` (substituído por nova preview)

Não tocados (continuam locked): `hero-*`, tokens, footer global, header.

## Nova arquitetura de `/`

A página passa a renderizar uma "ilha dark contínua" (`.hero-dark` scope) com 9 secções, separadas por hairlines `rgba(255,255,255,0.07)`, dentro de um wrapper único depois do hero:

```text
<HeroSection />            ← intacto
<LandingDarkIsland>        ← novo wrapper único
  ├─ StatsBand             (substitui SocialProofSection visualmente)
  ├─ ManualVsToolBand      (novo)
  ├─ ReportPreviewBand     (substitui ProductPreviewSection)
  ├─ HowItWorksBand        (substitui HowItWorksSection)
  ├─ BentoMetricsBand      (novo)
  ├─ PersonasBand          (novo)
  ├─ TransparencyBand      (novo)
  ├─ PricingTeaserBand     (novo, leva para /precos)
  └─ FinalCtaBand          (novo, Spotlight + handle bar)
</LandingDarkIsland>
<Footer />                 ← global light, intacto
```

`src/routes/index.tsx` passa a render `<HeroSection />` + `<LandingDarkIsland />`. O divisor "fade dark→light" atual é removido (a ilha mantém-se dark até ao footer global).

## Componentes a criar

Em `src/components/landing/dark/`:
- `landing-dark-island.tsx` — wrapper `.hero-dark` + `Container size="lg"` + bordas/hairlines partilhadas.
- `stats-band.tsx` — eyebrow + headline serif à esquerda, 3 KPIs à direita com `<AnimatedCounter />` (já existe) animando ao entrar no viewport (`use-in-view.ts`). Valores: `35M+`, `~0,5%`, `5`. Copy atualizada para EN/PT.
- `manual-vs-tool-band.tsx` — duas colunas: "À mão" (esmaecida, ícones X) vs "AuditProfiles" (iluminada, ícones check, halo cyan).
- `report-preview-band.tsx` — cartão do relatório com `max-height` + fade-out (`mask-image: linear-gradient(to bottom, black 60%, transparent)`) e botão flutuante "Ver relatório completo · +7 secções" → `/report/example`. Conteúdo do cartão é **mock claramente fictício** (`@marca_exemplo`). Usa `use-in-view` para scroll-reveal (escala + translate).
- `how-it-works-band.tsx` — 3 passos em linha com setas animadas (CSS keyframe simples; sem libs externas). Reescreve do zero para se afastar do estilo light atual.
- `bento-metrics-band.tsx` — grid 3 colunas, card grande 2×2 com benchmark + barra de progresso + valor 0,64%, 4 cards pequenos.
- `personas-band.tsx` — 4 cards (Consultores, Social media managers, Marcas e PME, Criadores) com ícones lucide.
- `transparency-band.tsx` — 2 colunas: headline + 3 chips ("Sem login do Instagram", "Apenas dados públicos", "Conforme o RGPD").
- `pricing-teaser-band.tsx` — 3 tiers (Grátis / 7€ avulso com 19€ riscado / Pack 5 a 28€ destacado "Melhor valor"). CTAs levam todos a `/precos`. Sem checkout — coerente com `do not implement payments yet` do project-knowledge.
- `final-cta-band.tsx` — halo radial cyan no topo (Spotlight CSS), headline serif, e reutiliza `<HeroActionBar />` (locked, mas só importado) para fechar com o mesmo input do hero.
- `mini-footer-strip.tsx` — barra com brand mark + 4 links institucionais dentro da ilha dark (Preços, Privacidade, Termos, Contacto). O `<Footer />` global continua a aparecer por baixo para conformidade legal.

## Tokens, cores e tipografia

Reutilizar variáveis `--hero-*` já existentes em `src/styles/hero-dark.css`. Adicionar ao mesmo ficheiro (não criar novo CSS):

- `--hero-text-secondary` clareado de `#BAC4DE` (já AA) — manter. Para textos terciários usar `--hero-text-tertiary` (#8692B2) só em metadados curtos.
- Helper classes locais (`.dark-hairline`, `.dark-card`, `.dark-card-emphasis`) para evitar repetir estilos inline.
- Animações novas (CSS-only, sem libs): `stats-rise`, `arrow-flow`, `spotlight-pulse`, todas respeitando `prefers-reduced-motion`.

Sem hex hardcoded em componentes — tudo via `rgb(var(--hero-*) / α)`.

## i18n

Adicionar a `src/i18n/locales/{pt,en}/landing.json`:

- `stats.*` (mantém keys atuais, atualiza valores: `0.52%` → `~0,5%`, `3× camadas` → `5 escalões de comparação`, label engagement passa a referir Socialinsider 2025-2026)
- `manualVsTool.*`, `reportPreview.*`, `bento.*`, `personas.*`, `transparency.*`, `pricingTeaser.*`, `finalCta.*`, `miniFooter.*`

Toda a copy em PT-PT primeiro, EN espelhado. Sem promessas falsas, sem countdowns.

## Acessibilidade & motion

- Contraste: textos secundários acima de AA — usar `--hero-text-secondary` (#BAC4DE) por defeito; `--hero-text-tertiary` reservado para labels uppercase pequenos. Não usar `#7C90A8` puro do mockup (fica no limite AA).
- Todas as animações (counter, scroll-reveal, arrow-flow, spotlight) desligam com `prefers-reduced-motion: reduce`.
- Ícones decorativos `aria-hidden`; landmarks corretos (`<section aria-labelledby>` por banda).
- Mobile-first: bento colapsa para 1 coluna, preview fica `max-w-full`, setas escondidas, stats em 1 col.

## Fora de scope

- Não tocar no hero, footer global, header, tokens light, `/report/example`, `/precos`, `/analyze/*`, backend, pagamentos, auth, traduções fora do namespace `landing`.
- Não introduzir libs novas (sem framer-motion, GSAP, Spline). Tudo CSS + hook `use-in-view` existente.
- Não substituir o `<Footer />` global pelo mini-footer — coexistem.

## Validação

- `bunx tsc --noEmit`.
- Smoke visual em 1440×900 e 390×844 via preview.
- Verificar que `/analyze/*` e `/report/example` continuam intactos (sem imports cruzados).
- Confirmar com print que os 9 bandas renderizam pela ordem e que o mini-footer + footer global aparecem sequencialmente sem corte de fundo.

## Aprovação necessária antes de avançar

1. **Confirmar destranque** dos 5 ficheiros locked listados acima (vão ser substituídos/rescritos).
2. **Confirmar** que o `<Footer />` global continua por baixo do mini-footer dark (vs. remover o global em `/`).
3. **Confirmar** rota do CTA "Ver relatório completo" → `/report/example` (alternativa: scroll para o pricing).
