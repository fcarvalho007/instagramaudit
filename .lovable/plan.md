# Unified editorial visual system — Profile vs Competitor cards

## TL;DR
Six compare cards (`competitor-bio`, `competitor-overview`, `competitor-engagement`, `competitor-cadence`, `competitor-format`, `competitor-weekday`) all share the `CompareCardShell` + handle row + stat/bar/table primitives, but they ship inconsistent density, title sizes, paddings, avatar fallbacks, and bar/label rhythms. Plan unifies them on a single "editorial" tier without touching data, providers, schema, or the Free/Public path.

## Scope (UI only — 5 files)
1. `src/components/report-redesign/v2/compare/compare-card-shell.tsx`
2. `src/components/report-redesign/v2/compare/compare-handle-row.tsx`
3. `src/components/report-redesign/v2/compare/compare-stat-block.tsx`
4. `src/components/report-redesign/v2/compare/compare-bar-pair.tsx`
5. The six `competitor-*-compare.tsx` consumers — only to pass the unified density / drop one-off props (no data changes)

Out of scope: `compare-table.tsx` content layout, `compare-delta.ts`, snapshot adapter, `report-overview-block.tsx` wiring (already correct), legacy `analysis-competitor-comparison.tsx`, FormatCard / FrequencyCard.

---

## 1. Shared card shell — single "editorial" density
Today `CompareCardShell` has three tiers (`default`, `hero`, `anchor`) and only the format/weekday hero cards use it. Engagement/cadence/bio/overview pass the silent `default`, producing the smaller xl/2xl title and tighter padding — the visible inconsistency.

Change: collapse runtime to **one editorial tier**, keep `density` prop for back-compat (`anchor` still adds the 3 px accent left rule on the overview/identity card), drop the `default` look.

- Card chrome: `rounded-2xl border border-border-default bg-surface-primary shadow-card`, padding `p-6 sm:p-8` (anchor: `p-7 sm:p-9` + `border-l-[3px] border-l-[var(--accent-primary)]`).
- Title: `font-serif text-content-primary leading-snug tracking-tight text-2xl sm:text-3xl` everywhere (anchor: `sm:text-3xl md:text-[2.25rem]`).
- Subtitle: `text-content-secondary mt-1.5 text-sm sm:text-base`.
- Baseline chip ("Concorrente em janela baseline"): unchanged copy, normalised to `text-xs` + `text-content-tertiary`.
- Identity row gap to title: `mt-5` (anchor: `mt-6`).
- Body gap: `mt-8 sm:mt-10`.
- Footer panel: always rendered with the hero treatment — `rounded-xl border border-border-subtle bg-surface-muted px-5 py-4`, eyebrow `text-eyebrow-sm text-content-tertiary mb-1.5`, copy `text-sm sm:text-base text-content-secondary leading-relaxed`. Footer eyebrow defaults to **"Leitura"**.

## 2. Handle row — consistent identity strip
- `CompareHandleRow` keeps `sm` / `lg`, but `sm` always renders the current `prominence="strong"` look. Remove the `default` branch (no consumer needs the weaker variant after unification).
- Pill: `gap-2.5 px-3.5 py-1.5 text-sm sm:text-base font-semibold`, accent tint by side (primary: `accent-primary`; competitor: `compare-competitor`).
- Avatar in pill: `size-8`, no ring; verified badge `size-3.5`.
- "vs" separator: `font-serif text-xl sm:text-2xl text-content-tertiary tracking-tight`.
- Handles are always visible as text next to the avatar — no avatar-only state. Display name shows only in the `lg` hero variant.

## 3. Stat block — aligned values & rhythm
- Side panel padding harmonised with the shell: `px-5 py-5 sm:py-6`, `gap-2`.
- Handle pill above value: `text-eyebrow-sm` (Inter uppercase tracking) instead of `text-xs font-medium`, max 1 line with `truncate`.
- Numeric value: drop the wide `clamp(1.5rem, 4.2vw, 2.25rem)`. Use a fixed editorial pair: `text-3xl sm:text-4xl font-semibold tabular-nums leading-[1.05]` — guarantees alignment across all 4 stat cards. Keep `min-w-0 overflow-hidden whitespace-nowrap` to prevent overflow.
- Sub-text under value: `text-sm text-content-secondary` (was `text-xs`), respects the 14 px floor.
- Center "vs": `font-serif text-2xl text-content-tertiary` (was eyebrow), matches handle row separator.
- `variant="bare"` keeps the same internal scale so a card-hosted stat reads identically.

