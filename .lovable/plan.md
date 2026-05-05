
# Block 1 Visual Consistency Pass

After reviewing all 6 Block 1 components + the overview block, here is the assessment and planned fixes.

## Current State Assessment

The components are already in good shape. Most use `font-display` for headlines, semantic tokens for signals, and consistent card patterns. A few minor inconsistencies remain:

### Issues Found

1. **Editorial Identity Card** — already clean; no chips, no "Retrato editorial" label. No changes needed.

2. **Engagement Card** (`report-overview-engagement.tsx`)
   - The header icon container uses `bg-tint-primary text-accent-primary` which is correct.
   - Minor: the header uses a nested `<em>` for "Engagement" italic — harmless but could be simplified. **No change needed** (consistent with design intent).

3. **Frequency Card** — headline uses `font-display`, consistent sizing. Calendar legend is clean. **No changes needed.**

4. **Format Card** — headline uses `font-display`, consistent sizing. Thumbnail grid is clean. **No changes needed.**

5. **Post Comparison** — headline uses `font-display`, section is boxed in a card, engagement % visible on each post. **No changes needed.**

6. **Benchmark Chart** — uses documented decorative RGBA values with comments. Clean. **No changes needed.**

7. **Overview Block spacing** (`report-overview-block.tsx`) — uses `space-y-8 md:space-y-10` which is consistent. **No changes needed.**

### Conclusion

All Block 1 components are already visually consistent:
- All major headlines use `font-display` (Fraunces)
- All eyebrows use `text-eyebrow-sm` (Inter uppercase)
- Numeric values use `font-mono tabular-nums`
- All sections sit inside white cards with `border-border-default bg-surface-secondary shadow-card` (or custom card for editorial identity)
- No glow effects
- Semantic tokens used throughout (`text-content-primary`, `text-signal-danger`, etc.)
- Local decorative RGBA values are documented in file-level JSDoc comments

### Remaining Local Hardcoded Decorative Values

These are intentional and documented in each file's JSDoc header:
- **Engagement Card**: KPI accent colours (rose/blue/emerald RGBA at 0.03–0.70 opacity), reading box accents
- **Benchmark Chart**: Active row border/bg/hatch/bar/pill colours (danger + success variants)
- **Frequency Card**: Calendar cell backgrounds (slate 0.04, emerald 0.45/0.70/1.00)
- **Format Card**: Format legend dots (Tailwind colour classes: emerald-300, sky-300, amber-300)
- **Post Comparison**: VS bar gradient (blue/amber at 0.04)
- **Editorial Identity Card**: Band 1 gradient background (blue/purple/green at low opacity)

All of these are local decorative values that don't map to semantic tokens — they represent data-driven accent colours specific to each card's context.

## Recommendation

**No code changes are needed.** The components pass all consistency checks. I recommend running the validation commands (tsc + vitest) to confirm nothing is broken, then proceeding to Block 2.

If you'd like me to proceed anyway with any specific tweaks (e.g. extracting decorative RGBA values into CSS custom properties, adjusting spacing), let me know.
