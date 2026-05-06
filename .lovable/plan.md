
## Visual QA — P01 and P02 Chart Treatments

### Findings

**P01 — Content type distribution (vertical-list variant)**

Desktop (1280px):
- Dominant bar visually distinct (h-3 vs h-1.5, full opacity vs 30%)
- Percentages aligned right in mono font, legible
- Labels readable, no overlap
- Sublabels not visible in "misto" variant (correct — sublabels only passed in the focused variant via `CONTENT_TYPE_SUBLABELS`)

Mobile (375px):
- **Issue found**: Labels truncate at 375px — "Prova social" becomes "Prova soc...", "Promocional" becomes "Promocio..." because `min-w-[4.5rem]` (72px) is too narrow for these labels. The flex layout gives too much space to the bar track vs the label.

**P02 — Funnel stack**

Desktop (1280px):
- Active bar (TOPO) has green tint + ring — visually clear
- Bars use `minWidth: fit-content` preventing label crop
- Percentages aligned right, no overlap
- 8% bars are small but intentional

Mobile (375px):
- Labels and percentages do not overlap
- 0% row not present in this data, but code uses dashed border treatment — intentional
- Active/ring treatment: only the dominant stage gets `active` (passed explicitly), not all >=25%. This is correct per the code in `report-diagnostic-block.tsx` line 333.
- No issues found

### Refinement

One CSS-only change in `report-diagnostic-card.tsx`:

**P01 vertical-list**: Increase mobile label min-width from `min-w-[4.5rem]` to `min-w-[5.5rem]` (88px) to prevent truncation of "Prova social" and "Promocional" at 375px. This still leaves sufficient space for the bar track.

### Scope

- Only file touched: `src/components/report-redesign/v2/report-diagnostic-card.tsx`
- Only CSS class change, no data logic
- P03-P07, backend, tokens, locked files untouched
- Will run `bunx tsc --noEmit` and `bunx vitest run` to validate
