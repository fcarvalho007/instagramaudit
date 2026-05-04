
# Visual refinement — EditorialIdentityCard

**Scope**: Single file — `src/components/report-redesign/v2/overview/editorial-identity-card.tsx`. Visual-only, no data/logic changes.

---

## Refinements

### 1. Card container
- Change `rounded-3xl` → `rounded-2xl` (consistent with rest of report).
- Use `bg-white` instead of `bg-surface-secondary` for premium white-card feel (matches Iconosquare report tokens).
- Refine shadow to `shadow-[0_1px_3px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.06)]` for depth without heaviness.

### 2. Band 1 — Editorial portrait
- Reduce gradient opacity slightly (0.45/0.3/0.25 → 0.35/0.22/0.18) for a more subtle wash.
- Reduce ring from `size={120}` → `size={100}` so headline dominates.
- Bump headline to `text-xl sm:text-[1.35rem] md:text-[1.5rem]` for stronger presence.
- Chip styling: add `shadow-[0_1px_2px_rgba(0,0,0,0.04)]` for subtle lift.

### 3. Band 2 — Score grid
- Add `bg-surface-muted/30` tint to the strip for visual separation from Band 1.
- Fix border logic — currently has conflicting `border-r-0 md:border-r` on idx=1; simplify to a clean pattern.
- For the "Clareza da Mensagem" qualitative column: add a subtle `bg-surface-muted/40` background and an italic style on the headline text to visually distinguish it from numeric columns.
- Add `border-border-subtle` (thinner) for internal dividers instead of `border-border-default`.

### 4. Band 3 — Action summary
- Change `bg-surface-primary/30` → `bg-slate-50/60` for a visible but calm tinted strip.
- CTA: soften from `bg-accent-primary` → outlined style: `border-2 border-accent-primary text-accent-primary bg-transparent hover:bg-accent-primary hover:text-white` — less aggressive, more editorial.
- Increase icon badge size to `size-9` for better visual balance.

### 5. Typography compliance
- Already uses `font-display` for headline and `font-mono` for scores — verify no regressions.
- Ensure "de 100" label under ring uses `font-sans` (not mono).

### 6. Mobile (375px)
- No structural changes needed — already `grid-cols-2` on mobile, stacks on sm.
- Verify ring at 100px doesn't overflow.
- CTA full-width on mobile for better tap target.

---

## Files changed
1. `src/components/report-redesign/v2/overview/editorial-identity-card.tsx`

## Hardcoded decorative values (to document)
- Band 1 gradient: `rgba(219,234,254,*)`, `rgba(221,214,254,*)`, `rgba(209,250,229,*)` (blue→violet→green pastel)
- Band 3 bg: `bg-slate-50/60`
- Card shadow: custom rgba values

## Validation
- `bunx tsc --noEmit`
- `bunx vitest run`
- Confirm no data logic changes
- Mobile 375px QA
