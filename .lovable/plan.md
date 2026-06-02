# Plano — strip de vídeo decorativo no fundo do hero

## Asset

- Upload: `/mnt/user-uploads/background_audit_profiles.mp4` (1920×1080, 10s, H.264, 16 MB → grande demais).
- **Otimizar** com ffmpeg (já em PATH):
  - `background-strip.mp4` — H.264 baseline yuv420p, 1280×720, CRF 30, `-preset slow -movflags +faststart -an`, alvo ~600–900 KB.
  - `background-strip.webm` — VP9 CRF 36 (`-b:v 0`), mesmas dimensões, ~400–700 KB.
  - `background-strip-poster.jpg` — 1280×720, qualidade 70, ~30–60 KB (frame ~2s para evitar fundo preto).
- Gerar versões a partir do mount; **não** colocar o `.mp4` original em `public/`.
- Hospedar via Lovable Assets (3 pointers `.asset.json` em `src/assets/`):
  - `background-strip.mp4.asset.json`
  - `background-strip.webm.asset.json`
  - `background-strip-poster.jpg.asset.json`

## Componente novo

`src/components/landing/hero-video-strip.tsx`

- Wrapper `<div aria-hidden="true">` absoluto, full-width, ancorado ao fundo do hero (`absolute inset-x-0 bottom-0`).
- Altura responsiva via Tailwind: `h-[70px] sm:h-[100px] md:h-[130px] lg:h-[160px]`.
- `<video>` com `autoPlay muted loop playsInline preload="metadata" poster={posterUrl} tabIndex={-1}` + 2 `<source>` (WebM primeiro, MP4 fallback). `pointer-events-none`, `object-cover w-full h-full`.
- Opacity por breakpoint via classe utilitária inline: `opacity-[0.15] sm:opacity-[0.22] lg:opacity-[0.24]`.
- Overlay gradient (`absolute inset-0 pointer-events-none`) que vai de `transparent` no topo → `hero-bg` no fundo (90%): usar `--hero-bg` token + linear-gradient para fundir com o hero existente. Adicionar um segundo gradient lateral subtil (esquerda/direita transparente → bg 100%) para evitar bordas duras em ultra-wide.
- **Reduced motion**: `useReducedMotion()` (matchMedia `(prefers-reduced-motion: reduce)`) com fallback SSR `false`. Se `true`, renderiza só o `poster` como `<img>` e não monta `<video>`.
- z-index: o strip fica entre `HeroAuroraBackground` (z-0) e o `Container` (z-10) → atribuir `z-[1]` ao wrapper. Conteúdo (headline/CTA/preview) continua dominante.

## Integração no hero

`src/components/landing/hero-section.tsx` — mudança cirúrgica única:

- Importar `HeroVideoStrip`.
- Inserir `<HeroVideoStrip />` imediatamente depois de `<HeroAuroraBackground />` e antes do `<Container>`.
- Sem alterar: copy, eyebrow, BlurRevealText, HeroActionBar, HeroReportPreview, ScrollIndicator, classes de layout do `<section>`, ou qualquer prop existente.

## Performance / acessibilidade

- `preload="metadata"` (não puxa o vídeo todo até estar em viewport — hero está no top, então arranca rapidamente mas sem custo de poster).
- WebM antes de MP4 → Chrome/Firefox/Edge servem ~30–40 % mais leve.
- `aria-hidden="true"` + `tabIndex={-1}` + `pointer-events-none` → nunca recebe foco nem cliques.
- `prefers-reduced-motion: reduce` → poster estático em vez de vídeo.
- Sem layout shift: altura fixa por breakpoint; o strip é `absolute` portanto não empurra conteúdo.

## Hidratação

O hook `useReducedMotion` devolve `false` no SSR e atualiza no `useEffect` (sem branch durante render), evitando o tipo de mismatch que apareceu anteriormente em `ReportPreviewBand`.

## Validação

1. `bunx tsc --noEmit`
2. Screenshots: 1440×900, 1280×800, 390×844, 360×800 — confirmar headline/CTA/preview continuam dominantes e o strip é subtil.
3. Confirmar tamanho dos assets gerados (`ls -lh` dos ficheiros temp antes do upload).
4. Confirmar que `LandingDarkIsland` (segunda metade da página) e o resto não são afetados.

## Ficheiros a tocar

- **novos**: `src/components/landing/hero-video-strip.tsx`, `src/assets/background-strip.mp4.asset.json`, `src/assets/background-strip.webm.asset.json`, `src/assets/background-strip-poster.jpg.asset.json`.
- **edit**: `src/components/landing/hero-section.tsx` (1 import + 1 linha JSX).

Sem alterações em: copy, i18n, CTA, onboarding, análise, pricing, /analyze, /admin, mobile nav, locked files.
