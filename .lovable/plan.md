

## Plan: Input icon padding fix (surgical)

Single bug: icon and placeholder collide because padding offsets are too tight and icon sits too far left. Fix by widening padding maps and shifting icon position.

### File modified
- `src/components/ui/input.tsx` (LOCKED — permission granted for this fix only)

### Exact changes

**1. `iconPaddingMap` (lines 53–56)** — increase left/right padding so text clears the icon:
```ts
const iconPaddingMap = {
  left: { sm: "pl-10", md: "pl-12", lg: "pl-14" },
  right: { sm: "pr-10", md: "pr-12", lg: "pr-14" },
} as const;
```

**2. `iconPositionMap` (lines 63–66)** — move md icon from `left-3` → `left-4` for better visual balance with new padding:
```ts
const iconPositionMap = {
  left: { sm: "left-3", md: "left-4", lg: "left-4" },
  right: { sm: "right-3", md: "right-4", lg: "right-4" },
} as const;
```

### Why this works
- Current md: icon at `left-3` (12px) + 16px icon = ends at 28px; placeholder starts at `pl-10` (40px) → only 12px gap, but the @ glyph in placeholder visually crowds the @ icon.
- Fixed md: icon at `left-4` (16px) + 16px icon = ends at 32px; placeholder starts at `pl-12` (48px) → 16px clear breathing room.
- sm gains 4px clearance, lg gains 8px clearance — proportional.
- Right side mirrored identically.

### Untouched (verified scope)
- `inputVariants` cva (variants, sizes, states, transitions)
- Error logic and `aria-invalid` handling
- `InputLabel`, `InputHelper` exports
- Forwarded ref, props interface, JSX structure
- All other locked files (button, badge, card, switch, layout, tokens, showcase copy)

### Verification after build
Visually confirm in `/` showcase:
- "Username do Instagram": `@` icon clearly separated from `@exemplo ou URL do perfil`
- "Pesquisar relatórios" (glass): Search icon has breathing room before placeholder
- No regression on inputs without icons (padding only applies when icon present, via conditional `leftIcon && iconPaddingMap.left[size]`)

