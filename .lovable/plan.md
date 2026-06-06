# Redesign: Formato (Format) section — premium proportion bar

**Scope:** `src/components/report-redesign/v2/overview/format-card.tsx` only. No data, calculation, i18n key, or report-generation changes.

## What changes visually

### 1. Header (refinement only)
- Keep `ReportCardSectionHeader` with title `Formato` + qualifier `Pouco variado`.
- Refine subtitle so the lead line reads cleanly: e.g. *"10 em cada 12 publicações são carrosséis"* (driven from existing `format.subtitle.leader` i18n — no new keys; relies on current values).
- Keep tone/typography from the design system (Fraunces title, Inter body, tabular nums).

### 2. Hero visual — new `FormatProportionBar` (replaces donut)
Replace the current `FormatBreakdown` (donut + 3-row legend block) with a single full-width horizontal proportion bar:

```text
┌──────────────────────────────────────────────────┬─────────────┐
│ 83%                                              │ 17%         │
│ Carrosséis · 10                                  │ Reels · 2   │
└──────────────────────────────────────────────────┴─────────────┘
```

- Height ~64px, `rounded-xl`, no inner gap (cinematic single bar).
- Dominant segment: deep `--accent-primary` (#3772E5) background, white foreground.
- Secondary segment(s): lighter tint of the same accent (`color-mix(...)` on accent at ~22%) with `--content-primary` text — keeps to the global blue accent system.
- Zero-count formats (Imagens 0) are **not rendered as a segment** — only appear in the legend below.
- Inside each segment: large `text-[1.75rem]` semibold percentage on top line, small `text-xs` `Formato · count` label below. Inter SemiBold + tabular-nums.
- Segments below ~10% width collapse the inline label to a tooltip and keep only the % (graceful overflow).
- Segments are computed from the same normalized `rounded[]` percentages already used by `FormatBreakdown` (no math change).
- Full `role="img"` + `aria-label` reused from the existing `format.aria_breakdown` i18n.

### 3. Legend (subtle, beneath the bar)
- Single row, inline, separated by `·`:
  `■ Carrosséis 10   ■ Reels 2   ■ Imagens 0`
- Inter `text-xs`, `text-content-tertiary`; dot uses the same color as its bar segment; zero-count item dimmed.
- Wraps cleanly on mobile.

### 4. Thumbnails — single elegant filmstrip
Replace the current responsive grid with a horizontal filmstrip:

- One row, `flex gap-2`, `overflow-x-auto`, `snap-x snap-mandatory`, hidden scrollbar.
- Thumbnail size: `h-16 w-16 md:h-20 md:w-20` (down from ~96px). `rounded-lg`, `border-border-default/60`.
- Keep the existing small format-dot indicator (bottom-right) at reduced size.
- Right-edge subtle fade mask (`mask-image: linear-gradient(...)`) to indicate overflow on desktop.
- On very wide content, limit to first 12 items and append a `+N` chip tile when overflowing.
- Wrapper loses the framed muted-card chrome — sits directly on the card surface with just an eyebrow line `text-eyebrow-sm` reading the existing `format.analyzed_count` label. No duplicated legend here (legend lives once, under the bar).

### 5. Insight box (calmer)
- Keep `InsightCallout` but drop visual weight: lighter padding, no background tint (use `tone="neutral"` styling or pass `className` to override), kept content unchanged (`verdict.strong` + `verdict.rest`).
- Decision: keep `InsightCallout` component for tone semantics; reduce only margins/padding/background via existing className prop. (No component API change.)

### 6. Untouched
- `ExternalReferenceTable`, `ExternalSourceNote`, `socialinsiderRef` block — left intact below.
- All exported helpers (`computeExternalReading`, `getFormatHeadline*`, `getFormatVariationStatus`, `getFormatVerdict`, `toDominantKey`) — unchanged (tests stay green).
- All i18n keys reused; no new strings added.
- `FormatCardProps`, types, data flow — unchanged.

## Technical notes

- New internal component `FormatProportionBar({ formats, t })` defined in same file, replaces the `<FormatBreakdown />` call site on line 309.
- `FormatBreakdown` function is **removed** (not exported, no external consumers — verified by ripgrep: only one call site in this file).
- Bar segment widths use the existing rounded-to-100 percentages so the bar always sums to 100%.
- Color tokens only (no slate-*, no hardcoded hex outside the existing `FORMAT_HEX` map kept for the legend dots, or `color-mix(in oklab, var(--accent-primary) ...)` for tints).
- Mobile (< 480px): bar keeps full width; if the secondary segment label would clip, only the % is shown inside, label moves to legend.

## Validation checklist

- Desktop 1440/1920: bar dominant, thumbnails fit in one row with fade.
- Tablet 820: bar legible, thumbnails scroll horizontally.
- Mobile 375: bar legible, percentages readable, legend wraps to 2 lines if needed.
- aria-label preserved on hero visual.
- No data/calculation changes — same `formats[]`, same rounding, same totals.

## Deliverables

- 1 file changed: `src/components/report-redesign/v2/overview/format-card.tsx`.
- Confirm UI-only; no data/report logic changed.
