
## Audit Results

### 1. File that renders P03 Hashtags

`src/components/report-redesign/v2/report-diagnostic-block.tsx` — function `renderHashtagsCard()` at line 437.

### 2. Current span

P03 does **not** set `span="full"` on `ReportDiagnosticCard`. It defaults to `span="half"`, which means it occupies 1 column in the parent `md:grid-cols-2` grid (set in `report-diagnostic-group.tsx` line 37). This creates the empty grey space on the right.

### 3. Can it safely become full-width?

Yes. Group B currently has only 2 children:
- `renderHashtagsCard(hashtags)` — the P03 card
- `<ReportCaptionIntelligence />` — the P04 card (already renders as its own full-width component)

Adding `span="full"` to P03 will make it `md:col-span-2`, filling the grid row. No other cards in Group B are affected.

### 4. Where hashtag counts come from

- `src/lib/report/text-extract.ts` → `extractTopHashtags()` aggregates `posts[].hashtags`, returns `HashtagRow[]` with `{ tag, uses, avgEngagement }`.
- `src/lib/report/block02-diagnostic.ts` → `classifyHashtags()` takes top 5, maps to `{ text: "#tag", weight: uses }`.
- The `weight` field is the raw occurrence count (number of posts containing that hashtag).

### 5. Displayed numbers

The `weight` values shown as `5×` are **real counts** (number of posts). The bars are scaled relative to the maximum (`pct = weight / max * 100`). This is correct — proportional bars based on real counts.

### 6. Bar value scale

Correct. `max = Math.max(1, ...weights)`, then each bar is `(weight / max) * 100` percent width. No issues.

### 7. Files to edit

**Only one file**: `src/components/report-redesign/v2/report-diagnostic-block.tsx` — the `renderHashtagsCard()` function (lines 437-476).

### 8. Risk level

**Very low.** Single function change within one file. No data logic changes. The `span="full"` mechanism already exists and is used by other cards (e.g. Q05 audience card at line 493).

---

## Implementation Plan

Edit only `renderHashtagsCard()` in `src/components/report-redesign/v2/report-diagnostic-block.tsx`.

### Changes

1. **Add `span="full"`** to the `ReportDiagnosticCard` component — makes P03 occupy the full grid width (`md:col-span-2`).

2. **Replace the card's children** with a two-column internal layout:

   **Left column — Hashtag cloud:**
   - Display top hashtags as styled tags/chips in a flowing `flex-wrap` layout.
   - Each chip: `#tag` text, subtle rounded pill, readable size.
   - Visually elegant, not a plain list.

   **Right column — Horizontal bar ranking:**
   - Keep the current bar chart structure (hashtag label + count + proportional bar).
   - Each row: hashtag text left, count right (`Nx`), proportional bar below.
   - Bars use `bg-accent-primary` as they do now.
   - Scale remains `weight / max * 100`.

3. **Layout**: `grid grid-cols-1 sm:grid-cols-2 gap-6` inside the card children area. Mobile: stacked. Desktop: side by side.

4. **No changes** to: `classifyHashtags()`, `extractTopHashtags()`, `HashtagsResult`, data flow, or any other card/function.

### Files untouched
- All other cards (P01, P02, P04-P07)
- `report-diagnostic-card.tsx` (already supports `span="full"`)
- `report-diagnostic-group.tsx` (grid already handles `col-span-2`)
- KPI cards, verdict, priorities, CTA
- Backend, adapter, global tokens, locked files
