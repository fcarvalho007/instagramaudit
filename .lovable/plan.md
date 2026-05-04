
## Plan — Block 1: 11 Safe Token Swaps

### File 1: `report-post-comparison.tsx` (8 swaps)

**"Melhores 2" group header (line 52-54):**
- `bg-sky-50/50` → `bg-tint-primary`
- `text-sky-700` → `text-accent-primary`
- `border-sky-200/50` → `border-border-subtle`

**"A melhorar" group header (line 63-65):**
- `bg-slate-100/60` → `bg-tint-warning`
- `text-slate-500` → `text-signal-warning`
- `border-slate-200/60` → `border-border-subtle`

**Rank chip classes (lines 157-159):**
- best: `bg-sky-50 text-sky-700 border-sky-200/50` → `bg-tint-primary text-accent-primary border-border-subtle`
- worst: `bg-slate-100 text-slate-500 border-slate-200/60` → `bg-tint-warning text-signal-warning border-border-subtle`

**Placeholder thumbnail gradient (line 174):**
- `bg-gradient-to-br from-slate-200 to-slate-300` → `bg-surface-muted`

### File 2: `frequency-card.tsx` (2 swaps)

- Line 128: `bg-emerald-500` → `bg-signal-success` (active day dots)
- Line 138: `bg-emerald-500` → `bg-signal-success` (legend dot)

### File 3: `comparison-header.tsx` (1 swap)

- Line 15: outer custom shadow `shadow-[0_1px_3px_rgba(59,130,246,0.06),0_8px_24px_-12px_rgba(59,130,246,0.10)]` → `shadow-card`
- The decorative gradient, CTA button classes, PRO badge gold, and hover shadows remain untouched.

### Not changed
- No global tokens, styles.css, tokens.css, tokens-light.css
- No Block 2 files, backend, adapter, admin, locked files
- SVG hex values, FORMAT_STYLE map, PRO badge, CTA button, decorative gradient, hover shadows all preserved

### Validation
- `bunx tsc --noEmit`
- `bunx vitest run`
