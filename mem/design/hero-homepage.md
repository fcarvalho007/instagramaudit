---
name: Hero homepage rules
description: Regras visuais fixas do hero da homepage / — dark navy cinemático, sem chip eyebrow, caixa @ branca, sem trust list
type: design
---
Hero da `/` (homepage) é **dark "Editorial Tech Noir"** — não converter para light.

Sem chip eyebrow ("Benchmark de Instagram") por cima do H1.
H1 grande e editorial (text-[2.5rem] → lg:text-7xl, tracking-[-0.02em], leading apertado).
Tail das 2 últimas palavras do H1 com gradiente cyan-soft → cyan → violet (bg-clip-text).
Section aplica `.hero-cinematic-vignette` (radial halos cyan + corner falloff) por cima do `HeroAuroraBackground`.

Caixa do input (`@perfil`) em `src/components/landing/hero-action-bar.tsx`:
- Fundo `#FFFFFF` (branco sólido, sem glass blur).
- Borda `rgba(15, 23, 42, 0.08)` (navy a baixa opacidade).
- Ícone `@` e texto do input em navy `rgb(var(--hero-bg-base))`.
- Placeholder `#94A3B8`.
- Sombra sóbria, sem glow ciano.

Por baixo da caixa **não há trust list** — apenas mensagem de erro
(`<p role="alert">`) quando o input é inválido. A key
`actionBar.trustInline.freeReports` mantém-se em i18n para outros usos
mas não é renderizada no hero.

Microlabel acima da caixa: "Inserir perfil público do Instagram" (pt) /
"Enter a public Instagram profile" (en). Botão: "Analisar grátis" (pt) /
"Analyse for free" (en).

Subtitle: "Diagnósticos profissionais para melhorar a presença digital." (pt) /
"Professional diagnostics to improve your digital presence." (en).

Preview do relatório (lado direito) envolto em `<TiltCard>`
(`src/components/landing/tilt-card.tsx`): tiltLimit 8°, scale 1.02,
perspective 1400, effect="gravitate", spotlight cyan (rgba 56,189,248,.22)
em mix-blend screen. Respeita prefers-reduced-motion.

Logo do Instagram (asset CDN `src/assets/instagram-logo.png.asset.json`)
aparece como background fosco no canto superior-direito do TiltCard:
340×340, opacity 0.12, blur 2px, mix-blend screen, mask radial que
desvanece para o centro. translateZ(-40px) para ganhar profundidade
no tilt. Decorativo (aria-hidden).

Seta manuscrita (asset CDN `src/assets/handdrawn-arrow.png.asset.json`)
aparece à direita do microlabel apenas em `sm:` para cima, rotate 8°,
filter invert + drop-shadow cyan, animação `hero-hint-bounce`
(1.8s loop, desligada com prefers-reduced-motion). Decorativa
(aria-hidden, alt="").
