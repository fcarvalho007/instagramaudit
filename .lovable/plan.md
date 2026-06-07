## Summary
Replace hardcoded dot colours in the Free "Leitura inicial do perfil" card with semantic design tokens.

## Scope
- File: `src/components/report-redesign/v2/overview/free-initial-reading-card.tsx`
- Lines affected: 257-258 (dotClass assignment in SignalList)

## Current state
```tsx
const dotClass =
  tone === "positive" ? "bg-[var(--report-primary,#0077B6)]" : "bg-[#BA7517]";
```

## Change
```tsx
const dotClass =
  tone === "positive"
    ? "bg-[rgb(var(--signal-success))]"
    : "bg-[rgb(var(--signal-warning))]";
```

## Tokens used
- `--signal-success: 29 158 117` (#1D9E75) — already defined in `src/styles/tokens-light.css` under `[data-theme="light"]`
- `--signal-warning: 186 117 23` (#BA7517) — same file, same scope

## Why these tokens
- `signal-success` is the semantic "positive / good" token — matches "O que funciona"
- `signal-warning` is the semantic "caution / limit" token — matches "O que limita"
- Both are already defined and scoped for report light mode; no new tokens needed.

## What is NOT changing
- Copy, thresholds, layout, spacing, component structure
- Pro cards, providers, payments, credits, entitlements, schema, report generation

## Validation checklist
1. Dots render in both columns
2. Colours remain visible on light background
3. No hardcoded hex colours remain in this component
4. Mobile layout unchanged