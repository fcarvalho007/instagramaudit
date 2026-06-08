# Plan — Editorial "Mix de formatos" comparison

Scope: presentation-only rewrite of `src/components/report-redesign/v2/competitor-format-compare.tsx`. No backend, no chart libraries, no provider calls, no adapter changes, no other components touched. Props contract and callsite unchanged.

## Visual structure

```text
┌────────────────────────────────────────────────────────────────┐
│ Mix de formatos                                                │
│ Distribuição de Reels, Carrosséis e Imagens                    │
│                                                                │
│ ┌──────────────────────────┐  ┌──────────────────────────┐     │
│ │ ● PERFIL                 │  │ ● CONCORRENTE            │     │
│ │ ◐ @handle                │  │ ◐ @handle                │     │
│ │                          │  │                          │     │
│ │      ╭───────╮           │  │      ╭───────╮           │     │
│ │    ╭─╯       ╰─╮         │  │    ╭─╯       ╰─╮         │     │
│ │    │   Reels  │          │  │    │  Carro.  │          │     │
│ │    │   62 %   │          │  │    │  48 %    │          │     │
│ │    ╰─╮       ╭─╯         │  │    ╰─╮       ╭─╯         │     │
│ │      ╰───────╯           │  │      ╰───────╯           │     │
│ │                          │  │                          │     │
│ │ N publicações na amostra │  │ N publicações na amostra │     │
│ │                          │  │                          │     │
│ │ ● Reels        62 %      │  │ ● Reels        24 %      │     │
│ │ ● Carrosséis   28 %      │  │ ● Carrosséis   48 %      │     │
│ │ ● Imagens      10 %      │  │ ● Imagens      28 %      │     │
│ └──────────────────────────┘  └──────────────────────────┘     │
│                                                                │
│ footer: deterministic insight                                  │
└────────────────────────────────────────────────────────────────┘
```

When competitor format stats are missing, the right panel becomes a single elegant empty state (same outer frame as the data panel, side accent bar in indigo) with the copy:

**"Sem dados de formatos disponíveis para o concorrente nesta amostra."**

## Behaviour

### 1. Data integrity (no misleading 0 %)
- Keep `competitorHasStats = competitor.hasFormatStats !== false`. When false → render `MissingSide` (right panel), never a 0 % donut.
- When `competitorHasStats === true` but a real category share is 0, render legend row as `—` instead of `0 %` to avoid implying precision; the donut still draws only positive slices (already does).

### 2. Side panels — framed and cinematic
- Each side wrapped in a `rounded-2xl border border-border-default/70 bg-white p-5 sm:p-6 relative overflow-hidden` panel with a 3 px side-tinted top bar (blue / indigo) — matches the hero panel language.
- Panel header: `● eyebrow (PERFIL / CONCORRENTE)` + avatar (size-10) + `@handle` row (single line, truncate).
- Below the donut: small chip `N publicações na amostra` using `competitor.postsAnalyzed` / `primary.postsAnalyzed` (passed via existing `formats` aggregate isn't enough — we need the primary `postsAnalyzed`). To avoid Props churn we'll derive primary total from `formats[].count` when available; for competitor we use `competitor.postsAnalyzed` (already on the entry).
- Legend: same 3 rows, larger swatches (size-3), bigger labels (`text-sm`), values tabular-nums semibold. Zero rows render as `—` and `text-content-tertiary`.

### 3. Donut redesign
- Size bump: `size-44 sm:size-48 md:size-52` (≈176/192/208 px). SVG `viewBox` updated; radius `r=78`, `strokeWidth=28` for a thicker, more visible ring.
- Gap between slices kept at 2°.
- Centre label: dominant `label` (smaller) + `share %` (Inter SemiBold, `text-2xl sm:text-3xl`, side-tinted). When dominant is "Misto" keep current behaviour.
- Hover/focus: no behaviour added (presentation only).

### 4. Palettes
- Primary family = blue (`--accent-primary`) with 65%/35% white mix steps (kept).
- Competitor family = indigo (`--accent-secondary`) with 65%/35% white mix steps (kept).
- Missing/zero segment = `border-default` neutral (already used as donut track).

### 5. Deterministic insight (kept, expanded)
- Reuse `buildDonutInsight`. Add a sample-too-small fallback: if either side total share < 90 → return `"Amostra demasiado pequena para uma leitura estável do mix de formatos."` instead of `null`, so the footer is never empty when both have data.
- All existing branches preserved (concentrated/distinct, concentrated/diversified, diversified/diversified, same-dominant gap ≥10pp).

### 6. Spacing
- Card body uses `grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6` — equal panels, less wasted space than before because the panel itself fills the column.
- Sample note line under each panel removes the awkward floating space currently below the donut.

### 7. Mobile (375px)
- Panels stack; donut size capped at `size-44` (176 px) on mobile to leave breathing room.
- Legend full-width; no horizontal overflow.

## Out of scope
- `CompareCardShell`, adapter, snapshot pipeline, provider/backend, schema, credits, Free/Public, other competitor cards.
- Not adding a chart library; SVG donut stays hand-rolled.

## Validation
- `nunomarkl` preview: primary donut clearly visible at large size with thick ring and side-tinted centre label; competitor side shows the elegant "Sem dados de formatos disponíveis para o concorrente nesta amostra." panel (since `hasFormatStats === false`).
- A profile with both sides populated: two strong donuts side by side, legends and chips rendered, deterministic insight in footer.
- No 0 % printed when a category is truly zero — rendered as `—`.
- 375px viewport: panels stack, no horizontal overflow, legend readable.
- Typecheck passes.
