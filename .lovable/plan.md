
# InstaBench Report — Premium Editorial Dashboard Mockup (PDF)

## What

A high-fidelity PDF (1440×900 landscape, A3-ish) recreating Page 1 of the `/analyze/$username` report with improved visual quality. This serves as a design spec you can reference or replicate in Figma.

## Design philosophy

**"Iconosquare Editorial"** — light, airy, strategic. White card surfaces on a near-white (#FAFBFD) page. One accent blue (#2563D9). Serif headlines (InstrumentSerif) for editorial warmth, WorkSans for body/labels/numbers (closest available to Inter), JetBrainsMono only for raw metric values. Generous padding (24–32px inside cards), consistent 16px border-radius, subtle 1px borders at 8% opacity, soft drop shadows.

## Page 1 structure preserved

1. **Profile hero card** — avatar circle, @handle (serif, 28px), platform pill, bio, follower/posts/following stats row
2. **Action row** — 3 small action cards (Comparar, Exportar PDF, Partilhar) with icons
3. **Left sidebar nav** — 6 section labels (Visão geral, Diagnóstico, Desempenho, Conteúdo, Referências, Mercado) with active indicator
4. **Section heading** — "Como está o perfil em geral?" in serif, large (32px)
5. **Editorial Identity Card** — global score ring + editorial sentence + strength/weakness chips
6. **Engagement card** — 3 KPI pills (taxa, benchmark, diferença) + horizontal benchmark bar chart + diagnostic reading box
7. **Two bottom cards** — Frequência de publicação (mini calendar heatmap + weekly rate) and Variedade de formatos (Reels/Carousels/Imagens breakdown)

## Improvements over current

- Headlines 30–40% larger, serif font for editorial tone
- Card internal padding: 24px minimum (was ~16–20px)
- Consistent 16px border-radius on all cards
- Metric numbers in WorkSans 600 weight at 24–28px (was 18–20px)
- KPI pills with tinted backgrounds and 2px left accent borders
- Chart labels at 12px minimum, axis ticks at 11px
- Section eyebrows: 11px uppercase tracking-wider WorkSans
- Generous 24px gaps between cards (was 16px)
- Subtle shadow (`0 1px 3px rgba(0,0,0,0.04)`) on all cards
- Diagnostic reading boxes with coloured left border (emerald/rose)
- Sidebar nav uses 13px WorkSans with a 3px blue left-border on active item

## Technical approach

Python script using `reportlab` to generate a pixel-precise PDF at 1440×900. Fonts: InstrumentSerif-Regular, WorkSans-Regular/Bold, JetBrainsMono-Regular copied from canvas-fonts. All text editable in the PDF (not rasterized). Geometric shapes for charts (rounded rects, circles for score ring). Real Portuguese copy from the codebase (not lorem ipsum).

## Output

- `/mnt/documents/instabench-report-v1-mockup.pdf` — the design spec
- `/mnt/documents/instabench-design-philosophy.md` — the design philosophy document

## QA

Convert each page to PNG, inspect for overlaps, clipped text, alignment issues, and colour consistency before delivering.
