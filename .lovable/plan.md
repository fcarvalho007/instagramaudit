
## Mobile Responsive QA — Report V2

### Analysis Summary

Inspected all target files across 320px–768px breakpoints. The layout is generally well-structured for mobile:
- Overview cards: `grid-cols-1 lg:grid-cols-3` — stacks correctly.
- Diagnostic cards: `grid-cols-1 md:grid-cols-2` — stacks correctly.
- Caption Intelligence: `grid-cols-1 md:grid-cols-2` inner grid, `grid-cols-1 sm:grid-cols-3` snapshot row — stacks correctly.
- Container padding: `px-5` (20px) meets 16px minimum.
- All source badges use `whitespace-nowrap` and `shrink-0` — no awkward wrapping.
- Chart tooltip already has responsive `max-w-[180px] sm:max-w-[220px]` and clamped X positioning.
- Block 02 reading order (verdict, Q01, Q02, Q03, Q05, Q04, Q06, Q07) is correct in the DOM.

### Issues Found (3)

**1. EngagementInfoTooltip overflow on narrow viewports**

File: `src/components/report-redesign/v2/report-overview-cards.tsx` (lines 243-268)

The tooltip uses `left-1/2 -translate-x-1/2` with `w-[260px]`. On 320px viewport (280px content area after padding), the tooltip can overflow left or right depending on where the info icon sits. The icon follows the title text "Taxa de envolvimento" which wraps unpredictably on narrow screens.

**Fix**: Change tooltip positioning from center-anchored to left-anchored on mobile, right-guarded. Replace `left-1/2 -translate-x-1/2` with `left-0 sm:left-1/2 sm:-translate-x-1/2` and add `max-w-[calc(100vw-3rem)]` to prevent viewport overflow on any screen size.

**2. Caption Intelligence theme items — confidence badge + role label crowding**

File: `src/components/report-redesign/v2/report-caption-intelligence.tsx` (lines 185-201)

Each theme item has 5 inline elements in a `flex-wrap` container: index number, label, post count, confidence badge, role label. On 320px these wrap into 2-3 lines which is acceptable, but the confidence badge and role label sit on the same wrap line and compete visually.

**Fix**: Wrap the confidence badge and role label into a sub-flex container that stays together, preventing them from splitting across wrap lines. This is a minimal CSS grouping change only.

**3. Diagnostic card vertical-list bar labels on narrow screens**

File: `src/components/report-redesign/v2/report-diagnostic-card.tsx` (line 237)

The `DiagnosticDistributionBar` vertical-list variant uses `w-24 sm:w-28` for labels. On 320px, after card padding (~48px), the available width is ~232px. With label (96px) + gap (12px) + value (40px) = 148px fixed, leaving only ~84px for the bar. This is tight but functional. However, long Portuguese labels like "Notoriedade · marca pessoal" will be `truncate`d aggressively.

**Fix**: Reduce the fixed label width on very small screens: change `w-24 sm:w-28` to `w-20 sm:w-28` to give the bar more breathing room at 320px while keeping the current size from 640px up.

### Files to Change

1. `src/components/report-redesign/v2/report-overview-cards.tsx` — tooltip positioning
2. `src/components/report-redesign/v2/report-caption-intelligence.tsx` — theme badge grouping
3. `src/components/report-redesign/v2/report-diagnostic-card.tsx` — bar label width

### What Will NOT Change

- No calculations, data sources, AI logic, copy, or backend changes
- No locked files
- Desktop layout remains identical
- Container width stays at `max-w-[1380px]`
- Block 02 order stays: verdict → A(Q01) → B(Q02+Q03) → C(Q05) → Q04 → D(Q06+Q07)

### Validation

- `bunx tsc --noEmit`
- `bunx vitest run`
