# Standardize Report Section Headers

## Problem

Section titles in the report are inconsistent. Each "card-as-section" (Engagement, Frequência, Formato, Melhores e piores publicações, …) hard-codes its own `<h3 className="font-display text-[1.25rem] sm:text-[1.5rem] md:text-[1.75rem|2rem] font-semibold tracking-tight …">` with slightly different sizes, line-heights, wrapping rules, and no shared eyebrow/spacing logic. The block-level header (`REDESIGN_TOKENS.h2Section`) is already consistent — the gap is one level below, at the card/section title.

## Files involved (audit)

Headers we will standardize (all use a near-duplicate `h3` today):

- `src/components/report-redesign/v2/overview/frequency-card.tsx` (l. 596) — "Frequência de publicação …"
- `src/components/report-redesign/v2/overview/format-card.tsx` (l. 293) — "Formato …"
- `src/components/report-redesign/v2/report-overview-engagement.tsx` (l. 122) — "Taxa de Engagement …"
- `src/components/report-redesign/v2/report-post-comparison.tsx` (l. 182) — "Melhores e piores publicações"
- `src/components/report-redesign/v2/report-themes-feature.tsx` (l. 126) — themes section title
- `src/components/report-redesign/v2/report-overview-cards.tsx` (l. 137/154) — overview mini-cards (treated as sub-tier, see below)

Already consistent, left alone:
- Block-level question headers via `REDESIGN_TOKENS.h2Section` (`report-block-section.tsx`).
- `ReportSectionFrame` editorial header (full eyebrow + h2 + subtitle), used elsewhere.

## Plan

### 1. Add 3 tokens in `src/components/report-redesign/report-tokens.ts`

A single editorial scale for section titles inside cards:

```
h3SectionTitle      // font-display, 1.5rem → 1.75rem → 2rem, font-semibold,
                    // tracking-[-0.015em], leading-[1.15], text-content-primary,
                    // break-words [hyphens:none]
h3SectionEyebrow    // text-eyebrow-sm, text-content-tertiary, mb-2
h3SectionQualifier  // inline qualifier ("Baixa", "Alta", "Pouco variado")
                    // font-display, font-normal, text-content-secondary,
                    // same size as title, ml-2
```

Rationale: editorial = Fraunces display, size jumps to ~32px on desktop (matches the cinematic feel the user asked for), qualifier becomes a lighter inline modifier instead of being baked into the title string — fixes the awkward "Title Adjective" wrapping.

### 2. Add reusable component `src/components/report-redesign/v2/report-card-section-header.tsx`

```tsx
interface Props {
  eyebrow?: string;       // e.g. "ENGAGEMENT"
  title: string;          // e.g. "Taxa de Engagement"
  qualifier?: string;     // e.g. "Baixa" — rendered lighter, inline
  icon?: ReactNode;       // optional leading icon, kept small
  action?: ReactNode;     // optional right-side control
  align?: "start" | "center";
}
```

Renders: eyebrow (optional) → row with `<h3>` title + qualifier + optional action. One consistent bottom margin (`mb-4 md:mb-5`). One consistent wrapping rule.

### 3. Apply the component to the 5 hard-coded headers

Replace each existing `<h3 …>{title} {qualifier}</h3>` with `<ReportCardSectionHeader eyebrow={…} title={…} qualifier={…} />`. Split current strings like "Taxa de Engagement Baixa" into `title="Taxa de Engagement"` + `qualifier="Baixa"` (no copy change, just structural split — already how the data is computed in `score-utils`/scoring helpers; no logic changes).

Eyebrows where they already exist (e.g. `REDESIGN_TOKENS.eyebrow` in `report-overview-attention-row.tsx`) get migrated to the same token so size/letter-spacing/color match.

### 4. Leave untouched

- `report-overview-cards.tsx` mini-cards (Tier-3 KPI-card titles, intentionally smaller). They keep current size but switch to the same `font-display` + tracking tokens so weight/family stay consistent.
- `ReportSectionFrame` (block-level), `report-block-section.tsx`, `report-section.tsx` legacy — none of the four examples flow through these.
- Data, scoring, copy strings, business logic — unchanged.

### 5. Locked-files note

Add the new component + tokens to `LOCKED_FILES.md` under a "Report section header system" entry so future edits stay centralized.

## Deliverables

1. New token block in `report-tokens.ts`.
2. New `ReportCardSectionHeader` component.
3. 5 card files updated to use it.
4. Summary listing every changed file and the before/after spec (size, weight, leading, spacing).

## Out of scope

No changes to data, metric computation, scoring, copy strings, block-level (`h2Section`) headers, KPI mini-cards' content, or unrelated sections.
