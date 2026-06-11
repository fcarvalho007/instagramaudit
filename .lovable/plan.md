
# Refinamento cinemático do hero da homepage

Quatro mudanças coordenadas no hero (`/`), todas em código de apresentação. Sem alterações a lógica, i18n keys ou backend.

## 1. Substituir a subtitle

Ficheiros: `src/i18n/locales/pt/landing.json` e `.../en/landing.json`.

- pt: `hero.subtitle` → **"Diagnósticos profissionais para melhorar a presença digital."** (corrijo "profissionais" — concorda com "diagnósticos", plural).
- en: `hero.subtitle` → **"Professional diagnostics to improve your digital presence."**

Nenhuma alteração no `hero-section.tsx` (já lê `t("hero.subtitle")`).

## 2. Movimento 3D tilt no preview do relatório (lado direito)

Criar novo componente `src/components/landing/tilt-card.tsx` baseado no exemplo enviado, adaptado:
- `"use client"` removido (não aplicável em TanStack/Vite — é diretiva Next).
- Tipagem TS estrita (`HTMLDivElement` ref, return JSX completo — o snippet enviado tinha JSX truncado, reconstruo do zero seguindo a mesma API: `tiltLimit`, `scale`, `perspective`, `effect`, `spotlight`).
- Defaults afinados ao hero dark: `tiltLimit={8}` (mais subtil que 15 para não parecer arcade), `scale={1.02}`, `perspective={1400}`, `effect="gravitate"` (gravita para o cursor — sensação de "puxar" o utilizador), `spotlight={true}` com gradiente radial cyan a baixa opacidade (`rgb(var(--hero-cyan) / 0.18)`) para coerência com o vignette do hero.
- Transição `transform 220ms cubic-bezier(0.22, 1, 0.36, 1)` apenas no `pointerleave` (durante o movimento a transição fica desligada para responder em tempo real).
- `will-change: transform` e `transform-style: preserve-3d` no wrapper.
- Respeita `prefers-reduced-motion`: hook `useReducedMotion` simples; se reduzido, tilt e spotlight desligados.

Em `hero-section.tsx` envolver `<HeroReportPreview />` com `<TiltCard className="...">`. Sem mudar o conteúdo do preview.

## 3. Logo do Instagram como background fosco no preview

Objetivo: presença de marca subtil, não distrair do mockup do relatório.

- Carregar o upload `audit_profiles_instagram.png` como asset Lovable (CDN pointer JSON em `src/assets/instagram-logo.png.asset.json` via `lovable-assets create --file /mnt/user-uploads/audit_profiles_instagram.png`). Não copio o binário para o repo.
- Adicionar uma camada `<div aria-hidden>` **dentro** do `TiltCard`, atrás do `HeroReportPreview` (z-index inferior):
  - posicionada `absolute -top-10 -right-10` (assoma pelo canto superior-direito do card, parcialmente cortada — sensação editorial/disruptiva, não "wallpaper centrado").
  - tamanho `w-[320px] h-[320px]`, `background-image: url(logo)`, `background-size: contain`, `background-repeat: no-repeat`.
  - `opacity: 0.10`, `filter: blur(2px) saturate(1.15)` para o efeito "fosco" pedido sem perder o gradiente de cor da marca.
  - `mix-blend-mode: screen` para fundir bem com o navy do hero.
  - `mask-image: radial-gradient(circle at top right, black 40%, transparent 75%)` — desvanece para o centro do card, garantindo que não compete com os números/KPIs.
- Move-se em paralaxe inverso ao tilt (sem cálculo extra: por estar dentro do `TiltCard` com `preserve-3d` e `translateZ(-40px)`, ganha profundidade natural).

## 4. Seta manuscrita a apontar para a caixa de input

- Carregar `seta_para_baixo.png` como asset Lovable (mesmo método → `src/assets/handdrawn-arrow.png.asset.json`).
- Em `src/components/landing/hero-action-bar.tsx`, junto ao microlabel `"Inserir perfil público do Instagram"` (linha acima da caixa branca):
  - Wrapper relativo. Renderizar `<img>` da seta absolutamente posicionada **à direita** do texto do microlabel, apontando para baixo-esquerda em direção ao input.
  - `position: absolute; left: calc(label-width + 12px); top: -6px; width: 56px; height: auto;`
  - `transform: rotate(8deg)`; cor: a PNG vem preta — aplicar `filter: invert(1) brightness(1.2) drop-shadow(0 0 12px rgba(56,189,248,0.35))` para ficar branca-cyan no hero dark.
  - Animação subtil de "balanço" (keyframes `hint-bounce`: translateY 0 → 4px → 0, 1.8s ease-in-out infinite). Desligada com `prefers-reduced-motion`.
  - Apenas visível em `sm:` para cima (no mobile a seta polui o layout estreito): `hidden sm:block`.
  - `aria-hidden="true"` (é decorativa; o microlabel já comunica a ação).

Keyframe adicionado em `src/styles/hero-dark.css`:
```css
@keyframes hero-hint-bounce { 0%,100%{transform:rotate(8deg) translateY(0)} 50%{transform:rotate(8deg) translateY(4px)} }
.hero-hint-arrow { animation: hero-hint-bounce 1.8s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce){ .hero-hint-arrow { animation: none; } }
```

## Memória

Atualizar `mem/design/hero-homepage.md`:
- Nova subtitle pt/en.
- Preview lado direito usa `TiltCard` (gravitate, tilt 8°, spotlight cyan).
- Logo Instagram fosco no canto superior-direito do preview, opacity 0.10, mask radial.
- Seta manuscrita junto ao microlabel, ≥sm, decorativa, animação `hero-hint-bounce`.

## Out of scope

- Sem alterações em `HeroReportPreview` (conteúdo intacto).
- Sem mudanças em rotas, backend, i18n keys (só values).
- Sem novos pacotes npm.

## Checkpoint

- ☐ subtitle pt/en substituída
- ☐ `TiltCard` criado e a envolver o preview, com `prefers-reduced-motion`
- ☐ logo IG como background fosco dentro do TiltCard
- ☐ seta manuscrita ao lado do microlabel, animada, oculta em mobile
- ☐ assets Lovable criados a partir de `/mnt/user-uploads/` (sem binários no repo)
- ☐ `mem/design/hero-homepage.md` atualizado
