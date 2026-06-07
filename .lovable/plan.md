# Fix — Competitor colour distinction (scoped, no global theme change)

## Root cause
In `src/styles/tokens-light.css`, `--accent-secondary: 0 119 182` is identical to `--accent-primary: 0 119 182` (both ocean blue). Compare components use `bg-accent-secondary` for the competitor dot, so primary and competitor render the same blue.

## Strategy
Introduce a **comparison-scoped** token + utility class. Do NOT touch `--accent-secondary` (used in chart-impressions, glass aurora, etc.).

## Changes

### 1. New token — `src/styles/tokens-light.css`
Add inside `:root, [data-theme="light"]`:
```css
--compare-competitor: 118 100 228;  /* #7664E4 soft indigo */
```

Mirror in `src/styles/tokens.css` (dark theme) with same RGB so the class works in both themes.

### 2. New utility — `src/styles.css`
```css
@utility bg-compare-competitor {
  background-color: rgb(var(--compare-competitor));
}
@utility text-compare-competitor {
  color: rgb(var(--compare-competitor));
}
@utility border-compare-competitor {
  border-color: rgb(var(--compare-competitor));
}
```
(only the variants actually used in compare components — likely just `bg-`).

### 3. Swap class in 5 files
Replace `bg-accent-secondary` → `bg-compare-competitor` in:
- `src/components/report-redesign/v2/compare/compare-stat-block.tsx` (1 hit, line 100)
- `src/components/report-redesign/v2/compare/compare-table.tsx` (2 hits, lines 122, 147)
- `src/components/report-redesign/v2/compare/compare-bar-pair.tsx` (2 hits, lines 113, 140) + update comment line 22
- `src/components/report-redesign/v2/competitor-engagement-compare.tsx` (1 hit, line 152)

Primary side keeps `bg-accent-primary` (blue). No changes to text labels, handles or layout — `@username` text already carries the meaning textually, so colour is redundant signalling (✓ a11y).

### 4. `competitor-overview-compare.tsx` & `competitor-cadence-compare.tsx` & `competitor-bio-compare.tsx`
No direct colour classes — they delegate to `CompareStatBlock`. Covered by step 3 swap. No edits.

## Out of scope (unchanged)
- `--accent-secondary` token, all chart series, glass aurora, AI insight boxes, sticky bars, buttons, checkout, landing, Free/Public report, `ReportCompetitors` legacy gauge, data, providers, schema, payments, credits, entitlements, Add Competitor flow.

## Validation checklist
1. Primary dots/bars = blue `#0077B6` (light) / `#3772E5` (dark).
2. Competitor dots/bars = indigo `#7664E4` in both themes.
3. Free/Public render path (`mode !== "all"` and `mode !== "locked"`) — no compare blocks render → no visual diff.
4. Report without competitor (`competitorBreakdown=[]`) — components return `null` → no visual diff.
5. Mobile 375px — pure colour swap, no layout impact.
6. Typecheck — only string class names changed, no type surface modified.
7. Grep `bg-compare-competitor` only inside `report-redesign/v2/compare/` and the 4 Phase 1 competitor components.
8. Each competitor pair already shows `@handle` as text next to the dot → colour is not the sole carrier.

## Deliverables in build mode
- Files changed: 2 token files, 1 styles file, 4 component files.
- Token used: `--compare-competitor: 118 100 228` → utility `bg-compare-competitor`.
- Confirmation `--accent-secondary` is unchanged (grep diff).
- Before: both sides ocean blue. After: primary ocean blue, competitor soft indigo.
