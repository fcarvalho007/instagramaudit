## Diagnosis

Both regions share `max-w-[1520px]`, but horizontal padding differs:

- Top bar wrapper (`report-shell-v2.tsx` line 211): `w-full px-3 sm:px-6 pt-2 pb-2 sm:pt-3 sm:pb-3`
- Main content grid (line 242): `mx-auto max-w-[1520px] px-5 md:px-6 lg:px-8`

At `lg` viewports (≥1024px) the bar gets `24px` side padding while the content gets `32px`, so the bar visibly escapes the content rhythm. At `sm`/`md` they're already aligned; at mobile the bar is 8px narrower padding (12px vs 20px) which also looks slightly off-grid.

## Single-file change

`src/components/report-redesign/v2/report-shell-v2.tsx` — line 211 wrapper only.

Replace:
```tsx
<div className="w-full px-3 sm:px-6 pt-2 pb-2 sm:pt-3 sm:pb-3">
  <div className="mx-auto max-w-[1520px]">
```
with:
```tsx
<div className="w-full pt-3 pb-2 sm:pt-4 sm:pb-3">
  <div className="mx-auto max-w-[1520px] px-5 md:px-6 lg:px-8">
```

That moves the padding onto the inner max-width container so the bar shares the exact same horizontal rhythm as the content grid below (`px-5 md:px-6 lg:px-8`). A small `pt-3/sm:pt-4` bump gives the bar a touch more breathing room above without making it heavier.

## What is NOT changed

- `ReportHeroV2` internals (identity block, actions, buttons) — untouched.
- `AnalysisPeriodSelector` internals (period pills, "analysed period") — untouched.
- The bar's own card chrome (`rounded-xl sm:rounded-2xl border bg-white shadow-card`) — untouched.
- The sticky `ReportUtilityBar` (separate component) — untouched.
- All data, filter, period, PDF, share, unlock, payment, and report-generation logic — untouched.

## Validation checklist

- Desktop 1440/1920: outer edges of the top bar align pixel-perfect with the cards below.
- Tablet 820: padding matches (`md:px-6` both sides).
- Mobile 375: padding becomes `px-5` (20px), same as content; no horizontal overflow, no awkward wrap of buttons/pills.
- Sticky `ReportUtilityBar` keeps its own `max-w-[1520px] px-3 sm:px-6` (out of scope; its own different rhythm is intentional and not what the user is reporting).
- No regressions to PDF export, share popover, or period selection.
