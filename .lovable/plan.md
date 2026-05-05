
# P04 Caption Diagnostics — Polish Pass

## File: `src/components/report-redesign/v2/caption-diagnostics-card.tsx`

No other files touched.

### 1. Remove unused imports (line 13-14)

Remove `CaptionEndingDistribution` and `CaptionOpeningDistribution` from the type import. Keep `CaptionIntelligence` and `CaptionLengthDistribution` (used by `StackedLengthBar`).

### 2. Replace hardcoded colors with semantic tokens

| Line | Current | Replacement |
|------|---------|-------------|
| 178 | `bg-rose-400` | `bg-signal-danger` |
| 378 | `text-rose-600 font-medium` | `text-signal-danger font-medium` |
| 402 | `bg-violet-50/60 ring-1 ring-violet-200/40` | `bg-[rgb(var(--tint-primary))] ring-1 ring-accent-primary/20` |
| 403 | `text-violet-700` | `text-accent-primary` |
| 407 | `border-violet-200/30` | `border-accent-primary/20` |
| 415 | `text-rose-500` | `text-signal-danger` |
| 482 | `text-violet-600 border border-violet-200 ... bg-violet-50` | `text-accent-primary border border-accent-primary/20 ... bg-[rgb(var(--tint-primary))]` |

### 3. Typography check

The diagnostic statement (line 404) already uses `font-medium` (Inter/sans) — no `font-display`. No change needed.

### 4. Data logic

Zero changes to any data functions, copy text, or computation logic.

### 5. Validation

Run `bunx tsc --noEmit` and `bunx vitest run` to confirm no regressions.
