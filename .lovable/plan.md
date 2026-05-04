
## QA Report: P03 Hashtags Full-Width Redesign

### Results by checklist item

| # | Check | Result |
|---|-------|--------|
| 1 | P03 fills full width of Group B | **PASS** — `span="full"` → `md:col-span-2` in `md:grid-cols-2` parent grid |
| 2 | No empty grey space on right | **PASS** — card spans both columns |
| 3 | Left column has elegant hashtag cloud | **PASS** — flex-wrap chips with visual hierarchy (dominant/top/rest sizing) |
| 4 | Right column has readable frequency chart | **MARGINAL** — layout is correct but secondary bars are nearly invisible (see fix below) |
| 5 | Exact hashtag counts displayed | **PASS** — `{it.weight}×` with mono font |
| 6 | Bars proportional to real counts | **PASS** — `(it.weight / max) * 100` percentage width |
| 7 | Equal counts = equal bar widths | **PASS** — same weight produces same percentage |
| 8 | Dominant hashtags visually stronger but not oversized | **PASS** — `font-display text-base` vs `text-xs` for rest |
| 9 | Iconosquare-inspired style | **PASS** — white card, subtle border, blue accent, generous spacing |
| 10 | Mobile 375px no overflow | **PASS** — `grid-cols-1` at small sizes, chips flex-wrap, truncate on labels |
| 11 | Accessible and readable | **MARGINAL** — secondary bars too faint |
| 12 | No other Block 2 cards changed | **PASS** — only `renderHashtagsCard()` was modified |

### One fix needed

**Secondary bar color too faint on light theme.**

`bg-content-tertiary/20` resolves to `#8A98B2` at 20% opacity on a `#F1F4F9` track background — barely visible contrast.

**Fix:** Change `bg-content-tertiary/20` to `bg-accent-primary/20` on the non-dominant bars. This gives a consistent blue family (dominant = solid accent, others = tinted accent) and adequate visibility on both themes.

Single line change in `renderHashtagsCard()` line 496:
```
- "h-full bg-content-tertiary/20"
+ "h-full bg-accent-primary/20"
```

### Scope

- **File to edit:** `src/components/report-redesign/v2/report-diagnostic-block.tsx` (1 line)
- **No data logic changes**
- **No other cards touched**

### Verdict: **PASS** (with one minor visual fix)
