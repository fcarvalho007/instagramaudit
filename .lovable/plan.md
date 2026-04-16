

## Plan: Button polish (3 surgical fixes)

### Files to modify
1. `src/components/ui/button.tsx` — explicit permission granted for these polish items
2. `src/routes/index.tsx` — showcase layout adjustments

### Fix 1 — Ghost variant
In the `ghost` variant cva entry:
- Add resting border: `border border-border-subtle`
- Change resting text from `text-content-secondary` → `text-content-primary`
- Keep hover (`hover:bg-surface-elevated/50 hover:text-content-primary`) as-is
- Add active inset shadow for tactile press feedback: `active:shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)]`

Result: ghost reads as "quiet but clearly a button", not "muted text".

### Fix 2 — Icon-only default variant
Currently `size: "icon"` inherits whatever variant defaults are set (primary cyan when none passed). Change behavior so `size="icon"` alone resolves to `variant="ghost"`, while explicit variant still wins.

Approach inside the `Button` forwardRef:
```ts
const resolvedVariant = variant ?? (size === "icon" ? "ghost" : "primary");
```
Then pass `resolvedVariant` to `buttonVariants({ variant: resolvedVariant, size })`. Remove `primary` from `defaultVariants.variant` (set to `undefined`) so the resolution logic above is the single source of truth — keeps `<Button>` (no props) still rendering as primary `md` via the fallback.

### Fix 3 — Showcase layout
In `src/routes/index.tsx`:
- Remove `<Button variant="link">Saber mais</Button>` from the "Button · Variants" row
- Update the icon example in "Button · Sizes" to drop the explicit `variant="secondary"` (so it demonstrates the new ghost default), and add a code-level comment showing how to force primary when intentional
- Add new section after "Button · States":
  ```
  Section title: "Button · Link"
  Content: a sentence in pt-PT with "tu" form —
    "Precisas de mais informação? <Button variant="link">Saber mais →</Button>"
  Wrapper text uses color: rgb(var(--text-secondary))
  ```
- Wrap the inline sentence in a `<p>` with `flex flex-wrap items-baseline gap-1` instead of the section's default `gap-4` so the link sits naturally inline with the text rather than as a separated chip

### Out of scope (untouched)
- `src/components/ui/badge.tsx`
- `src/styles/tokens.css`, `src/styles.css`, `src/routes/__root.tsx`
- All other Button variants, sizes, loading state, asChild logic

### Verification
After changes, render preview at `/` and visually confirm:
- Ghost button has visible thin border at rest, primary-color text
- Icon-only Check button is now subtle (ghost) instead of cyan
- Link variant appears inline within a Portuguese sentence on its own labeled row
- Default `<Button>` with no props still renders as primary cyan (regression check)

