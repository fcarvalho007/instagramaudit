# Mix de formatos — donut comparison redesign

Scope: `src/components/report-redesign/v2/competitor-format-compare.tsx` only. No new deps, no schema, no provider calls, no Free/Public changes, single-profile FormatCard untouched.

## 1. Layout

Inside the existing `CompareCardShell`, drop `CompareBarPair` and render a two-column donut block:

```text
┌─────────────────────────┬─────────────────────────┐
│   PRIMARY donut         │   COMPETITOR donut      │
│   @handle (azul)        │   @handle (indigo)      │
│   ● Reels   52 %        │   ● Reels   38 %        │
│   ● Carrosséis 30 %     │   ● Carrosséis 44 %     │
│   ● Imagens 18 %        │   ● Imagens 18 %        │
│   Centro: "Reels 52%"   │   Centro: "Carrosséis…" │
└─────────────────────────┴─────────────────────────┘
Footer insight (deterministic)
```

- Desktop: `grid-cols-2 gap-8`.
- Mobile (<sm): `grid-cols-1 gap-6`, donuts stacked. Donut size `w-40 h-40` desktop / `w-36 h-36` mobile.
- No secondary paired bars — the legend rows already carry the per-format %.

## 2. Donut implementation (pure SVG, no library)

`<Donut entries={[{key,label,share,colorVar}]} dominant={…} accent="primary"|"competitor" />`:

- 160×160 viewBox, `r=70`, `strokeWidth=22`, `cx=cy=80`.
- One `<circle>` per slice using `stroke-dasharray` + `stroke-dashoffset`, starting at -90°.
- Track ring underneath at `--border-default` alpha for empty/total guidance.
- Centre `<text>`: dominant label (Inter SemiBold) + share % (tabular-nums) on two lines via `<tspan dy>`.
- Rounded caps, 1px gap via 2° gap per slice (subtract from dasharray).

## 3. Palettes (tokens only, no hardcoded hex)

Primary (azul-led):
- Reels → `--accent-primary` (#3772E5)
- Carrosséis → `color-mix(in oklab, var(--accent-primary) 65%, white)`
- Imagens → `color-mix(in oklab, var(--accent-primary) 35%, white)`

Competitor (indigo-led):
- Reels → `--accent-secondary` (#7664E4)
- Carrosséis → `color-mix(... secondary 65% ...)`
- Imagens → `color-mix(... secondary 35% ...)`

Slice colour is by **format key**, shade family by side, so legends read consistently.

## 4. Legend rows

Below each donut: vertical list of 3 rows, each `● <swatch> Label … 00 %` (Inter, tabular-nums). Grey out (text-content-tertiary) rows with share = 0.

## 5. Centre label

Dominant = entry with max share. Render:
- line 1: label (text-sm, content-secondary)
- line 2: `fmtPct(share)` (text-xl Inter SemiBold, tabular-nums, side-tinted)

If two formats are tied within 1pp → show `"Misto"` + total of the two (avoid false dominance).

## 6. Deterministic footer insight

Replace `buildFormatInsight` with `buildDonutInsight(primaryEntries, competitorEntries)`:

1. **Sample-too-small guard**: if `competitor.windowAligned === false` OR sum on either side < 90 (rounding tolerance) → return `null`.
2. Compute **HHI** per side: `sum(share²)/10000` (range 0–1).
   - concentrated if HHI ≥ 0.55 (≈ one format > 70%).
   - diversified if HHI ≤ 0.40.
3. Cases (first match wins, EU-PT):
   - Both concentrated, different dominants → "Ambos concentram-se num formato distinto: tu em **Reels**, o concorrente em **Carrosséis**."
   - Primary concentrated, competitor diversified → "Estás concentrado em **{X}** ({n}%); o concorrente distribui-se mais entre formatos."
   - Competitor concentrated, primary diversified → "O concorrente aposta sobretudo em **{X}** ({n}%); a tua presença é mais equilibrada."
   - Both diversified → "Ambos mantêm um mix equilibrado entre Reels, Carrosséis e Imagens."
   - Same dominant, gap ≥ 10pp → existing "investe mais em …" line (kept).
   - Otherwise → `null` (não inventar padrão).

## 7. Accessibility / polish

- Each donut wrapped in `<div role="img" aria-label="Mix de formatos de @handle: Reels 52%, Carrosséis 30%, Imagens 18%.">`.
- Numbers: `Intl.NumberFormat("pt-PT", { maximumFractionDigits: 1 })`.
- No font-mono. Inter SemiBold + tabular-nums per public-UI rule.

## 8. Validation

- `/admin/report-preview/nunomarkl?variant=pro_preview&draft=false` → twin donuts render, centre label correct, legend % matches old paired bars.
- 375px → donuts stack, no horizontal scroll.
- Force competitor `formatStats = {}` → component returns `null` (parent falls back to single-profile FormatCard, current behaviour).
- HHI guard: when competitor sample is tiny (`windowAligned=false`), footer hides instead of overclaiming.
