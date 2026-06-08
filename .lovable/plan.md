## Plan: Anchor Comparison Card (Overview / Identity)

### Goal
Make the first editorial comparison card — `Identidade` (`CompetitorOverviewCompare`) — visually distinct from all other comparison cards so it reads as the strategic anchor of the comparison section.

### Which card is the anchor
The first comparison card rendered after the `ComparisonHero` in competitor mode is the **Overview / Identity** card (`CompetitorOverviewCompare`). It is mounted at lines 280-297 in `report-overview-block.tsx`. It is the user's first encounter with side-by-side data after the hero duel.

### Changes

#### 1. `compare-card-shell.tsx` — new `"anchor"` density
Add a third density tier `"anchor"` alongside existing `"default"` and `"hero"`. The `anchor` mode applies:

- **Card chrome:** increased padding (`p-7 sm:p-9` vs default `p-6 sm:p-8`), plus a calm blue left accent border (`border-l-[3px] border-l-[var(--accent-primary)]`) to signal "featured / first" without breaking the white-card system.
- **Title:** Fraunces at `text-2xl sm:text-3xl md:text-[2.25rem]` — one step above hero, clearly the largest card title in the report.
- **Subtitle:** `mt-2 text-sm sm:text-base font-medium text-content-secondary` — slightly bolder and more breathing room.
- **Identity row:** `prominence="strong"` (size-8 avatars, larger pills, serif "vs"), with `mt-6` spacing.
- **Body spacing:** `mt-10 sm:mt-12` — more generous gap before the stat grid.
- **Footer:** same hero-style editorial panel (rounded, bordered, muted background, "Leitura" eyebrow) but with `mt-10`.

The `anchor` tier sits **above** `hero` in the hierarchy:
- `default` → Engagement, Cadence, Bio compare cards
- `hero` → Format Mix, Weekday Rhythm distribution cards  
- `anchor` → Overview / Identity card only

#### 2. `competitor-overview-compare.tsx` — consume `"anchor"`
Pass `density="anchor"` to `CompareCardShell`. Keep all existing data rows, labels, and formatting exactly as-is. No new rows, no removed rows.

#### 3. `report-overview-block.tsx` — no changes needed
The card is already mounted in the correct position (first after `ComparisonHero`). No reordering, no duplication.

### What stays unchanged
- All other compare cards keep their current density (Engagement/Cadence/Bio = `default`, Format/Weekday = `hero`).
- No data logic, no backend, no provider, no payment code touched.
- No new content strings or AI-generated copy introduced.

### Return summary
- **Card upgraded:** `CompetitorOverviewCompare` ("Identidade")
- **What makes it distinct:** left accent border, larger Fraunces title, stronger padding/spacing rhythm, `prominence="strong"` identity row, editorial footer panel — all via a new `"anchor"` density tier in the shared shell.
- **Duplicate content:** none; existing subtitle "Métricas-base lado a lado" and all stat rows remain unchanged.