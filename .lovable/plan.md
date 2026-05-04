
# Migrate Block 1 to semantic design tokens

## Token audit

| Class | Exists? | Light-mode value | Usage |
|---|---|---|---|
| `text-content-primary` | Yes | #0F1B3D | Headings, main values |
| `text-content-secondary` | Yes | #5A6B8C | Labels, descriptions |
| `text-content-tertiary` | Yes | #8A98B2 | Hints, dates, tertiary |
| `bg-surface-secondary` | Yes | #FFFFFF | Card backgrounds |
| `bg-surface-base` | Yes | #FAFBFD | Page background |
| `bg-surface-muted` | Yes | #F1F4F9 | Track/chart bg |
| `border-border-default` | Yes | navy@0.12 | Card borders |
| `border-border-subtle` | Yes | navy@0.10 | Hairline borders |
| `text-accent-primary` | Yes | #2563D9 | Action blue |
| `bg-tint-primary` | Yes | ~#EFF4FB | Soft blue tint bg |
| `bg-tint-success` | Yes | ~#EFF8F4 | Soft success bg |
| `bg-tint-danger` | Yes | ~#FBEFEF | Soft danger bg |
| `text-signal-success` | Yes | #1D9E75 | Positive values |
| `text-signal-warning` | Yes | #BA7517 | Warning values |
| `text-signal-danger` | Yes | #A32D2D | Negative values |
| `shadow-card` | Yes | Soft navy shadow | Card elevation |

All needed tokens exist. No new tokens required.

## Files to edit (8 files, Block 1 only)

### 1. `score-card.tsx`
- `border-slate-200` → `border-border-default`
- `text-slate-900` → `text-content-primary`
- `text-slate-500` → `text-content-secondary`
- `text-slate-300/400` → `text-content-tertiary`
- `focus-visible:ring-blue-400` → `focus-visible:ring-accent-primary`
- Custom shadow → `shadow-card` + hover variant kept

### 2. `frequency-card.tsx`
- Card wrapper: `border-slate-200/70 bg-white` + custom shadow → `bg-surface-secondary border-border-default shadow-card`
- `text-slate-900` → `text-content-primary`
- `text-slate-500` → `text-content-secondary`
- `text-slate-400` → `text-content-tertiary`
- `bg-emerald-500` (calendar dot) → `bg-signal-success` (keep as chart accent — no exact token, use `bg-[rgb(var(--signal-success))]`)
- `bg-slate-200` (inactive dot) → `bg-surface-muted`
- Emerald insight box (`bg-emerald-50 border-emerald-100 text-emerald-600/900`) → `bg-tint-success border-border-subtle text-signal-success / text-content-primary`

### 3. `format-card.tsx`
- Same card wrapper migration as frequency-card
- Text colours: same slate→content-* replacements
- Format icon tints (sky/emerald/amber) — keep as chart accents; these are semantic per-format, not generic. Mark as follow-up.

### 4. `report-overview-engagement.tsx`
- Card: `border-slate-200/70 bg-white` + custom shadow → `bg-surface-secondary border-border-default shadow-card`
- `text-slate-900` → `text-content-primary`
- `text-slate-500` → `text-content-secondary`
- `text-slate-400` → `text-content-tertiary`
- `bg-blue-50 text-blue-500` (icon badge) → `bg-tint-primary text-accent-primary`
- `bg-slate-50 border-slate-100` (pill) → `bg-surface-muted border-border-subtle`
- `text-emerald-600` / `bg-emerald-50` → `text-signal-success` / `bg-tint-success`
- `text-rose-600` / `bg-rose-50` → `text-signal-danger` / `bg-tint-danger`

### 5. `report-engagement-benchmark-chart.tsx`
- `text-slate-600/500/400/300` → `text-content-secondary` / `text-content-tertiary`
- `text-slate-800/700` → `text-content-primary`
- `border-slate-100` → `border-border-subtle`
- `bg-white/95` (tooltip) → `bg-surface-secondary/95`
- `ring-slate-200/80` → keep (tooltip ring, minor)
- `text-emerald-600` → `text-signal-success`
- `text-rose-600` → `text-signal-danger`
- `hover:text-blue-600` → `hover:text-accent-primary`
- Chart SVG gradients (blue/rose/slate hex) — keep current hex in SVG defs, mark as follow-up for CSS variable migration

### 6. `comparison-header.tsx`
- `text-slate-900` → `text-content-primary`
- `text-slate-500` → `text-content-secondary`
- `bg-slate-900 text-white hover:bg-slate-800` (CTA button) — keep as intentional dark button styling
- `bg-amber-400/20 text-amber-600` (PRO badge) — keep as gold-island styling per design rules
- Blue gradient border/bg — keep as intentional branded accent for competitor CTA

### 7. `report-post-comparison.tsx`
- `text-slate-900` → `text-content-primary`
- `text-slate-500` → `text-content-secondary`
- `text-slate-400` → `text-content-tertiary`
- `text-slate-800` → `text-content-primary`
- `border-slate-200/70 bg-white` → `bg-surface-secondary border-border-default`
- Custom shadow → `shadow-card`
- `border-slate-100` (metric divider) → `border-border-subtle`
- `bg-slate-100` (thumbnail placeholder) → `bg-surface-muted`
- `bg-slate-200 to-slate-300` (gradient placeholder) → keep temporarily (visual placeholder)
- `bg-white/90` (format chip) → `bg-surface-secondary/90`
- sky-* and slate-* accent tints for best/worst groups — these are semantic comparison accents, keep for now with note

### 8. `report-overview-block.tsx`
- No hardcoded colours found. No changes needed.

## What stays hardcoded (follow-up)
- Format icon tints (sky/emerald/amber per format) in format-card — semantic chart colours, need dedicated tokens
- Sky/slate accent tints for best/worst comparison groups in post-comparison — need `--tint-info` / `--tint-neutral` tokens
- SVG gradient defs in benchmark chart (hex in SVG `<stop>` elements)
- Comparison-header branded gradient and dark CTA button (intentional design choice)

## Validation
- `bunx tsc --noEmit`
- `bunx vitest run`
- Visual QA at desktop, tablet, 375px mobile
