# Compare cards — editorial visual system pass

Scope: `src/components/report-redesign/v2/compare/*` and the comparison components that consume them. No data/schema/provider changes. Single-profile and Free/Public paths untouched.

## 1. Typography normalisation (`compare-card-shell.tsx`)

Lock a single editorial scale across **every** compare card (drop `density="anchor"` branching for typography — only the left rule stays):

- **Title** (`h3`): `font-serif text-content-primary text-2xl sm:text-3xl leading-tight tracking-tight`. Same size for hero + standard cards.
- **Subtitle**: `mt-2 text-sm sm:text-base text-content-secondary`, never below 14px.
- **Baseline chip**: keep current pill, but switch label to **"Concorrente em janela de referência"** for less jargony tone; keep `text-xs` (legal exception for chip).
- **Footer eyebrow**: `.text-eyebrow-sm text-content-tertiary` — keep default `"Leitura"`, expose `footerEyebrow` (already exists).
- **Footer body**: `text-sm sm:text-base text-content-secondary leading-relaxed`.

Anchor variant keeps the `border-l-[3px]` accent rule and slightly more padding (`p-7 sm:p-9`), but drops the larger title (`md:text-[2.25rem]`) so all cards align visually.

## 2. Spacing rhythm

Unify the shell rhythm:
- Card padding: `p-6 sm:p-8` (anchor: `p-7 sm:p-9`).
- Header → handle row gap: `mt-5`.
- Handle row → body gap: `mt-7 sm:mt-9` (slightly tighter and consistent).
- Body → footer gap: `mt-7 sm:mt-9`.
- Footer panel padding: `px-5 py-4` → `px-5 py-4 sm:px-6 sm:py-5`.

## 3. Handle row consistency (`compare-handle-row.tsx`)

- Wire `prominence` (currently `_prominence` ignored). When `prominence="strong"` (default in shell), the small Pill scales to:
  - `px-3.5 py-2 text-sm sm:text-base font-semibold`
  - Avatar `size-9`
- When `prominence="default"`, fall back to current compact pill (`px-3 py-1.5 text-sm`, avatar `size-7`). Used by nested non-hero contexts only.
- Handles always show `@handle` text — never colour-only. Already correct; reinforce by truncating at `max-w-[16rem]`.
- `lg` size kept as-is for the top hero.

## 4. Shared media placeholder

New tiny export in `compare-handle-row.tsx`: `CompareThumbPlaceholder`. Used by cadence strip + any future thumbnail. Plain `bg-surface-muted` square with a centred `<ImageIcon />` (lucide), `text-content-tertiary`. Replaces ad-hoc placeholders in `competitor-cadence-compare.tsx` (`Thumb` failure branch already does this — just swap to shared component for consistency).

Avatar fallback already renders gradient initials (good) — keep as-is.

## 5. CompareBarPair polish (`compare-bar-pair.tsx`)

- Bare label column: `text-sm sm:text-base font-medium text-content-primary` (already correct, keep).
- Value column: ensure minimum width fits 2-digit % without wrap: `w-16 sm:w-24` (currently `w-14 sm:w-20`). No layout change otherwise.
- Bar height bumped to `h-3 sm:h-4` (more editorial weight); rounded-full retained.
- Winner highlight: keep current 1-px soft ring.

## 6. CompareStatBlock polish (`compare-stat-block.tsx`)

- Side panel padding: `px-5 py-6 sm:px-6 sm:py-7` (slightly more generous).
- Value: `text-3xl sm:text-4xl`, `tabular-nums`, `leading-[1.05]` (kept). Add `min-w-0` truncation via `title=` already present.
- Sub-text: `text-sm leading-snug text-content-secondary` (kept).
- The internal `vs` separator stays font-serif, `text-xl sm:text-2xl text-content-tertiary`.

## 7. CompareTable polish (`compare-table.tsx`)

- Row height: `py-3` minimum (no cramped rows).
- Labels: `text-sm text-content-secondary` (not `text-xs`).
- Values: `text-sm sm:text-base font-semibold tabular-nums`.
- Sticky-thin divider: `divide-y divide-border-subtle`.

## 8. Phase 1 / Phase 2 cards — sweep

For each existing compare component (`competitor-engagement-compare`, `competitor-cadence-compare`, `competitor-format-compare`, `competitor-bio-compare`, `comparison-hero`, plus any others under `report-redesign/v2/`), do a lightweight pass:

- Confirm they render through `CompareCardShell` with `windowAligned` and `footer` set.
- Footer text always concise, single paragraph; eyebrow stays "Leitura" except where a card semantically needs a different word (e.g. "Metodologia" — kept as-is).
- Numbers always `tabular-nums`; ensure no `font-mono` slipped in.
- Mobile check: every grid drops to `grid-cols-1` ≤ sm.

No data changes; only className/typography adjustments.

## 9. Files touched

- `src/components/report-redesign/v2/compare/compare-card-shell.tsx`
- `src/components/report-redesign/v2/compare/compare-handle-row.tsx`
- `src/components/report-redesign/v2/compare/compare-stat-block.tsx`
- `src/components/report-redesign/v2/compare/compare-bar-pair.tsx`
- `src/components/report-redesign/v2/compare/compare-table.tsx`
- `src/components/report-redesign/v2/compare/index.ts` (export `CompareThumbPlaceholder`)
- `src/components/report-redesign/v2/competitor-cadence-compare.tsx` (use shared placeholder)

No other files. No new packages.

## 10. Validation

- `/admin/report-preview/nunomarkl?variant=pro_preview&draft=false` — all compare cards share title size, padding rhythm, "Leitura" footer eyebrow.
- 375px — no horizontal overflow on any card; handles truncate, bars don't push values off-screen.
- Force `avatarUrl` 404 → gradient initials render (already covered).
- Force `windowAligned=false` → reference chip appears once per card.
- Visual diff vs current preview: cards look more uniform, more generous, no metric overflows.
