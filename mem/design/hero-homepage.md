---
name: Hero homepage rules
description: Regras visuais fixas do hero da homepage / — dark navy, caixa @ branca, trust list reduzida
type: design
---
Hero da `/` (homepage) é **dark "Editorial Tech Noir"** — não converter para light.

Caixa do input (`@perfil`) em `src/components/landing/hero-action-bar.tsx`:
- Fundo `#FFFFFF` (branco sólido, sem glass blur).
- Borda `rgba(15, 23, 42, 0.08)` (navy a baixa opacidade).
- Ícone `@` e texto do input em navy `rgb(var(--hero-bg-base))`.
- Placeholder `#94A3B8`.
- Sombra sóbria, sem glow ciano.

Trust list por baixo da caixa: **apenas** "Oferta de 2 relatórios grátis"
(key `actionBar.trustInline.freeReports`). A key `publicData` foi
removida intencionalmente — não voltar a adicionar.
