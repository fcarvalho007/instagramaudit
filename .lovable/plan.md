## Problem

Block 1's engagement card title uses:
```
font-display text-[1.5rem] md:text-[2rem] font-semibold tracking-tight text-content-primary leading-tight
```

P03 and P04 card titles are missing `font-semibold` and use slightly different tracking/leading:
```
font-display text-[1.5rem] md:text-[2rem] leading-[1.05] tracking-[-0.02em] text-content-primary mt-5
```

The missing `font-semibold` makes them appear lighter/weaker than Block 1.

## Changes

### 1. `src/components/report-redesign/v2/hashtag-diagnostics-card.tsx`
- Add `font-semibold` to the `<h3>` title (line 241)
- Align `tracking` and `leading` to match Block 1: `tracking-tight leading-tight`

### 2. `src/components/report-redesign/v2/caption-diagnostics-card.tsx`
- Add `font-semibold` to the `<h3>` title (line 484)
- Align `tracking` and `leading` to match Block 1: `tracking-tight leading-tight`

Final class for both:
```
font-display text-[1.5rem] md:text-[2rem] font-semibold tracking-tight text-content-primary leading-tight mt-5
```

## Scope
- Only P03 and P04 card title `<h3>` elements
- No data logic, backend, auth, admin, PDF, token, or locked file changes

## Validation
- `bunx tsc --noEmit`
- `bunx vitest run`
