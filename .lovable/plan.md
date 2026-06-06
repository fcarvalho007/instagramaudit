# Frequência de publicação — section redesign

## Why the section looks cramped today

`src/components/report-redesign/v2/overview/frequency-card.tsx` is one card with five vertical stripes: header → KPI strip → weekly rhythm → 30-day calendar → insight callout. Two layout decisions cause the "cut" feeling on desktop:

- The calendar block hard-caps itself at `max-w-[360px]` (lines 629 + 643), so on a full-width card the 30 cells crowd into the left third while the right two thirds sit empty.
- Weekly Rhythm already has its own framed sub-card; the calendar has none, so it visually orphans below the rhythm block instead of feeling part of the same composition.

Eyebrow ("CALENDÁRIO · 30 DIAS"), published-days line, and legend are also stacked into a thin column that wastes the horizontal room.

## Files involved

Only this section's component:

- `src/components/report-redesign/v2/overview/frequency-card.tsx`

No changes to data, scoring, copy strings, or other report code.

## Plan

### 1. Two-column "rhythm + calendar" composition on desktop

Wrap the existing `WeeklyRhythm` sub-component and the new framed calendar in a single `md:grid md:grid-cols-5 md:gap-5` row inside the card:

- Left column (`md:col-span-2`) — `WeeklyRhythm` (already framed). No internal change.
- Right column (`md:col-span-3`) — new `MonthCalendar` sub-block, also framed (`rounded-xl border border-border-default bg-surface-muted/60 p-4 md:p-5`), so the two halves read as siblings.

Mobile (`< md`): stays stacked, calendar full width — no `max-w-[360px]` cap.

### 2. Calendar header refactor

Replace the current vertical stack (eyebrow, count, grid, legend stacked) with a 2-row header inside the framed sub-card:

```
CALENDÁRIO · 30 DIAS                       [ legend chips → ]
22 dias com publicação · 8 em pausa
```

- Row 1: `text-eyebrow-sm` on the left, legend chips (`sem post · 1 post · 2 posts`) on the right.
- Row 2: published / paused summary on a single line (combines the existing `frequency.calendar.published_*` line with the already-computed `pausedCount`; if combining is risky, keep two stacked lines but inline-flex them, no copy change).

### 3. Calendar grid — full width and larger cells

- Remove both `max-w-[360px]` wrappers.
- Keep `grid-cols-7` + `aspect-square`; cells become naturally larger (~36–44px desktop) because the column is now wider.
- Bump the cell radius from `rounded-[5px]` → `rounded-md` and the gap from `gap-[3px]` → `gap-1.5` (≈6px) to breathe.
- Weekday header row: same gap, font kept at `text-[11px]` but uppercase tracking added for editorial feel — `text-eyebrow-sm` token aligned with the rest of the report.
- Multi-post number stays in white at `text-[11px]` (one notch up from `text-[9px]` now that cells are bigger).

### 4. Legend treatment

- Use the same legend chips already rendered, but reposition into the calendar's header row on desktop and below the grid on mobile. Keep the existing 3-state set, copy unchanged.

### 5. Spacing rhythm of the whole card

- Header zone (title + subtitle): unchanged.
- `mt-5` → `mt-6` between KPI strip and the new rhythm/calendar row.
- `mt-5` → `mt-6` before the insight callout, with `mx-5 md:mx-6 mb-6` so it feels deliberately framed at the card foot.

### 6. Title + qualifier polish

`Frequência de publicação Alta` already routes through the shared `ReportCardSectionHeader` (just standardized). Two tiny tweaks scoped to this card:

- Add `pb-1` to the header wrapper so the subtitle has more air before the KPI strip.
- Keep the green underline on "Alta" — already correct after the previous standardization pass.

## Out of scope

- No data-logic changes (cell color logic, `cellStyle`, `buildWeekGrid`, scoring, week aggregation).
- No copy edits beyond rearranging the existing translated strings into new layout slots.
- No changes to the KPI strip internals.
- No changes to other report sections.

## Deliverables

1. One edited file (`frequency-card.tsx`) with the rhythm + calendar two-column layout, removed width cap, new framed calendar block, repositioned legend, and tightened spacing rhythm.
2. Summary of the layout improvements applied, plus a desktop+mobile visual check in `/analyze/$username` via the preview tools.
