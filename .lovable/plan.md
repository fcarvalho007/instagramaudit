## Goal

Make `CompetitorFormatCompare` ("Mix de formatos") and `CompetitorWeekdayCompare` ("Ritmo por dia da semana") feel like the editorial centerpiece of Phase 2 — same data, much stronger hierarchy and presence — while every other compare card keeps its current grammar.

## Scope (frontend only)

No backend, providers, schema, credits, Free/Public, or data shape changes. Logic in both cards is untouched.

## Files changed

1. `src/components/report-redesign/v2/compare/compare-bar-pair.tsx` — upgrade `variant="bare"` only (the `card` variant keeps current sizing for back-compat).
2. `src/components/report-redesign/v2/competitor-format-compare.tsx` — richer subtitle, slightly stronger insight wording, pass thumbnails through (already done) and signal "distribution" variant.
3. `src/components/report-redesign/v2/competitor-weekday-compare.tsx` — same treatment as Format; richer footer with peak share %.
4. Optional: tiny tweak in `compare-card-shell.tsx` to support a `density="hero"` flag that bumps the title to `text-2xl sm:text-3xl` and tightens the header rhythm — applied only by these two cards. Keeps every other compare card visually unchanged.

## Visual changes inside `bar-pair` (bare variant)

- **Per-row layout** becomes a two-column band on `sm+`:
  - left rail (`w-20 sm:w-24`) with the format/day label in Inter SemiBold `text-sm sm:text-base`
  - right rail with the paired bars
- **Bar thickness** raised from `h-2` → `h-3 sm:h-3.5`, with `rounded-full` and a subtle inner border on the empty track so a 0-value side is still visibly present as a "ghost rail" (requirement #4).
- **Value typography**: `tabular-nums font-semibold text-content-primary text-sm sm:text-base`, fixed right-aligned `w-16` so columns scan.
- **Per-side mini-identity** at the start of each bar — a 4px dot **plus** a 16px avatar thumbnail (reuses the same `Avatar` helper from `compare-handle-row`, new `size="xs"` of `size-4`). Falls back to the colored dot if no avatar. Avatars only render at `sm+` to protect 375px width.
- **Vertical rhythm** between rows: `space-y-5 sm:space-y-6` (was `space-y-4`); inside a row `gap-2 sm:gap-2.5`.
- **Winner cue**: the higher of the two bars gets `shadow-[0_0_0_1px_color-mix(in_oklab,var(--accent-primary)_25%,transparent)]` (or competitor equivalent) — soft, no glow, no animation. Ties: no cue.
- **Zero-side handling**: when value is 0, render the full-width muted rail with a thin dashed border and the literal label `Sem partilha` (Format) / `Sem publicações` (Weekday) in `text-xs text-content-tertiary` instead of `"0 %"` / `"0"`.

## Visual changes in the card shell (these two cards only, via `density="hero"`)

- Title: Fraunces `text-2xl sm:text-3xl`, tracking-tight (other cards stay at `text-xl sm:text-2xl`).
- Subtitle: bumped to `text-sm sm:text-base text-content-secondary` with `mt-1.5`.
- Body top spacing: `mt-8 sm:mt-10`.
- Footer insight: `text-base` instead of `text-sm`, a Fraunces eyebrow `Leitura` above the sentence, the sentence itself in Inter `text-content-secondary`. Pure deterministic strings — no new claims invented (existing string generators reused; Weekday footer just appends the peak share % already computable from `primaryIso`/`competitorIso`).

## Identity / legend row

The shared `CompareHandleRow` already shows colored pills + 24px avatars + handle. For these two hero cards we pass an opt-in prop `prominence="strong"` that:

- raises avatar to `size-8`
- raises pill text to `text-sm sm:text-base font-semibold`
- swaps the inline `vs` for the same Fraunces serif treatment used in `ComparisonHero` (smaller scale: `text-xl sm:text-2xl`)

Other compare cards keep the current `sm` row.

## Mobile (375 px)

- Avatars inside bar rows are gated to `sm:` (≥640px). On mobile each row keeps: label on its own line, then full-width bar + value, matching today's layout but with the bigger bar/value typography.
- The hero handle row wraps cleanly — `flex-wrap` + `min-w-0` on pills (already in place).
- No fixed widths above 375px; right-aligned value column collapses to `w-14` on `<sm`.

## Avatar / thumbnail introduction

- Yes, thumbnails are introduced in two new places:
  1. In the **legend / identity row** of these two cards (size-8, opt-in via `prominence="strong"`).
  2. As **micro avatars (size-4)** at the leading edge of each paired bar, sm+ only.
- Both reuse the existing `Avatar` helper extracted from `compare-handle-row.tsx` (it will be exported and accept an `xs` size). No new image fetches — uses the same `primaryAvatarUrl` / `competitor.avatarUrl` already threaded through the compare shell.

## Out of scope

- Engagement, Cadence, Overview, Bio compare cards: untouched.
- `ComparisonHero`: untouched.
- Single-profile (solo) cards: untouched.
- Free/Public report: untouched (these cards only render in Pro `mode === "all"` with a competitor present).

## Validation

- `bunx tsc --noEmit` clean.
- Visual check at 375 / 768 / 1280 with a competitor having a 0 share in one format (Imagens) and at least one zero weekday — confirms zero-side rail still readable.
- Confirm the other four compare cards are pixel-identical to before (no shared shell change without `density="hero"`).
