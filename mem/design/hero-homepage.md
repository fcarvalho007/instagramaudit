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