## 4. Bar pair — premium distribution rhythm
- `variant="bare"`:
  - Label column: `sm:grid-cols-[7rem_1fr]` (was `6rem`), `gap-3 sm:gap-6`.
  - Category label: `text-sm sm:text-base font-medium text-content-primary` (drop semi-bold so it sits below the card H3), `sm:pt-2`.
  - Bar pair vertical gap: `space-y-2.5 sm:space-y-3`.
  - Bar height: `h-3.5 sm:h-4`, `rounded-full`. Surface track stays `bg-surface-muted`; zero state keeps the dashed border treatment.
  - Avatar at bar lead: `size-6` (was `size-5`), still hidden under sm. Mobile keeps the colored 8 px dot.
  - Right-side value column: `w-16 sm:w-20`, `font-semibold tabular-nums text-sm sm:text-base text-content-primary`.
  - Zero label: `text-xs text-content-tertiary`, column `w-20 sm:w-24` so it never wraps.
  - Winner ring: keep the 1 px accent shadow.
- `variant="card"` (used by the no-competitor in-card sub-block, still alive in older consumers): tighten only to match (label `text-sm`, bar `h-2.5`). No behavior change.

## 5. Avatar fallback — gradient initials, never broken
Replace the flat `bg-surface-muted` fallback in `Avatar` with a side-tinted gradient and white initials, so missing avatars don't read as empty grey holes:
- Primary side: `bg-gradient-to-br from-[color-mix(in_oklab,var(--accent-primary)_85%,white)] to-[var(--accent-primary)] text-white`.
- Competitor side: `bg-gradient-to-br from-[color-mix(in_oklab,var(--compare-competitor)_85%,white)] to-[var(--compare-competitor)] text-white`.
- Initials font: `font-sans font-semibold` (drop `font-display` — initials should be Inter per memory rule).
- Same gradient applies when the `<img>` errors (`onError → failed`). Image still `loading="eager"` (above the fold). No external request fallback.

## 6. Consumer cleanup (no data changes)
For each of the 6 `competitor-*-compare.tsx`:
- Drop the explicit `density="hero"` on `competitor-format-compare` and `competitor-weekday-compare` (the new default IS hero).
- Add or keep `density="anchor"` only on `competitor-overview-compare` (identity anchor card).
- Ensure `footer` is always a string (deterministic "Leitura" insight) — already the case; verified during plan.
- No prop additions, no new exports, no copy changes other than confirming "Leitura" as the default eyebrow.

## 7. Mobile (375 px)
- All paddings drop to `p-6` on the card, side panels `px-4 py-4`, bar pair to single-column header row.
- Stat block stacks (already does) — keep the `vs` row hidden on mobile via the existing `sm:` grid.
- Handle pills `flex-wrap` already prevents overflow; tightened gap to `gap-2` on `<sm`.
- Bar pair: label sits above the bar group on `<sm` (already does); value column shrinks to `w-14`.
- No new horizontal scrollers introduced.

## 8. Validation checklist (manual, post-build)
- `/admin/report-preview/nunomarkl?variant=pro_preview&draft=false` (desktop + 375 px):
  - All 6 cards share the same Fraunces title scale, subtitle treatment, identity row, padding, footer panel and "Leitura" eyebrow.
  - Handles are visible as text on every card. Baseline chip appears only when `windowAligned=false`.
  - Numbers align across the engagement + cadence stat cards.
  - Bars at hero height with avatar leads visible on ≥sm.
  - Avatar fallback shows tinted gradient + initials (force by blocking the image URL in DevTools).
- `/admin/report-preview/frederico.m.carvalho` (no competitor): single-profile cards (`FormatCard`, `FrequencyCard`, `EngagementCardRefined`) unchanged.
- No new network calls on render (no provider hits).
- Free/Public path (`variant="public_mvp"`) renders identically to before — competitor branch is Pro-only.

## Constraints respected
- No changes to data adapters, snapshot logic, providers (Apify/OpenAI/DataForSEO), schema, credits, payments, EuPago, entitlements, Add Competitor flow, or Free/Public report.
- Tailwind v4 + semantic tokens only — no `slate-*`, no hardcoded hexes.
- 2-font rule preserved: Fraunces for card H3 + "vs"; Inter for everything else; no JetBrains Mono.
- All sizes ≥ `text-xs` (12 px); body ≥ `text-sm` (14 px).
