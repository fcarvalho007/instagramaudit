

## Plan: Atomic Components — Button + Badge

Build two production-grade atomic components that consume the locked design tokens. Then update governance and add a temporary showcase to verify rendering.

### Files to modify

1. **`/src/components/ui/button.tsx`** — full rewrite
2. **`/src/components/ui/badge.tsx`** — full rewrite
3. **`/src/routes/index.tsx`** — replace foundation test with temporary showcase of all variants
4. **`/LOCKED_FILES.md`** — add new section for atomic components
5. **`/src/styles/tokens.css`** — *NOT MODIFIED* (locked). Add the `badge-pulse` keyframe to `/src/styles.css` global layer instead — wait, that's also locked (`@theme inline` section). Solution: add the keyframe to a new file `/src/styles/animations.css` and import it from `/src/styles.css`. **Reconsidering:** importing a new file into `styles.css` modifies it. Cleaner: put the keyframe inside `tokens.css`? Also locked. **Final approach:** define the keyframe inline via Tailwind v4's `@theme` is not possible without touching locked files. Use Tailwind's arbitrary CSS via a `style` attribute on the dot element (inline `animation` property referencing a `@keyframes` declared in a NEW non-locked file `/src/components/ui/badge.tsx` adjacent CSS — not ideal). **Best clean solution:** declare the `@keyframes badge-pulse` inside `/src/styles/animations.css` (new file) and import it from `__root.tsx` — but `__root.tsx` is locked too.
6. **`/src/styles/animations.css`** (new) — keyframe definition, imported once. Since we can't modify locked files to import it, we'll inline the keyframe via a `<style>` tag inside the Badge component itself (rendered once at module level using a small style injection) — too hacky.

**Resolution:** The cleanest path that respects locks: define `@keyframes badge-pulse` inside the Badge component file using a single `<style>` tag rendered conditionally. This keeps everything self-contained and avoids touching any locked file.

### Component specs (summary)

**Button** — 7 variants (primary/secondary/ghost/outline/destructive/premium/link), 4 sizes (sm/md/lg/icon), `loading` (Loader2 spinner, text hidden but width reserved via opacity), `leftIcon`/`rightIcon`, `asChild` via Radix Slot, hover scale 1.02 / active 0.98, focus-visible cyan ring, full a11y (aria-busy, aria-disabled).

**Badge** — 7 variants (default/success/warning/danger/accent/premium/solid), 3 sizes (sm/md/lg), font-mono uppercase tracking-wide weight 500, `leftIcon` prop, `dot` boolean (overrides icon), `pulse` boolean (soft 2s opacity 1→0.4→1 keyframe, only when dot+pulse).

### Showcase (temporary, on `/`)

A clean grid showing one example of each Button variant (in default size) and each Badge variant. Will be replaced by `/design-system` route in Prompt 0.4. Keeps the editorial dark aesthetic.

### Governance update

Append to `/LOCKED_FILES.md`:
```
## Atomic Components (locked since Sprint 0, Prompt 2a)
- /src/components/ui/button.tsx
- /src/components/ui/badge.tsx
```

Also update `mem://constraints/locked-files` index entries to match.

### Token consumption check

All colors will use slash alpha syntax on Tailwind utilities mapped in `@theme inline`:
- `bg-accent-primary`, `bg-accent-luminous`, `bg-accent-gold`
- `bg-signal-success/15`, `border-signal-success/30`, `text-signal-success`
- `bg-surface-elevated`, `text-content-primary/secondary/tertiary`
- `shadow-glow-cyan`, `shadow-glow-gold`
- `rounded-md`, `rounded-lg`
- `font-mono`, `font-sans`
- `transition-all duration-base ease-out-expo` (custom durations/easings already in `@theme`)

No hardcoded hex/rgb anywhere.

