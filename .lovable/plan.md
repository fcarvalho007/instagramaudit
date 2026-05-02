
# Widen Report V2 Content Container

## What changes

One file: `src/components/report-redesign/v2/report-shell-v2.tsx` (not locked).

## Current state

- Line 97: `max-w-7xl` (1280px) — wraps the main 2-column layout (sidebar + content)
- Line 232: `max-w-7xl` (1280px) — wraps the footer/methodology area
- Sidebar: `w-60 xl:w-64` (~240-256px), gap `gap-10 lg:gap-12` (40-48px)
- Effective main content column: ~976px on desktop

## Change

Replace both `max-w-7xl` instances with `max-w-[1380px]` (+100px / ~7.8% wider).

- Line 97: `max-w-7xl` → `max-w-[1380px]`
- Line 232: `max-w-7xl` → `max-w-[1380px]`

This gives the main content column ~1076px — enough breathing room for 2-column diagnostic cards without losing the editorial feel. The hero remains full-bleed, so the "funnel" gap between hero and body shrinks proportionally.

## What does NOT change

- Hero, navigation, sidebar, card internals, typography, tokens, charts, landing page, admin, API, auth, PDF, Supabase

## Validation

- `bunx tsc --noEmit`
- `bunx vitest run`
- Visual check at 375px for no horizontal overflow
